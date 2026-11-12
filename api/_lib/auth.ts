import type { VercelRequest } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'

export function dashboardAuthError(req: VercelRequest): { status: 401 | 503; message: string } | null {
  const expected = process.env.DASHBOARD_API_TOKEN
  if (!expected) {
    return process.env.VERCEL === '1'
      ? { status: 503, message: 'Dashboard is locked until DASHBOARD_API_TOKEN is configured' }
      : null
  }
  const header = req.headers.authorization
  const supplied = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : ''
  const expectedBytes = Buffer.from(expected)
  const suppliedBytes = Buffer.from(supplied)
  const valid = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes)
  return valid ? null : { status: 401, message: 'A valid dashboard bearer token is required' }
}
