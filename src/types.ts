export type HookEvent = {
  id: string; source: string; method: 'POST' | 'GET'; status: 200 | 400 | 429 | 500;
  path: string; timestamp: string; latency: number; body: Record<string, unknown>;
  headers: Record<string, string>; note: string;
}
export type RuleConfig = { retries: number; backoff: number; secret: string; verify: boolean; override: string }
export const initialRules: RuleConfig = { retries: 3, backoff: 2, secret: 'whsec_demo_••••••••••••', verify: true, override: '200' }