import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, CalendarDays, CircleAlert, CircleCheck, ClipboardCheck, Clock3, LayoutGrid, List, LoaderCircle, Plus, Search, X } from 'lucide-react'
import { DashboardDialog } from './dashboard.jsx'

export function CompletionButton({ task, isCompleting, onComplete }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const pendingRef = useRef(false)
  const completed = task.status === 'completed'
  async function confirmCompletion() {
    if (pendingRef.current || isCompleting || completed) return
    pendingRef.current = true
    setIsPending(true)
    try {
      if (await onComplete(task._id)) setIsConfirming(false)
    } finally {
      pendingRef.current = false
      setIsPending(false)
    }
  }
  return <>
    <button className={`task-complete-button${completed ? ' completed' : ''}`} type="button" disabled={completed || isCompleting || isPending} onClick={() => setIsConfirming(true)}>
      {isCompleting || isPending ? <LoaderCircle className="dashboard-spinner" size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
      {completed ? 'Completed' : isCompleting || isPending ? 'Completing...' : 'Complete Task'}
    </button>
    {isConfirming && <DashboardDialog title="Complete this task?" eyebrow="One more step forward" id={`confirm-${task._id}`} busy={isPending || isCompleting} onClose={() => setIsConfirming(false)}>
      <div className="dashboard-confirm-icon"><CircleCheck size={28} aria-hidden="true" /></div>
      <p className="task-alert-copy">Mark <strong>{task.taskName}</strong> as completed for today? Your record will update after confirmation.</p>
      <div className="task-modal-actions">
        <button className="task-secondary-button" type="button" disabled={isPending || isCompleting} onClick={() => setIsConfirming(false)}>Keep working</button>
        <button className="task-save-button" type="button" disabled={isPending || isCompleting || completed} onClick={confirmCompletion}>{isPending || isCompleting ? <LoaderCircle className="dashboard-spinner" size={17} aria-hidden="true" /> : <CircleCheck size={17} aria-hidden="true" />}{isPending || isCompleting ? 'Completing...' : 'Confirm completion'}</button>
      </div>
    </DashboardDialog>}
  </>
}

function CompletionToast({ status }) {
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    if (status.type !== 'success') return
    const timer = window.setTimeout(() => setDismissed(true), 6000)
    return () => window.clearTimeout(timer)
  }, [status])
  if (dismissed) return null
  return <div className={`dashboard-toast ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>{status.type === 'error' ? <CircleAlert size={21} aria-hidden="true" /> : <CircleCheck size={21} aria-hidden="true" />}<span>{status.text}</span><button type="button" aria-label="Dismiss notification" onClick={() => setDismissed(true)}><X size={17} /></button></div>
}

function Detail({ label, value }) {
  return <div className="task-card-detail"><dt>{label}</dt><dd>{value || '—'}</dd></div>
}

export function TaskBoard({ tasks, currentDate, onCompleteTask, completingTaskId, completionStatus, onManageTasks, formatters }) {
  const { formatTaskDate, formatTaskDateTime, formatTaskDateRange, formatTaskWeekdays, getTaskStartTime } = formatters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [view, setView] = useState('grid')
  const [detailId, setDetailId] = useState(null)
  const total = tasks?.length ?? 0
  const completed = tasks?.filter((task) => task.status === 'completed').length ?? 0
  const visibleTasks = tasks?.filter((task) => (statusFilter === 'all' || (statusFilter === 'completed' ? task.status === 'completed' : task.status !== 'completed')) && [task.taskName, task.taskDefinition, task.createdBy].some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())))
  const detailTask = tasks?.find((task) => task._id === detailId)
  return <section className="admin-content" data-purpose="task-dashboard">
    <div className="task-dashboard">
      <div className="task-dashboard-header">
        <div><p className="task-dashboard-eyebrow">DAILY TASK MONITORING</p><h1>Tasks<span className="dashboard-title-dot">.</span></h1><p className="dashboard-section-copy">A clear view of your day. One task at a time.</p></div>
        <button className="task-save-button dashboard-manage-button" type="button" onClick={onManageTasks}><Plus size={18} aria-hidden="true" />Manage tasks</button>
      </div>
      <div className="dashboard-overview">
        <div className="dashboard-stat"><span className="dashboard-stat-icon"><ClipboardCheck size={20} aria-hidden="true" /></span><div><span>Scheduled today</span><strong>{tasks === undefined ? '—' : total.toString().padStart(2, '0')}</strong></div></div>
        <div className="dashboard-stat"><span className="dashboard-stat-icon pending"><Clock3 size={20} aria-hidden="true" /></span><div><span>Pending</span><strong>{tasks === undefined ? '—' : (total - completed).toString().padStart(2, '0')}</strong></div></div>
        <div className="dashboard-stat"><span className="dashboard-stat-icon completed"><CircleCheck size={20} aria-hidden="true" /></span><div><span>Completed</span><strong>{tasks === undefined ? '—' : completed.toString().padStart(2, '0')}</strong></div><div className="dashboard-progress" role="progressbar" aria-label="Daily task completion" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={completed}><span style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div></div>
      </div>
      <div className="dashboard-task-toolbar">
        <label className="dashboard-search"><Search size={18} aria-hidden="true" /><span className="dashboard-sr-only">Search today's tasks</span><input type="search" placeholder="Search your tasks..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="dashboard-filter-tabs" role="group" aria-label="Task status filter">{[['all','All tasks'],['pending','Pending'],['completed','Completed']].map(([value,label]) => <button type="button" key={value} aria-pressed={statusFilter === value} className={statusFilter === value ? 'selected' : ''} onClick={() => setStatusFilter(value)}>{label}</button>)}</div>
        <div className="dashboard-view-toggle" role="group" aria-label="Task view"><button type="button" title="Grid view" aria-label="Grid view" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button><button type="button" title="List view" aria-label="List view" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button></div>
      </div>
      <div className="dashboard-results-meta"><span><CalendarDays size={14} aria-hidden="true" />{formatTaskDate(currentDate)}</span><span className="dashboard-live"><i />Live updates</span><span aria-live="polite">{tasks === undefined ? 'Loading tasks' : `${visibleTasks.length} task${visibleTasks.length === 1 ? '' : 's'}`}</span></div>
      {completionStatus != null && <CompletionToast status={completionStatus} />}
      {tasks === undefined && <div className="dashboard-skeleton-grid" aria-label="Loading tasks" role="status">{[0,1,2].map((index) => <div className="dashboard-skeleton" key={index}><span /><span /><span /><span /></div>)}</div>}
      {tasks !== undefined && visibleTasks.length === 0 && <div className="task-dashboard-empty"><span className="dashboard-empty-icon"><ClipboardCheck size={34} aria-hidden="true" /></span><h2>{total ? 'No matching tasks' : 'A fresh start for your day'}</h2><p>{total ? 'Try another search or status filter.' : `No tasks are scheduled for ${formatTaskDate(currentDate)}.`}</p>{total ? <button className="task-secondary-button" type="button" onClick={() => { setSearch(''); setStatusFilter('all') }}>Clear filters</button> : <button className="task-save-button" type="button" onClick={onManageTasks}><Plus size={17} aria-hidden="true" />Manage tasks</button>}</div>}
      {visibleTasks?.length > 0 && <div className={`task-card-grid${view === 'list' ? ' task-list-view' : ''}`} aria-label="Today's tasks">{visibleTasks.map((task,index) => {
        const done = task.status === 'completed'
        return <article className="task-card" key={task._id} style={{ '--card-index': Math.min(index, 8) }}>
          <div className="task-card-header"><span className="dashboard-task-glyph"><ClipboardCheck size={20} aria-hidden="true" /></span><span className={`task-status-pill ${done ? 'completed' : 'pending'}`}>{done ? <CircleCheck size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{done ? 'Completed' : 'Pending'}</span></div>
          <div className="dashboard-task-heading"><h2>{task.taskName}</h2><p className="task-card-kicker"><CalendarDays size={13} aria-hidden="true" />{formatTaskDateRange(task)}</p></div>
          <p className="task-card-definition">{task.taskDefinition}</p>
          <button className="dashboard-detail-link" type="button" onClick={() => setDetailId(task._id)} aria-label={`View details for ${task.taskName}`}>View task details<ArrowUpRight size={14} aria-hidden="true" /></button>
          <dl className="task-card-details"><Detail label="Scheduled days" value={formatTaskWeekdays(task)} /><Detail label="Time window" value={`${getTaskStartTime(task) || '—'} — ${task.taskEndTime || '—'}`} /></dl>
          <div className="dashboard-task-footer"><div className="dashboard-creator"><span className="dashboard-creator-avatar" aria-hidden="true">{(task.createdBy || 'C').slice(0,1).toUpperCase()}</span><span><strong>{task.createdBy || '—'}</strong><small>Created {formatTaskDateTime(task._creationTime)}</small></span></div>{done && <p className="dashboard-completed-at">Completed {formatTaskDateTime(task.completedAt)}</p>}<CompletionButton task={task} isCompleting={completingTaskId === task._id} onComplete={onCompleteTask} /></div>
        </article>
      })}</div>}
      {detailTask && <DashboardDialog title={detailTask.taskName} eyebrow="Task details" onClose={() => setDetailId(null)}><p className="dashboard-full-description">{detailTask.taskDefinition}</p><dl className="dashboard-detail-grid"><Detail label="Schedule" value={formatTaskDateRange(detailTask)} /><Detail label="Days" value={formatTaskWeekdays(detailTask)} /><Detail label="Start time" value={getTaskStartTime(detailTask)} /><Detail label="End time" value={detailTask.taskEndTime} /><Detail label="Created by" value={detailTask.createdBy} /><Detail label="Created" value={formatTaskDateTime(detailTask._creationTime)} /><Detail label="Status" value={detailTask.status === 'completed' ? 'Completed' : 'Pending'} /><Detail label="Completed" value={formatTaskDateTime(detailTask.completedAt)} /></dl><div className="task-modal-actions"><button className="task-secondary-button" type="button" onClick={() => setDetailId(null)}>Close details</button></div></DashboardDialog>}
    </div>
  </section>
}
