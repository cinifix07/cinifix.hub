import { Component, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, usePaginatedQuery } from 'convex/react'
import { CalendarDays, CheckCheck, CircleAlert, CircleCheck, Download, Eye, FileText, LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import ReportDialog from './report-dialog.jsx'
import ReportForm from './report-form.jsx'
import ReportExport from './report-export.jsx'
import { displayReportDate, filterReports, reportTitle } from './report-utils.js'
import './reports.css'

const PAGE_SIZE = 10

class ReportsBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <ReportDialog title="Unable to load reports" onClose={this.props.onClose}><p className="task-alert-copy">Reports could not be loaded. Check your connection, then try again. Your saved reports are unchanged.</p><div className="task-modal-actions"><button type="button" className="task-secondary-button" onClick={this.props.onClose}>Close reports</button><button type="button" className="task-save-button" onClick={() => this.setState({ failed: false })}>Try again</button></div></ReportDialog>
    return this.props.children
  }
}

function useReportPages(query, scope) {
  const { results, status, loadMore } = usePaginatedQuery(query, scope, { initialNumItems: 10 })
  useEffect(() => { if (status === 'CanLoadMore') loadMore(10) }, [status, loadMore])
  return { records: results, ready: status === 'Exhausted', initialLoading: status === 'LoadingFirstPage' }
}

