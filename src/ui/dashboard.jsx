import { useEffect, useRef, useState } from 'react'
import { useSession } from '../auth/session.jsx'
import ChatLauncher from '../chat/chat.jsx'
import { createPortal } from 'react-dom'
import { ArchiveRestore, ChartColumnIncreasing, ChevronLeft, ChevronRight, ClipboardCheck, History, LayoutDashboard, Menu, NotebookPen, UsersRound, WalletCards, X } from 'lucide-react'
import cinifixLogo from '../assets/cinifix.jpg'
import './dashboard.css'

const navigation = {
  'Ads Manager': { label: 'Overview', icon: LayoutDashboard },
  Reporting: { label: 'Allowance tracking', icon: WalletCards },
  Audience: { label: 'Task manager', icon: ClipboardCheck },
  'Business News': { label: 'Narrative reports', icon: NotebookPen },
  Campaigns: { label: 'Activity log', icon: History },
  Billing: { label: 'Archived users', icon: ArchiveRestore },
  'Business Tools': { label: 'User management', icon: UsersRound },
}

// Existing dialogs share focus containment, Escape dismissal, and focus return.
function useDialogAccessibility(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    const focusable = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'
    let activeDialog = null
    const focusOrigins = new Map()
    function updateDialog() {
      const dialogs = [...root.querySelectorAll('[aria-modal="true"]')]
      const next = dialogs.at(-1) ?? null
      if (next === activeDialog) return
      if (activeDialog && !root.contains(activeDialog)) {
        focusOrigins.get(activeDialog)?.focus()
        focusOrigins.delete(activeDialog)
      }
      if (next) {
        if (!focusOrigins.has(next)) focusOrigins.set(next, document.activeElement)
        next.setAttribute('tabindex', '-1')
        if (!next.contains(document.activeElement)) {
          const initialFocus = next.querySelector('.task-secondary-button, .task-modal-close') ?? next.querySelector(focusable) ?? next
          initialFocus.focus()
        }
      }
      activeDialog = next
    }
    function handleKey(event) {
      if (!activeDialog) return
      if (event.key === 'Escape') {
        const close = activeDialog.querySelector('.task-modal-close:not(:disabled)')
        if (close) { event.preventDefault(); close.click() }
      }
      if (event.key !== 'Tab') return
      const elements = [...activeDialog.querySelectorAll(focusable)].filter((element) => element.getClientRects().length)
      const first = elements[0]
      const last = elements.at(-1)
      if (!first) { event.preventDefault(); activeDialog.focus(); return }
      if (!activeDialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === activeDialog)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const observer = new MutationObserver(updateDialog)
    observer.observe(root, { childList: true, subtree: true })
    root.addEventListener('keydown', handleKey)
    updateDialog()
    return () => { observer.disconnect(); root.removeEventListener('keydown', handleKey) }
  }, [rootRef])
}

