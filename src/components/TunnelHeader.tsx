import { Activity, ArrowUpRight, CircleDot, Radio, ShieldCheck, Trash2, Zap } from 'lucide-react'
type Props = { count: number; onSimulate: () => void; onClear: () => void }
export default function TunnelHeader({ count, onSimulate, onClear }: Props) {
  return <header className="topbar">
    <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><div className="brand-name">hook<span>pulse</span><sup> BETA</sup></div><div className="brand-sub">WEBHOOK CONTROL CENTER</div></div></div>
    <div className="tunnel-pill"><span className="live-dot"/><span className="mono">relay-kenya-01.hookpulse.dev</span><ArrowUpRight size={13}/><span className="tunnel-target">localhost:3000</span></div>
    <div className="top-actions"><div className="status"><CircleDot size={13}/> <span>Tunnel active</span><b>14ms</b></div><button className="btn btn-ghost clear-btn" onClick={onClear}><Trash2 size={15}/> Clear logs</button><button className="btn btn-primary" onClick={onSimulate}><Zap size={15}/> Simulate webhook</button></div>
    <div className="mobile-meta"><span><Radio size={12}/> SIMULATED TUNNEL</span><span>{count} events captured</span></div>
  </header>
}