import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { LoaderCircle, Save } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import ReportDialog from './report-dialog.jsx'
import EventSelect from './event-select.jsx'
import { localReportDate, reportTitle } from './report-utils.js'

export default function ReportForm({ report, userName, events, onClose, onSaved }) {
  const createReport = useMutation(api.narratives.createManual)
  const updateReport = useMutation(api.narratives.update)
  const [form, setForm] = useState(() => ({ title: report ? reportTitle(report) : '', reportDate: report?.reportDate || localReportDate(), narrative: report?.narrative || '', eventId: report?.eventId || '', newEventName: '' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); setError('') }
  async function save(event) {
    event.preventDefault()
    if (pending.current) return
    if (!form.title.trim() || !form.reportDate || !form.narrative.trim()) { setError('Enter a title, report date, and narrative.'); return }
    if (form.eventId === 'new' && !form.newEventName.trim()) { setError('Enter a name for the new event.'); return }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const fields = { title: form.title, reportDate: form.reportDate, narrative: form.narrative, createdBy: report?.createdBy || userName }
      if (form.eventId === 'new') fields.newEventName = form.newEventName
      else if (form.eventId) fields.eventId = form.eventId
      else if (report) fields.eventId = null
      if (report) await updateReport({ ...fields, narrativeId: report._id, taskCount: report.taskCount })
      else await createReport(fields)
      onSaved(report ? 'Report updated.' : 'Report created.', form.title)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save this report. Please try again.')
    } finally { pending.current = false; setBusy(false) }
  }
  return <ReportDialog title={report ? 'Edit narrative report' : 'Create narrative report'} onClose={onClose} busy={busy} className="report-editor-dialog">
    <form className="task-form report-editor-form" onSubmit={save} aria-busy={busy}>
      <p className="report-form-intro">Keep the details that matter. Your line breaks and full narrative are preserved.</p>
      <label>Report Title<input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Enter report title" maxLength={200} required disabled={busy} /></label>
      <div className="report-form-columns"><label>Report Date<input type="date" value={form.reportDate} onChange={(event) => update('reportDate', event.target.value)} required disabled={busy} /></label><div className="report-field"><span>Event <small>Optional</small></span><EventSelect events={events} value={form.eventId} onChange={(value) => update('eventId', value)} allowNew disabled={busy} /></div></div>
      {form.eventId === 'new' && <label>New event name<input value={form.newEventName} onChange={(event) => update('newEventName', event.target.value)} maxLength={200} placeholder="Enter event name" required disabled={busy} /></label>}
      <label>Definition of Narrative Report<textarea rows={11} value={form.narrative} onChange={(event) => update('narrative', event.target.value)} placeholder="Write your narrative report here. Describe the activities performed, observations, accomplishments, and other relevant details..." required disabled={busy} /></label>
      {error && <p className="task-form-status error" role="alert">{error}</p>}
      <div className="task-modal-actions"><button className="task-secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="task-save-button" type="submit" disabled={busy}>{busy ? <LoaderCircle className="dashboard-spinner" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{busy ? 'Saving report…' : 'Save Report'}</button></div>
    </form>
  </ReportDialog>
}
