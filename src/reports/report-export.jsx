import { useEffect, useRef, useState } from 'react'
import { Download, Eye, LoaderCircle } from 'lucide-react'
import ReportDialog from './report-dialog.jsx'
import EventSelect from './event-select.jsx'
import { exportReports } from './report-utils.js'

const defaultOptions = { logo: true, title: true, date: true, creator: true, narrative: true, event: true, pageNumbers: true }
const optionLabels = { logo: 'CINIFIX logo', title: 'Report title', date: 'Report date', creator: 'Created by', narrative: 'Narrative content', event: 'Event name, when available', pageNumbers: 'Page numbers' }

export default function ReportExport({ reports, events, selectedIds, onClose, onGenerated }) {
  const [scope, setScope] = useState(selectedIds.size ? 'selected' : 'range')
  const [eventId, setEventId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [options, setOptions] = useState(defaultOptions)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const previewRef = useRef('')
  const pending = useRef(false)
  const eligible = exportReports(reports, { scope, selectedIds, eventId, startDate, endDate })
  // A preview is a snapshot. Any configuration or source change invalidates it.
  const signature = JSON.stringify({ scope, eventId, startDate, endDate, options, reports: eligible.map((report) => [report._id, report.updatedAt || report.createdAt]), events })
  const [previewSignature, setPreviewSignature] = useState('')
  const previewIsCurrent = previewUrl && previewSignature === signature
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  async function generate(preview) {
    if (pending.current || !eligible.length) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const { createNarrativePdf } = await import('./report-pdf.js')
      const doc = await createNarrativePdf(eligible, options, events, { eventName: scope === 'event' ? events.find((event) => event._id === eventId)?.name : '', startDate: scope === 'range' ? startDate : '', endDate: scope === 'range' ? endDate : '' })
      if (preview) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current)
        const url = URL.createObjectURL(doc.output('blob'))
        previewRef.current = url
        setPreviewUrl(url)
        setPreviewSignature(signature)
      } else {
        doc.save('CINIFIX-Narrative-Reports.pdf')
        onGenerated(`${eligible.length} report${eligible.length === 1 ? '' : 's'} exported.`)
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to generate PDF. Please try again.') }
    finally { pending.current = false; setBusy(false) }
  }

  return <ReportDialog title="Generate Narrative Reports PDF" eyebrow="CINIFIX EXPORT STUDIO" onClose={onClose} busy={busy} className="report-export-dialog">
    <div className="report-export-layout">
      <div className="report-export-controls">
        <fieldset className="report-export-scopes"><legend>Export scope</legend>{[['selected', 'Selected Reports'], ['event', 'Reports by Specific Event'], ['range', 'Reports by Date Range']].map(([value, label]) => <label key={value}><input type="radio" name="export-scope" value={value} checked={scope === value} onChange={() => setScope(value)} disabled={busy} />{label}</label>)}</fieldset>
        {scope === 'selected' && <p className="report-hint">{eligible.length} selected report{eligible.length === 1 ? '' : 's'}. Close this dialog to change your selection.</p>}
        {scope === 'event' && <div className="report-field"><span>Specific event</span><EventSelect events={events} value={eventId} onChange={setEventId} disabled={busy} /></div>}
        {scope === 'range' && <div className="task-form report-form-columns"><label>Start Date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={busy} /></label><label>End Date<input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} disabled={busy} /></label></div>}
        {scope === 'range' && startDate && endDate && startDate > endDate && <p role="alert" className="task-form-status error">End date must be on or after start date.</p>}
        <fieldset className="report-export-options"><legend>Include in PDF</legend>{Object.entries(optionLabels).map(([name, label]) => <label key={name}><input type="checkbox" checked={options[name]} disabled={busy} onChange={(event) => setOptions((current) => ({ ...current, [name]: event.target.checked }))} />{label}</label>)}</fieldset>
        <p className="report-export-count" aria-live="polite"><strong>{eligible.length}</strong> report{eligible.length === 1 ? '' : 's'} ready to export</p>
        {error && <p className="task-form-status error" role="alert">{error}</p>}
      </div>
      <div className="report-pdf-preview">{previewIsCurrent ? <><iframe title="Narrative reports PDF preview" src={previewUrl} /><a href={previewUrl} target="_blank" rel="noreferrer">Open PDF preview in a new tab</a></> : <div className="report-preview-empty"><Eye size={35} aria-hidden="true" /><h3>Your report, ready to share.</h3><p>Choose your reports and options, then preview the complete A4 PDF.</p></div>}</div>
    </div>
    <div className="task-modal-actions report-export-actions"><button className="task-secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="task-secondary-button" type="button" disabled={busy || !eligible.length} onClick={() => generate(true)}><Eye size={17} aria-hidden="true" />Preview PDF</button><button className="task-save-button" type="button" disabled={busy || !eligible.length} onClick={() => generate(false)}>{busy ? <LoaderCircle size={17} className="dashboard-spinner" aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}{busy ? 'Preparing PDF…' : 'Generate PDF'}</button></div>
  </ReportDialog>
}
