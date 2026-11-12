import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, Globe2, ShieldCheck, Zap } from 'lucide-react'
import TunnelHeader from './components/TunnelHeader'
import PayloadStream from './components/PayloadStream'
import EndpointRules from './components/EndpointRules'
import MockGenerator from './components/MockGenerator'
import type { HookEvent, RuleConfig } from './types'
import { initialRules } from './types'

const now = () => new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
const seed: HookEvent[] = [
  { id: 'evt_001', source: 'Daraja-STK', method: 'POST', status: 200, path: '/api/webhooks/mpesa', timestamp: '11:32:48', latency: 142, body: { Body: { stkCallback: { MerchantRequestID: '29115-34620561-1', CheckoutRequestID: 'ws_CO_120320241020', ResultCode: 0, ResultDesc: 'The service request is processed successfully.' } } }, headers: { 'content-type': 'application/json', 'user-agent': 'Daraja-Webhook/1.0', 'x-hookpulse-id': 'evt_001' }, note: 'Demo callback accepted' },
  { id: 'evt_002', source: 'GitHub-Push', method: 'POST', status: 200, path: '/api/webhooks/github', timestamp: '11:32:21', latency: 38, body: { ref: 'refs/heads/main', repository: 'hookpulse', pusher: 'developer', commits: 2 }, headers: { 'content-type': 'application/json', 'x-github-event': 'push', 'x-github-delivery': 'a92f-44c1' }, note: 'Demo push event delivered' },
  { id: 'evt_003', source: 'Jules-Agent', method: 'POST', status: 429, path: '/api/agent/callback', timestamp: '11:31:56', latency: 12, body: { event: 'rate_limit.warning', provider: 'Groq', remaining: 0, retry_after: 30 }, headers: { 'content-type': 'application/json', 'x-agent-id': 'jules-agent' }, note: 'Retry scheduled by demo policy' },
  { id: 'evt_004', source: 'Daraja-STK', method: 'POST', status: 500, path: '/api/webhooks/mpesa', timestamp: '11:30:12', latency: 504, body: { error: 'upstream_timeout', message: 'Simulated callback processing timeout' }, headers: { 'content-type': 'application/json', 'x-hookpulse-id': 'evt_004' }, note: 'Demo server error' }
]

function makeEvent(source: string, body: Record<string, unknown>, id: string, status: HookEvent['status'] = 200): HookEvent {
  const path = source === 'GitHub-Push' ? '/api/webhooks/github' : source === 'Daraja-STK' ? '/api/webhooks/mpesa' : '/api/webhooks/agent'
  return { id, source, method: 'POST', status, path, timestamp: now(), latency: Math.floor(Math.random() * 160) + 12, body, headers: { 'content-type': 'application/json', 'user-agent': 'HookPulse-Simulator/1.0', 'x-hookpulse-id': id }, note: status === 200 ? 'Dashboard test event accepted by API' : status === 429 ? 'Retry scheduled by policy' : 'Simulated response override' }
}

