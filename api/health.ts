import type { VercelRequest, VercelResponse } from '@vercel/node'
import { storageMode } from './_lib/store'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    ok: true,
    service: 'hookpulse-api',
    storage: storageMode(),
    signatureVerificationConfigured: Boolean(process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET),
    timestamp: new Date().toISOString()
  })
}
