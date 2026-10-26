import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import cinifixLogo from '../assets/cinifix.jpg'
import { estimateWorkspaceProgress } from './loader-progress.js'
import './workspace-loader.css'

export default function WorkspaceLoader({ ready, verified, deadline, onCancel }) {
  const [progress, setProgress] = useState(1)
  const [dismissed, setDismissed] = useState(false)
  const [canCancel, setCanCancel] = useState(() => Date.now() >= deadline)
  const started = useRef(null)
  useEffect(() => {
    if (ready) return
    started.current ??= performance.now()
    const timer = window.setInterval(() => {
      const next = estimateWorkspaceProgress(performance.now() - started.current, verified)
      setProgress(current => Math.max(current, next))
    }, 100)
    return () => window.clearInterval(timer)
  }, [ready, verified])
  useEffect(() => {
    if (!ready) return
    // Dashboard mounts immediately underneath; this only fades the visual layer.
    const timer = window.setTimeout(() => setDismissed(true), 320)
    return () => window.clearTimeout(timer)
  }, [ready])
  useEffect(() => {
    const timer = window.setTimeout(() => setCanCancel(true), Math.max(0, deadline - Date.now()))
    return () => window.clearTimeout(timer)
  }, [deadline])
  if (dismissed) return null
  const value = ready ? 100 : progress
  const phase = ready ? 2 : verified ? 1 : 0
  const status = ready ? 'Your workspace is ready.' : verified ? 'Bringing your workspace into focus…' : 'Preparing your secure workspace…'
  return <section className={`workspace-loader${ready ? ' is-ready' : ''}`} aria-label="Opening CINIFIX workspace">
    <div className="workspace-loader-grid" aria-hidden="true" />
    <header className="workspace-loader-masthead"><span className="workspace-loader-brand"><span />CINIFIX</span><span>YOUR DAILY MOMENTUM</span></header>
    <div className="workspace-loader-composition">
      <div className="workspace-loader-seal" aria-hidden="true">
        <span className="workspace-loader-orbit orbit-outer" /><span className="workspace-loader-orbit orbit-inner" />
        <svg className="workspace-loader-ring" viewBox="0 0 240 240"><defs><linearGradient id="loader-ring-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#b9985c" /><stop offset="65%" stopColor="#e9d599" /><stop offset="100%" stopColor="#9f7738" /></linearGradient></defs><circle className="workspace-loader-ring-track" cx="120" cy="120" r="108" /><circle className="workspace-loader-ring-fill" cx="120" cy="120" r="108" pathLength="100" strokeDasharray={`${value} 100`} /></svg>
        <div className="workspace-loader-badge"><img src={cinifixLogo} alt="" width="160" height="160" /><span /></div>
        <span className="workspace-loader-orbit-dot" />
        {ready && <span className="workspace-loader-complete"><Check size={15} strokeWidth={2} /></span>}
      </div>
      <p className="workspace-loader-eyebrow">A LITTLE FOCUS. A LOT OF PROGRESS.</p>
      <h1>CINIFIX<span>.</span></h1>
      <p className="workspace-loader-status" role="status">{status}</p>
      <div className="workspace-loader-progress" role="progressbar" aria-label="Estimated workspace preparation" aria-valuemin={1} aria-valuemax={100} aria-valuenow={value} aria-valuetext={ready ? '100 percent. Workspace ready.' : `${value} percent. Preparing workspace.`}>
        <div className="workspace-loader-progress-caption"><span>{ready ? 'WELCOME TO YOUR WORKSPACE' : 'OPENING YOUR WORKSPACE'}</span><span className="workspace-loader-number">{String(value).padStart(2, '0')}<small>%</small></span></div>
        <div className="workspace-loader-track"><span style={{ transform: `scaleX(${value / 100})` }} /></div>
      </div>
      <ol className="workspace-loader-stages" aria-label="Preparation stages">{['Secure access', 'Workspace', 'Ready'].map((label, index) => <li key={label} className={index < phase || ready ? 'complete' : index === phase ? 'active' : ''} aria-current={!ready && index === phase ? 'step' : undefined}><span>{index < phase || ready ? <Check size={10} /> : `0${index + 1}`}</span>{label}</li>)}</ol>
      <div className="workspace-loader-action">{canCancel && !ready && <button type="button" onClick={onCancel}><ArrowLeft size={13} aria-hidden="true" />Back to sign in</button>}</div>
    </div>
    <footer className="workspace-loader-footer"><span><ShieldCheck size={13} aria-hidden="true" />A secure start to a focused day.</span><span>CINIFIX WORKSPACE</span></footer>
  </section>
}
