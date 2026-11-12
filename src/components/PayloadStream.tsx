import { useMemo, useState } from 'react'
import { Activity, ChevronDown, Copy, Filter, Play, Search, Terminal } from 'lucide-react'
import type { HookEvent } from '../types'
type Props = { events: HookEvent[]; selected: string; onSelect: (id: string) => void; onReplay: (event: HookEvent) => void }
const color = (s: number) => s === 200 ? 'green' : s === 429 ? 'amber' : s === 500 ? 'rose' : 'slate'
export default function PayloadStream({ events, selected, onSelect, onReplay }: Props) {
  const [filter, setFilter] = useState('All events'); const [search, setSearch] = useState('')
  const active = events.find(e => e.id === selected) ?? events[0]
  const visible = useMemo(() => events.filter(e => (filter === 'All events' || String(e.status) === filter) && (e.source + e.path).toLowerCase().includes(search.toLowerCase())), [events, filter, search])
  const json = (v: unknown) => JSON.stringify(v, null, 2)
  const copy = (v: unknown) => navigator.clipboard?.writeText(json(v))
  return <section className="panel stream-panel">
    <div className="panel-head"><div className="panel-title"><span className="head-icon cyan"><Activity size={16}/></span><div><h2>Payload stream</h2><p>Incoming requests <span className="live-label">● LIVE SIMULATION</span></p></div></div><span className="count-chip">{events.length} EVENTS</span></div>
    <div className="stream-layout">
      <div className="event-list">
        <div className="list-tools"><div className="search-wrap"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events..."/></div><div className="filter-wrap"><Filter size={13}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All events</option><option value="200">200 OK</option><option value="400">400 Bad Request</option><option value="429">429 Rate limit</option><option value="500">500 Error</option></select><ChevronDown size={12}/></div></div>
        <div className="event-items">{visible.map(e=><button key={e.id} onClick={()=>onSelect(e.id)} className={'event-row '+(selected===e.id?'selected':'')}><div className="event-top"><span className={'method '+(e.method==='POST'?'post':'get')}>{e.method}</span><span className={'status-code '+color(e.status)}>{e.status}</span><span className="event-time">{e.timestamp}</span></div><div className="event-source">{e.source}</div><div className="event-path mono">{e.path}</div><div className="event-foot"><span>{e.latency}ms</span><span className="event-indicator">{e.status===200?'Delivered':e.status===429?'Retried':e.status===500?'Failed':'Rejected'}</span></div></button>)}{visible.length===0&&<div className="empty-state">No matching events found.</div>}</div>
        <div className="list-footer"><span>Showing {visible.length} of {events.length}</span><span className="mono">AUTO-REFRESH ON</span></div>
      </div>
      <div className="payload-view">{active ? <>
        <div className="payload-head"><div><div className="payload-name">{active.source}</div><div className="payload-endpoint mono">{active.method} {active.path}</div></div><button className="icon-btn" title="Copy payload" onClick={()=>copy(active.body)}><Copy size={14}/></button></div>
        <div className="tabs"><span className="tab active"><Terminal size={13}/> Body</span><span className="tab">Headers <small>({Object.keys(active.headers).length})</small></span><span className="tab-spacer"/><span className="response-time">{active.latency} ms</span></div>
        <div className="code-label">REQUEST BODY <button onClick={()=>copy(active.body)}>COPY JSON</button></div><pre className="json-code">{json(active.body).split('\n').map((line,i)=><div key={i}><span className="line-no">{i+1}</span><span>{line.split(/("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|\b\d+\b|\b(?:true|false|null)\b/g).map((part,j)=><span key={j} className={part.startsWith('"')?(part.endsWith(':')?'json-key':'json-string'):/^\d+$/.test(part)?'json-number':/^(true|false|null)$/.test(part)?'json-bool':''}>{part}</span>)}</span></div>)}</pre>
        <div className="headers-section"><div className="code-label">REQUEST HEADERS</div>{Object.entries(active.headers).map(([k,v])=><div className="header-line" key={k}><span>{k}</span><code>{v}</code></div>)}</div>
        <div className="payload-bottom"><span className={'result-dot '+color(active.status)}/> <span>Response {active.status}</span><span className="note">{active.note}</span><button className="btn btn-small btn-outline" onClick={()=>onReplay(active)}><Play size={12}/> Replay request</button></div>
      </> : <div className="empty-state large"><Terminal size={28}/><b>No payload selected</b><span>Choose an event or simulate a webhook.</span></div>}</div>
    </div>
  </section>
}