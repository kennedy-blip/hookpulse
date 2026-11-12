import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { addEvent, type StoredEvent } from '../_lib/store'

export const config = { api: { bodyParser: false, sizeLimit: '1mb' } }

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += part.length
    if (size > 1_048_576) throw new Error('Payload too large (1 MB maximum)')
    chunks.push(part)
  }
  return Buffer.concat(chunks)
}

function safeEqualHex(expected: string, received: string): boolean {
  const clean = received.replace(/^sha256=/i, '').trim()
  if (!/^[a-f0-9]{64}$/i.test(clean) || !/^[a-f0-9]{64}$/i.test(expected)) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(clean, 'hex'))
}

const providers = {
  github: { source: 'GitHub-Webhook', path: '/api/webhooks/github', secret: () => process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET, signatureHeader: 'x-hub-signature-256' },
  mpesa: { source: 'Daraja-Callback', path: '/api/webhooks/mpesa', secret: () => process.env.MPESA_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET, signatureHeader: 'x-hookpulse-signature' },
  agent: { source: 'Agent-Callback', path: '/api/webhooks/agent', secret: () => process.env.AGENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET, signatureHeader: 'x-hookpulse-signature' }
} as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Only POST requests are accepted' })
  }
  const provider = String(req.query.provider || '').toLowerCase() as keyof typeof providers
  const config = providers[provider]
  if (!config) return res.status(404).json({ error: 'Unknown provider. Use github, mpesa, or agent.' })

  const started = Date.now()
  let raw: Buffer
  try {
    raw = await readRawBody(req)
  } catch (error) {
    return res.status(413).json({ error: error instanceof Error ? error.message : 'Payload too large' })
  }
  let body: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw.toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON object')
    body = parsed as Record<string, unknown>
  } catch {
    return res.status(400).json({ error: 'Request body must be a valid JSON object' })
  }

  const secret = config.secret()
  const signature = req.headers[config.signatureHeader] || req.headers['x-hookpulse-signature']
  let verified = false
  if (secret) {
    if (typeof signature !== 'string') return res.status(401).json({ error: 'Missing webhook signature' })
    const expected = createHmac('sha256', secret).update(raw).digest('hex')
    if (!safeEqualHex(expected, signature)) return res.status(401).json({ error: 'Invalid webhook signature' })
    verified = true
  }

  let status: StoredEvent['status'] = 200
  let note = verified ? 'Signature verified; callback received' : 'Received without signature verification — configure a provider secret'
  const destination = process.env.FORWARD_WEBHOOK_URL
  if (destination) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const headers: Record<string, string> = { 'content-type': 'application/json', 'x-hookpulse-provider': provider, 'x-hookpulse-delivery-id': randomUUID() }
      if (process.env.FORWARD_WEBHOOK_TOKEN) headers.authorization = 'Bearer ' + process.env.FORWARD_WEBHOOK_TOKEN
      const forwarded = await fetch(destination, { method: 'POST', headers, body: raw, signal: controller.signal })
      clearTimeout(timeout)
      status = forwarded.status >= 200 && forwarded.status < 300 ? 200 : forwarded.status === 429 ? 429 : forwarded.status >= 400 && forwarded.status < 500 ? 400 : 500
      note = 'Forwarded to configured destination · HTTP ' + forwarded.status
    } catch {
      status = 500
      note = 'Forwarding failed or timed out; callback retained in event history'
    }
  }

  const safeHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (/authorization|cookie|signature|secret|token/i.test(key) || value == null) continue
    safeHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value)
  }
  const event: StoredEvent = {
    id: randomUUID(), source: config.source, method: 'POST', status, path: config.path,
    timestamp: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    latency: Date.now() - started, body, headers: safeHeaders, note, verified
  }
  await addEvent(event)
  return res.status(status === 500 ? 502 : 202).json({ ok: status !== 500, id: event.id, verified, forwarded: Boolean(destination), note })
}