export default function App() {
  const [events, setEvents] = useState<HookEvent[]>(seed)
  const [selected, setSelected] = useState(seed[0].id)
  const [rules, setRules] = useState<RuleConfig>(initialRules)
  const [toast, setToast] = useState('')
  const [apiOnline, setApiOnline] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [tokenDraft, setTokenDraft] = useState('')
  const counts = useMemo(() => ({ ok: events.filter(e => e.status === 200).length, retry: events.filter(e => e.status === 429).length, failed: events.filter(e => e.status >= 400 && e.status !== 429).length }), [events])
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  const refreshEvents = async (token = apiToken) => {
    if (!token) { setApiOnline(false); return }
    try {
      const response = await fetch('/api/events', { headers: { Accept: 'application/json', Authorization: 'Bearer ' + token } })
      if (!response.ok) throw new Error('API unavailable')
      const data = await response.json() as { events?: HookEvent[] }
      const incoming = data.events ?? []
      setEvents(incoming)
      setSelected(current => incoming.some(event => event.id === current) ? current : incoming[0]?.id ?? '')
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    }
  }

  useEffect(() => {
    void refreshEvents(apiToken)
    const timer = window.setInterval(() => { void refreshEvents(apiToken) }, 5000)
    return () => window.clearInterval(timer)
  }, [apiToken])

  const add = async (source: string, body: Record<string, unknown>, status: HookEvent['status'] = 200) => {
    try {
      if (!apiToken) throw new Error('Connect the dashboard API first')
      const response = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiToken }, body: JSON.stringify({ source, body, status }) })
      if (!response.ok) throw new Error('Could not store event')
      const data = await response.json() as { event: HookEvent }
      setEvents(prev => [data.event, ...prev.filter(event => event.id !== data.event.id)].slice(0, 50))
      setSelected(data.event.id)
      setApiOnline(true)
      notify('Webhook stored by backend API')
    } catch {
      const id = 'local_' + Date.now().toString(36)
      const event = makeEvent(source, body, id, status)
      setEvents(prev => [event, ...prev].slice(0, 50))
      setSelected(id)
      setApiOnline(false)
      notify('API unavailable — event kept in this browser session')
    }
  }

  const simulate = () => {
    const samples = [
      ['Daraja-STK', { Body: { stkCallback: { ResultCode: 0, ResultDesc: 'The service request is processed successfully.', CheckoutRequestID: 'ws_CO_' + Date.now() } } }],
      ['GitHub-Push', { ref: 'refs/heads/main', repository: 'hookpulse', commits: [{ message: 'chore: automated test event' }] }],
      ['Jules-Agent', { event: 'agent.callback', provider: 'OpenRouter', status: 'completed', run_id: 'run_' + Date.now() }]
    ] as const
    const item = samples[Math.floor(Math.random() * samples.length)]
    void add(item[0], item[1])
  }
  const replay = (event: HookEvent) => { void add(event.source, event.body, event.status === 429 ? 429 : 200) }
  const clear = async () => {
    try {
      if (!apiToken) throw new Error('Dashboard API is not connected')
      const response = await fetch('/api/events', { method: 'DELETE', headers: { Authorization: 'Bearer ' + apiToken } })
      if (!response.ok) throw new Error('Clear failed')
      setApiOnline(true)
    } catch { setApiOnline(false) }
    setEvents([])
    setSelected('')
    notify('Event stream cleared')
  }

  return <div className="app-shell">
    <TunnelHeader count={events.length} onSimulate={simulate} onClear={clear}/>
    <main className="main-content">
      <div className="page-intro"><div><div className="eyebrow"><span/> DEVELOPER TOOLKIT <span className="eyebrow-line"/></div><h1>Webhook <span>observability.</span></h1><p>Inspect, replay, and debug every event flowing through your integration layer.</p></div><div className="environment"><input aria-label="Dashboard API token" type="password" placeholder="Dashboard API token" value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') setApiToken(tokenDraft.trim()) }}/><button className="btn btn-small btn-outline" onClick={() => setApiToken(tokenDraft.trim())}>Connect</button><span className={apiOnline ? 'env-dot' : 'env-dot offline'}/>{apiOnline ? 'CONNECTED' : 'LOCKED'} <b>{apiOnline ? 'API' : 'DEMO'}</b></div></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon cyan-bg"><Activity size={17}/></div><div><span>Total events</span><strong>{events.length.toString().padStart(2, '0')}</strong><small>{apiOnline ? 'Stored event history' : 'Current browser session'}</small></div><div className="stat-spark">↗</div></div>
        <div className="stat-card"><div className="stat-icon green-bg"><CheckCircle2 size={17}/></div><div><span>Successful</span><strong>{counts.ok.toString().padStart(2, '0')}</strong><small>200 responses</small></div></div>
        <div className="stat-card"><div className="stat-icon amber-bg"><Clock3 size={17}/></div><div><span>Rate limited</span><strong>{counts.retry.toString().padStart(2, '0')}</strong><small>429 responses</small></div></div>
        <div className="stat-card"><div className="stat-icon rose-bg"><Zap size={17}/></div><div><span>Failed</span><strong>{counts.failed.toString().padStart(2, '0')}</strong><small>4xx / 5xx responses</small></div></div>
      </div>
      <div className="workspace-grid"><div className="left-column"><PayloadStream events={events} selected={selected} onSelect={setSelected} onReplay={replay}/><MockGenerator onFire={(source, body) => { void add(source, body) }}/></div><div className="right-column"><EndpointRules value={rules} onChange={setRules}/><section className="panel route-panel"><div className="panel-head"><div className="panel-title"><span className="head-icon green"><Globe2 size={16}/></span><div><h2>Live webhook routes</h2><p>Vercel serverless endpoints</p></div></div><span className="count-chip">3 ROUTES</span></div><div className="route-list">{[['/api/webhooks/mpesa','Daraja · STK callback','POST'],['/api/webhooks/github','GitHub · Events','POST'],['/api/webhooks/agent','Agent · Callback','POST']].map(([path, label, method]) => <div className="route-row" key={path}><span className="route-live"/><div><code>{path}</code><small>{label}</small></div><b>{method}</b></div>)}</div><div className="route-foot"><ShieldCheck size={13}/> HMAC verification enabled when server secrets are configured</div></section></div></div>
      <footer className="footer"><div className="footer-brand"><Activity size={14}/> HOOKPULSE <span>·</span> WEBHOOK INTELLIGENCE</div><div><span className="footer-live"/> {apiOnline ? 'BACKEND API CONNECTED' : 'LOCAL FALLBACK MODE'} <span>·</span> v1.1.0</div><div>BUILT FOR THE EDGE <Zap size={12}/></div></footer>
    </main>{toast && <div className="toast"><CheckCircle2 size={16}/>{toast}</div>}
  </div>
}
