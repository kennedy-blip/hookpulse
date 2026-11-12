import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { addEvent, clearEvents, listEvents, type StoredEvent } from './_lib/store'

const allowedStatuses = [200, 400, 429, 500] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') {
    return res.status(200).json({ events: await listEvents() })
  }
  if (req.method === 'DELETE') {
    await clearEvents()
    return res.status(200).json({ ok: true })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  if (!input || typeof input !== 'object' || !input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return res.status(400).json({ error: 'A JSON object payload is required' })
  }
  const source = typeof input.source === 'string' ? input.source.slice(0, 80) : 'Manual-Test'
  const status = allowedStatuses.includes(Number(input.status) as typeof allowedStatuses[number])
    ? Number(input.status) as StoredEvent['status'] : 200
  const path = typeof input.path === 'string' ? input.path.slice(0, 180) : '/api/webhooks/test'
  const event: StoredEvent = {
    id: randomUUID(),
    source,
    method: 'POST',
    status,
    path,
    timestamp: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    latency: Math.floor(Math.random() * 90) + 8,
    body: input.body as Record<string, unknown>,
    headers: { 'content-type': 'application/json', 'x-hookpulse-source': 'dashboard-simulator' },
    note: 'Dashboard test event stored by API',
    verified: false
  }
  await addEvent(event)
  return res.status(201).json({ event })
}
