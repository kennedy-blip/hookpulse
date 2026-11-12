import { useMemo, useState } from 'react'
import { Activity, ChevronDown, Copy, Filter, Play, Search, Terminal } from 'lucide-react'
import type { HookEvent } from '../types'

type Props = {
  events: HookEvent[]
  selected: string
  onSelect: (id: string) => void
  onReplay: (event: HookEvent) => void
}

const color = (status: number) => status === 200 ? 'green' : status === 429 ? 'amber' : status >= 500 ? 'rose' : 'slate'

export default function PayloadStream({ events, selected, onSelect, onReplay }: Props) {
  const [filter, setFilter] = useState('All events')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'body' | 'headers'>('body')
  const active = events.find(event => event.id === selected) ?? events[0]
  const visible = useMemo(
    () => events.filter(event =>
      (filter === 'All events' || String(event.status) === filter) &&
      (event.source + event.path).toLowerCase().includes(search.toLowerCase())
    ),
    [events, filter, search]
  )
  const json = (value: unknown) => JSON.stringify(value, null, 2)
  const copy = (value: unknown) => navigator.clipboard?.writeText(json(value))

  return (
    <section className="panel stream-panel">
      <div className="panel-head">
        <div className="panel-title">
          <span className="head-icon cyan"><Activity size={16}/></span>
          <div><h2>Payload stream</h2><p>Incoming requests <span className="live-label">● LIVE API</span></p></div>
        </div>
        <span className="count-chip">{events.length} EVENTS</span>
      </div>
      <div className="stream-layout">
        <div className="event-list">
          <div className="list-tools">
            <div className="search-wrap"><Search size={14}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search events..."/></div>
            <div className="filter-wrap">
              <Filter size={13}/>
              <select value={filter} onChange={event => setFilter(event.target.value)}>
                <option>All events</option><option value="200">200 OK</option><option value="400">400 Bad Request</option><option value="401">401 Unauthorized</option><option value="429">429 Rate limit</option><option value="500">500 Error</option>
              </select>
              <ChevronDown size={12}/>
            </div>
          </div>
          <div className="event-items">
            {visible.map(event => (
              <button key={event.id} onClick={() => onSelect(event.id)} className={'event-row ' + (selected === event.id ? 'selected' : '')}>
                <div className="event-top">
                  <span className={'method ' + (event.method === 'POST' ? 'post' : 'get')}>{event.method}</span>
                  <span className={'status-code ' + color(event.status)}>{event.status}</span>
                  <span className="event-time">{event.timestamp}</span>
                </div>
                <div className="event-source">{event.source}</div>
                <div className="event-path mono">{event.path}</div>
                <div className="event-foot">
                  <span>{event.latency}ms</span>
                  <span className="event-indicator">{event.status === 200 ? 'Delivered' : event.status === 429 ? 'Retried' : event.status >= 500 ? 'Failed' : 'Rejected'}</span>
                </div>
              </button>
            ))}
            {visible.length === 0 && <div className="empty-state">No matching events found.</div>}
          </div>
          <div className="list-footer"><span>Showing {visible.length} of {events.length}</span><span className="mono">AUTO-REFRESH ON</span></div>
        </div>
        <div className="payload-view">
          {active ? (
            <>
              <div className="payload-head">
                <div><div className="payload-name">{active.source}</div><div className="payload-endpoint mono">{active.method} {active.path}</div></div>
                <button className="icon-btn" title="Copy payload" onClick={() => copy(tab === 'body' ? active.body : active.headers)}><Copy size={14}/></button>
              </div>
              <div className="tabs">
                <button className={'tab ' + (tab === 'body' ? 'active' : '')} onClick={() => setTab('body')}><Terminal size={13}/> Body</button>
                <button className={'tab ' + (tab === 'headers' ? 'active' : '')} onClick={() => setTab('headers')}>Headers <small>({Object.keys(active.headers).length})</small></button>
                <span className="tab-spacer"/>
                <span className="response-time">{active.latency} ms</span>
              </div>
              {tab === 'body' ? (
                <>
                  <div className="code-label">REQUEST BODY <button onClick={() => copy(active.body)}>COPY JSON</button></div>
                  <pre className="json-code">{json(active.body).split('\n').map((line, index) => <div key={index}><span className="line-no">{index + 1}</span><span>{line}</span></div>)}</pre>
                </>
              ) : (
                <div className="headers-section">
                  <div className="code-label">REQUEST HEADERS <button onClick={() => copy(active.headers)}>COPY HEADERS</button></div>
                  {Object.entries(active.headers).map(([key, value]) => <div className="header-line" key={key}><span>{key}</span><code>{value}</code></div>)}
                </div>
              )}
              <div className="payload-bottom">
                <span className={'result-dot ' + color(active.status)}/>
                <span>Response {active.status}</span>
                <span className="note">{active.note}</span>
                <button className="btn btn-small btn-outline" onClick={() => onReplay(active)}><Play size={12}/> Replay request</button>
              </div>
            </>
          ) : (
            <div className="empty-state large"><Terminal size={28}/><b>No payload selected</b><span>Choose an event or send a webhook.</span></div>
          )}
        </div>
      </div>
    </section>
  )
}