function Notification({ notice, onClose }) {
  useEffect(() => {
    if (notice.type !== 'success') return
    const timeout = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timeout)
  }, [notice, onClose])
  return <div className={`dashboard-toast ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'error' ? <CircleAlert size={20} aria-hidden="true" /> : <CircleCheck size={20} aria-hidden="true" />}<span>{notice.text}</span><button type="button" onClick={onClose} aria-label="Dismiss report notification"><X size={17} aria-hidden="true" /></button></div>
}

function DeleteReport({ report, onClose, onDeleted }) {
  const remove = useMutation(api.narratives.remove)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  async function confirm() {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try { await remove({ narrativeId: report._id }); onDeleted(report) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to delete this report.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <ReportDialog title="Delete this report?" eyebrow="DELETE NARRATIVE REPORT" onClose={onClose} busy={busy}><p className="task-alert-copy">Permanently delete <strong>{reportTitle(report)}</strong>? This action cannot be undone.</p>{error && <p className="task-form-status error" role="alert">{error}</p>}<div className="task-modal-actions"><button className="task-secondary-button" type="button" disabled={busy} onClick={onClose}>Cancel</button><button className="task-danger-button" type="button" disabled={busy} onClick={confirm}>{busy ? 'Deleting…' : 'Delete report'}</button></div></ReportDialog>
}

function ReportsWorkspace({ userName, isAdmin, onClose, onLog }) {
  const scope = isAdmin ? {} : { createdBy: userName }
  const { records, ready, initialLoading } = useReportPages(api.narratives.listPage, scope)
  const { records: events, ready: eventsReady } = useReportPages(api.events.listPage, scope)
  const [filters, setFilters] = useState({ search: '', date: '', eventId: '', order: 'newest' })
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [editor, setEditor] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const headingId = useId()
  const checkboxRef = useRef(null)
  const filtered = filterReports(records, filters, events)
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const selected = new Set(records.filter((record) => selectedIds.has(record._id)).map((record) => record._id))
  const allVisible = visible.length > 0 && visible.every((record) => selected.has(record._id))
  const someVisible = visible.some((record) => selected.has(record._id))
  const detail = records.find((record) => record._id === detailId)
  const eventsById = new Map(events.map((event) => [event._id, event.name]))
  const complete = ready && eventsReady
  useEffect(() => { if (checkboxRef.current) checkboxRef.current.indeterminate = someVisible && !allVisible }, [someVisible, allVisible])

  function updateFilter(name, value) { setFilters((current) => ({ ...current, [name]: value })); setPage(1) }
  function toggleRow(id) { setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function toggleVisible() { setSelectedIds((current) => { const next = new Set(current); visible.forEach((record) => { if (allVisible) next.delete(record._id); else next.add(record._id) }); return next }) }
  function notify(text, type = 'success') { setNotice({ text, type, key: Date.now() }) }
  function log(action, details) {
    // A logging failure must never turn a confirmed save into a retry/duplicate.
    Promise.resolve().then(() => onLog?.(action, details)).catch(() => notify('The action succeeded, but its activity log could not be recorded.', 'error'))
  }
  function saved(text, title) { setEditor(null); notify(text); log(text.startsWith('Report created') ? 'Created narrative report' : 'Updated narrative report', title) }
  function deleted(report) { setDeleteTarget(null); setSelectedIds((current) => { const next = new Set(current); next.delete(report._id); return next }); notify('Report deleted.'); log('Deleted narrative report', reportTitle(report)) }

  return <>
    {createPortal(<div className="task-modal-backdrop reports-workspace-backdrop">
      <section className="reports-workspace" role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <header className="reports-header">
          <div className="reports-heading"><span className="reports-heading-icon"><FileText size={23} aria-hidden="true" /></span><div><p className="task-modal-eyebrow">CINIFIX / {isAdmin ? 'ALL REPORTS' : 'MY REPORTS'}</p><h2 id={headingId}>Narrative Reports <span className="reports-count" aria-label={ready ? `${records.length} total reports` : 'Loading total report count'}>{ready ? records.length : '…'}</span></h2><p>Manage, create, and export narrative reports.</p></div></div>
          <div className="reports-header-actions"><button className="task-save-button" type="button" onClick={() => setEditor('new')} disabled={!eventsReady}><Plus size={17} aria-hidden="true" />Create Report</button><button className="task-secondary-button" type="button" onClick={() => setExportOpen(true)} disabled={!complete || !records.length}><Download size={17} aria-hidden="true" />Export PDF</button><button className="task-modal-close" type="button" aria-label="Close narrative reports" onClick={onClose}><X size={20} aria-hidden="true" /></button></div>
        </header>
        <div className="reports-content">
          <div className="reports-toolbar">
            <label className="reports-search"><Search size={18} aria-hidden="true" /><span className="dashboard-sr-only">Search reports</span><input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search title, narrative, creator, or event…" /></label>
            <label className="reports-filter"><span>Report date</span><input type="date" value={filters.date} onChange={(event) => updateFilter('date', event.target.value)} /></label>
            <label className="reports-filter"><span>Event</span><select value={filters.eventId} onChange={(event) => updateFilter('eventId', event.target.value)}><option value="">All events</option><option value="none">No event</option>{events.map((event) => <option key={event._id} value={event._id}>{event.name}</option>)}</select></label>
            <label className="reports-filter"><span>Sort by</span><select value={filters.order} onChange={(event) => updateFilter('order', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          </div>
          <div className="reports-selection-bar"><span><CheckCheck size={16} aria-hidden="true" /><strong>{selected.size}</strong> Report{selected.size === 1 ? '' : 's'} Selected</span><button className="reports-text-button" type="button" disabled={!complete || !filtered.length} onClick={() => setSelectedIds((current) => new Set([...current, ...filtered.map((record) => record._id)]))}>Select all {filtered.length} matching</button><button className="reports-text-button" type="button" onClick={() => setSelectedIds(new Set())} disabled={!selected.size}>Clear selections</button>{(filters.search || filters.date || filters.eventId) && <button className="reports-text-button reports-reset" type="button" onClick={() => { setFilters({ search: '', date: '', eventId: '', order: 'newest' }); setPage(1) }}>Reset filters</button>}</div>
          {!complete && <p className="reports-loading-line" role="status"><LoaderCircle size={15} className="dashboard-spinner" aria-hidden="true" />Loading reports and events… {records.length} report{records.length === 1 ? '' : 's'} loaded. Export unlocks when loading is complete.</p>}
          <div className="reports-table-wrap"><table className="reports-table">
            <thead><tr><th className="reports-select-column"><input ref={checkboxRef} type="checkbox" aria-label="Select all reports on this page" checked={allVisible} onChange={toggleVisible} disabled={!visible.length} /></th><th>Report Date</th><th>Report Title</th><th>Narrative Preview</th><th>Created By</th><th>Tasks</th><th>Actions</th></tr></thead>
            <tbody>
              {initialLoading && <tr><td colSpan={7}><div className="reports-empty"><LoaderCircle size={28} className="dashboard-spinner" aria-hidden="true" /><h3>Loading narrative reports…</h3></div></td></tr>}
              {!initialLoading && visible.length === 0 && <tr><td colSpan={7}><div className="reports-empty"><FileText size={32} aria-hidden="true" /><h3>{records.length ? 'No matching reports' : ready ? 'Your story starts here.' : 'Loading reports…'}</h3><p>{records.length ? 'Try another search, date, or event.' : ready ? 'Create your first narrative report to capture the work that matters.' : 'Fetching your report collection.'}</p>{ready && !records.length && <button className="task-save-button" type="button" onClick={() => setEditor('new')} disabled={!eventsReady}><Plus size={17} aria-hidden="true" />Create Report</button>}</div></td></tr>}
              {visible.map((report) => <tr key={report._id} className={selected.has(report._id) ? 'selected' : ''}>
                <td data-label="Select"><input type="checkbox" checked={selected.has(report._id)} onChange={() => toggleRow(report._id)} aria-label={`Select ${reportTitle(report)}`} /></td>
                <td data-label="Report Date"><span className="reports-date"><CalendarDays size={14} aria-hidden="true" />{displayReportDate(report.reportDate)}</span></td>
                <td data-label="Report Title"><button className="reports-title-link" type="button" onClick={() => setDetailId(report._id)}>{reportTitle(report)}</button>{report.eventId && <span className="reports-event-pill">{eventsById.get(report.eventId) || 'Event'}</span>}</td>
                <td data-label="Narrative Preview"><p className="reports-narrative-preview">{report.narrative}</p></td>
                <td data-label="Created By"><span className="reports-creator">{report.createdBy}</span></td>
                <td data-label="Tasks"><span className="reports-task-count">{report.taskCount}</span></td>
                <td data-label="Actions"><div className="task-table-actions"><button className="task-icon-button" type="button" title="View details" aria-label={`View details for ${reportTitle(report)}`} onClick={() => setDetailId(report._id)}><Eye size={17} aria-hidden="true" /></button>{(isAdmin || report.createdBy === userName) && <button className="task-icon-button" type="button" title="Edit report" aria-label={`Edit ${reportTitle(report)}`} onClick={() => setEditor(report)}><Pencil size={17} aria-hidden="true" /></button>}{isAdmin && <button className="task-icon-button danger" type="button" title="Delete report" aria-label={`Delete ${reportTitle(report)}`} onClick={() => setDeleteTarget(report)}><Trash2 size={17} aria-hidden="true" /></button>}</div></td>
              </tr>)}
            </tbody>
          </table></div>
        </div>
        <footer className="reports-pagination"><span aria-live="polite">{filtered.length ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)}` : '0'} of {filtered.length}{ready ? ' reports' : ' loaded reports'}</span><div><button className="task-secondary-button" type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button><span>Page {safePage} of {pageCount}</span><button className="task-secondary-button" type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>Next</button></div></footer>
      </section>
    </div>, document.querySelector('.admin-shell') ?? document.body)}
    {editor !== null && <ReportForm report={editor === 'new' ? null : editor} userName={userName} events={events} onClose={() => setEditor(null)} onSaved={saved} />}
    {detail && <ReportDialog title={reportTitle(detail)} eyebrow="FULL NARRATIVE REPORT" onClose={() => setDetailId(null)} className="report-details-dialog"><dl className="report-detail-metadata"><div><dt>Report date</dt><dd>{displayReportDate(detail.reportDate)}</dd></div><div><dt>Created by</dt><dd>{detail.createdBy}</dd></div><div><dt>Event</dt><dd>{eventsById.get(detail.eventId) || 'No event'}</dd></div><div><dt>Tasks</dt><dd>{detail.taskCount}</dd></div><div><dt>Created</dt><dd>{new Date(detail.createdAt).toLocaleString()}</dd></div>{detail.updatedAt && <div><dt>Updated</dt><dd>{new Date(detail.updatedAt).toLocaleString()}</dd></div>}</dl><div className="report-full-narrative">{detail.narrative}</div><div className="task-modal-actions"><button className="task-secondary-button" type="button" onClick={() => setDetailId(null)}>Close details</button></div></ReportDialog>}
    {deleteTarget && isAdmin && <DeleteReport report={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={deleted} />}
    {exportOpen && <ReportExport reports={filterReports(records, { order: filters.order })} events={events} selectedIds={selected} onClose={() => setExportOpen(false)} onGenerated={(text) => notify(text)} />}
    {notice && createPortal(<Notification key={notice.key} notice={notice} onClose={() => setNotice(null)} />, document.querySelector('.admin-shell') ?? document.body)}
  </>
}

export default function NarrativeReports(props) {
  return <ReportsBoundary onClose={props.onClose}><ReportsWorkspace {...props} /></ReportsBoundary>
}
