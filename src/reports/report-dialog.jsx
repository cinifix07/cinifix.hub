import { useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ReportDialog({ title, eyebrow = 'CINIFIX NARRATIVES', children, onClose, busy = false, className = '' }) {
  const titleId = useId()
  return createPortal(<div className="task-alert-backdrop report-dialog-backdrop">
    <section className={`task-alert-modal report-dialog ${className}`} role="dialog" aria-modal="true" aria-busy={busy} aria-labelledby={titleId}>
      <header className="task-modal-header"><div><p className="task-modal-eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2></div><button className="task-modal-close" type="button" onClick={onClose} disabled={busy} aria-label={`Close ${title}`}><X size={19} aria-hidden="true" /></button></header>
      {children}
    </section>
  </div>, document.querySelector('.admin-shell') ?? document.body)
}