export function DashboardShell({ children, userName, role, greeting, items, activeNav, onNavigate, isSidebarOpen, setIsSidebarOpen }) {
  const session = useSession()
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef(null)
  const sidebarRef = useRef(null)
  const menuRef = useRef(null)
  useDialogAccessibility(rootRef)

  useEffect(() => {
    if (!isSidebarOpen || !window.matchMedia('(max-width: 720px)').matches) return
    sidebarRef.current?.querySelector('button')?.focus()
    function handleDrawerKey(event) {
      if (event.key === 'Escape') { setIsSidebarOpen(false); menuRef.current?.focus() }
      if (event.key === 'Tab') {
        const buttons = [...sidebarRef.current.querySelectorAll('button')]
        const target = event.shiftKey ? buttons.at(-1) : buttons[0]
        if ((event.shiftKey && document.activeElement === buttons[0]) || (!event.shiftKey && document.activeElement === buttons.at(-1))) { event.preventDefault(); target.focus() }
      }
    }
    document.addEventListener('keydown', handleDrawerKey)
    return () => document.removeEventListener('keydown', handleDrawerKey)
  }, [isSidebarOpen, setIsSidebarOpen])

  function navigate(title) {
    onNavigate(title)
    if (window.matchMedia('(max-width: 720px)').matches) { setIsSidebarOpen(false); menuRef.current?.focus() }
  }

  return (
    <div className="admin-shell" ref={rootRef}>
      {isSidebarOpen && <button className="dashboard-drawer-scrim" type="button" aria-label="Close navigation" onClick={() => setIsSidebarOpen(false)} tabIndex={-1} />}
      <aside id="dashboard-navigation" ref={sidebarRef} className={`admin-sidebar ${isSidebarOpen ? 'expanded' : 'collapsed'}`} aria-label="Workspace navigation">
        <div className="dashboard-brand-row">
          <button className="admin-brand" type="button" aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <img className="admin-brand-icon" src={cinifixLogo} alt="CINIFIX" width="48" height="48" />
          </button>
          <div className="dashboard-brand-copy"><strong>CINIFIX</strong><span>YOUR DAILY MOMENTUM</span></div>
        </div>
        <p className="dashboard-nav-label">WORKSPACE</p>
        <nav className="admin-sidebar-nav" aria-label="Primary">
          {items.map(({ title }) => {
            const { label, icon: Icon } = navigation[title]
            const active = activeNav === title
            return <button key={title} className={`admin-sidebar-icon${active ? ' active' : ''}`} type="button" title={label} aria-label={label} aria-current={active ? 'page' : undefined} onClick={() => navigate(title)}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /><span className="dashboard-nav-text">{label}</span></button>
          })}
        </nav>
        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-sidebar-note"><ChartColumnIncreasing size={20} aria-hidden="true" /><span>A little focus.<br /><strong>A lot of progress.</strong></span></div>
          <button className="dashboard-collapse" type="button" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'} title={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}>{isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}<span className="dashboard-nav-text">Collapse sidebar</span></button>
        </div>
      </aside>
      <main className="admin-workspace">
        <header className="admin-topbar">
          <button ref={menuRef} className="dashboard-mobile-menu task-icon-button" type="button" aria-label="Open navigation" aria-expanded={isSidebarOpen} aria-controls="dashboard-navigation" onClick={() => setIsSidebarOpen(true)}><Menu size={21} /></button>
          <div className="dashboard-greeting-wrap"><span className="dashboard-topbar-eyebrow">YOUR WORKSPACE, IN FOCUS</span><p className="admin-greeting">Hello {userName}, <span>{greeting}!</span></p></div>
          <div className="dashboard-account"><span className="admin-role-label">{role}</span><img src={cinifixLogo} width="36" height="36" alt="CINIFIX account badge" />{session && <button className="task-secondary-button" disabled={signingOut} onClick={async () => { setSigningOut(true); setSignOutError(''); try { await session.signOut() } catch { setSignOutError('Unable to sign out. Reconnect and try again.') } finally { setSigningOut(false) } }}>{signingOut ? 'Signing out…' : 'Sign out'}</button>}</div>
        </header>
        {children}
        {signOutError && <p role="alert" style={{ color: '#b13e2e', padding: '12px' }}>{signOutError}</p>}
      </main>
      <ChatLauncher />
    </div>
  )
}

export function DashboardDialog({ title, eyebrow, children, onClose, busy = false, id = 'dashboard-dialog-title' }) {
  return createPortal(<div className="task-alert-backdrop"><section className="task-alert-modal dashboard-detail-modal" role="dialog" aria-modal="true" aria-labelledby={id} aria-busy={busy}>
    <div className="task-modal-header"><div><p className="task-modal-eyebrow">{eyebrow}</p><h2 id={id}>{title}</h2></div><button className="task-modal-close" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={19} aria-hidden="true" /></button></div>
    {children}
  </section></div>, document.querySelector('.admin-shell') ?? document.body)
}
