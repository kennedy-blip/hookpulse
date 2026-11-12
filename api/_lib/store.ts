import { Redis } from '@upstash/redis'

export type StoredEvent = {
  id: string
  source: string
  method: 'POST'
  status: 200 | 400 | 401 | 429 | 500
  path: string
  timestamp: string
  latency: number
  body: Record<string, unknown>
  headers: Record<string, string>
  note: string
  verified?: boolean
}

const KEY = 'hookpulse:events'
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null
const memory: StoredEvent[] = []

export async function listEvents(): Promise<StoredEvent[]> {
  if (redis) return (await redis.lrange<StoredEvent>(KEY, 0, 49)) ?? []
  return [...memory]
}

export async function addEvent(event: StoredEvent): Promise<void> {
  if (redis) {
    await redis.lpush(KEY, event)
    await redis.ltrim(KEY, 0, 49)
    return
  }
  memory.unshift(event)
  memory.splice(50)
}

export async function clearEvents(): Promise<void> {
  if (redis) await redis.del(KEY)
  else memory.splice(0, memory.length)
}

export function storageMode(): 'upstash' | 'ephemeral' {
  return redis ? 'upstash' : 'ephemeral'
}
