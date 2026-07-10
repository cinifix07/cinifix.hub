/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import alertSoundUrl from '../assets/alert.mp3'
import cinifixLogo from '../assets/cinifix.jpg'
import './users.css'

const topNavItems = [
  {
    title: 'Ads Manager',
    active: true,
    icon: (
      <path
        d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: 'Reporting',
    icon: (
      <path
        d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: 'Audience',
    icon: (
      <path
        d="M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: 'Business News',
    icon: (
      <path
        d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
]

const bottomNavItems = [
  
]

function SidebarIcon({ item, onClick }) {
  return (
    <button
      className={`admin-sidebar-icon${item.active ? ' active' : ''}${item.className ? ` ${item.className}` : ''}`}
      type="button"
      title={item.title}
      aria-label={item.title}
      onClick={onClick}
    >
      <svg
        className="admin-icon"
        fill={item.filled ? 'currentColor' : 'none'}
        stroke={item.filled ? 'none' : 'currentColor'}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {item.icon}
      </svg>
    </button>
  )
}

const initialTaskForm = {
  taskName: '',
  taskDate: '',
  taskStartTime: '',
  taskEndTime: '',
  taskDefinition: '',
}

const initialAuditForm = {
  name: '',
  totalAmount: '',
}

const initialNarrativeForm = {
  narrative: '',
}

const TABLE_PAGE_SIZE = 5

function getAuditForm(record) {
  return {
    name: record.sourceName,
    totalAmount: String(record.totalAmount),
  }
}

function getTablePageCount(records) {
  return Math.max(1, Math.ceil((records?.length ?? 0) / TABLE_PAGE_SIZE))
}

function getTablePage(records, page) {
  if (!records) {
    return records
  }

  const startIndex = (page - 1) * TABLE_PAGE_SIZE

  return records.slice(startIndex, startIndex + TABLE_PAGE_SIZE)
}

function TablePagination({ currentPage, records, onPageChange }) {
  if (!records || records.length <= TABLE_PAGE_SIZE) {
    return null
  }

  const pageCount = getTablePageCount(records)
  const startItem = (currentPage - 1) * TABLE_PAGE_SIZE + 1
  const endItem = Math.min(currentPage * TABLE_PAGE_SIZE, records.length)

  return (
    <div className="table-pagination">
      <span>
        Showing {startItem}-{endItem} of {records.length}
      </span>
      <div className="table-pagination-actions">
        <button
          className="table-pagination-button"
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <strong>
          Page {currentPage} of {pageCount}
        </strong>
        <button
          className="table-pagination-button"
          type="button"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function getAuditTypeLabel(type) {
  return type === 'inflow' ? 'In Flow' : 'Out Flow'
}

function getAuditSummary(records) {
  return records.reduce(
    (summary, record) => {
      if (record.type === 'inflow') {
        summary.inflow += record.totalAmount
      } else {
        summary.outflow += record.totalAmount
      }

      summary.balance = summary.inflow - summary.outflow

      return summary
    },
    { inflow: 0, outflow: 0, balance: 0 },
  )
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value)
}

function generateNarrativesPdf(records) {
  const reportWindow = window.open('', '_blank')

  if (!reportWindow) {
    return
  }

  const rows = records
    .map(
      (record) => `
        <tr>
          <td>${formatTaskDate(record.reportDate)}</td>
          <td>${record.narrative}</td>
          <td>${record.createdBy}</td>
          <td>${record.taskCount}</td>
          <td>${formatTaskDateTime(record.updatedAt || record.createdAt)}</td>
        </tr>
      `,
    )
    .join('')

  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>CINI FIX Narrative Reports</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
          h1 { margin: 0 0 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 24px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>CINI FIX Narrative Reports</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Narrative</th>
              <th>Created By</th>
              <th>Tasks</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `)
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.print()
}

function generateAuditReport(records, summary) {
  const reportWindow = window.open('', '_blank')

  if (!reportWindow) {
    return
  }

  const rows = records
    .map(
      (record) => `
        <tr>
          <td>${getAuditTypeLabel(record.type)}</td>
          <td>${record.sourceName}</td>
          <td>${formatMoney(record.totalAmount)}</td>
          <td>${record.createdBy}</td>
          <td>${formatTaskDateTime(record.createdAt)}</td>
        </tr>
      `,
    )
    .join('')

  reportWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>CINI FIX Money Flow Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
          h1 { margin: 0 0 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 24px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
          th { background: #f3f4f6; }
          .summary { display: flex; gap: 16px; margin-top: 24px; }
          .summary div { border: 1px solid #d1d5db; padding: 12px; }
        </style>
      </head>
      <body>
        <h1>CINI FIX Money Flow Report</h1>
        <p>Generated ${new Date().toLocaleString()}</p>
        <div class="summary">
          <div><strong>In Flow</strong><br>${formatMoney(summary.inflow)}</div>
          <div><strong>Out Flow</strong><br>${formatMoney(summary.outflow)}</div>
          <div><strong>Balance</strong><br>${formatMoney(summary.balance)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Created By</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `)
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.print()
}

function AuditTable({ records, onDelete, onEdit }) {
  const [currentPage, setCurrentPage] = useState(1)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(records))
  const visibleRecords = getTablePage(records, safeCurrentPage)

  return (
    <div className="task-table-section">
      <div className="task-table-header">
        <h3>Convex Audit Table</h3>
        <span>{records === undefined ? 'Loading...' : `${records.length} record${records.length === 1 ? '' : 's'}`}</span>
      </div>

      <div className="task-table-wrap">
        <table className="task-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records === undefined && (
              <tr>
                <td colSpan="5">Loading audit records...</td>
              </tr>
            )}

            {records !== undefined && records.length === 0 && (
              <tr>
                <td colSpan="5">No audit records saved yet.</td>
              </tr>
            )}

            {visibleRecords?.map((record) => (
              <tr key={record._id}>
                <td data-label="Type">{getAuditTypeLabel(record.type)}</td>
                <td data-label="Name">{record.sourceName}</td>
                <td data-label="Amount">{formatMoney(record.totalAmount)}</td>
                <td data-label="Created">{formatTaskDateTime(record.createdAt)}</td>
                <td data-label="Action">
                  <div className="task-table-actions">
                    <button className="task-icon-button" type="button" aria-label={`Edit ${record.sourceName}`} onClick={() => onEdit(record)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16.862 4.487 19.5 7.125 8.75 17.875 5.5 18.5l.625-3.25L16.862 4.487z" />
                        <path d="M14.75 6.6 17.4 9.25" />
                      </svg>
                    </button>
                    <button className="task-icon-button danger" type="button" aria-label={`Delete ${record.sourceName}`} onClick={() => onDelete(record)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M6 7l1 14h10l1-14" />
                        <path d="M9 7V4h6v3" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination currentPage={safeCurrentPage} records={records} onPageChange={setCurrentPage} />
    </div>
  )
}

function getTaskStartTime(task) {
  const taskTime = task.taskStartTime || task.taskTime || ''

  return taskTime.includes(' - ') ? taskTime.split(' - ')[0] : taskTime
}

function getTaskForm(task) {
  return {
    taskName: task.taskName,
    taskDate: task.taskDate,
    taskStartTime: getTaskStartTime(task),
    taskEndTime: task.taskEndTime || '',
    taskDefinition: task.taskDefinition,
  }
}

function TaskActionModal({ action, task, onClose }) {
  const updateTask = useMutation(api.tasks.update)
  const deleteTask = useMutation(api.tasks.remove)
  const [form, setForm] = useState(() => (task ? getTaskForm(task) : initialTaskForm))
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const isEdit = action === 'edit'

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus(null)
  }

  async function handleEditSubmit(event) {
    event.preventDefault()

    if (!task) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await updateTask({
        taskId: task._id,
        ...form,
      })
      onClose()
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update task.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!task) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await deleteTask({ taskId: task._id })
      onClose()
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete task.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-alert-backdrop" role="presentation">
      <section
        className="task-alert-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="task-alert-title"
        aria-describedby="task-alert-description"
      >
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">{isEdit ? 'Edit' : 'Delete'} Task</p>
            <h2 id="task-alert-title">{isEdit ? 'Update this task?' : 'Delete this task?'}</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close alert modal" onClick={onClose}>
            x
          </button>
        </div>

        {isEdit ? (
          <form className="task-form" onSubmit={handleEditSubmit}>
            <p className="task-alert-copy" id="task-alert-description">
              Review the task details below before saving changes.
            </p>

            <label>
              <span>Create Task</span>
              <input
                type="text"
                value={form.taskName}
                onChange={(event) => updateField('taskName', event.target.value)}
                required
              />
            </label>

            <div className="task-form-row">
              <label>
                <span>Calendar Pick</span>
                <input
                  type="date"
                  value={form.taskDate}
                  onChange={(event) => updateField('taskDate', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>Start Time</span>
                <input
                  type="time"
                  value={form.taskStartTime}
                  onChange={(event) => updateField('taskStartTime', event.target.value)}
                  required
                />
              </label>

              <label>
                <span>End Time</span>
                <input
                  type="time"
                  value={form.taskEndTime}
                  onChange={(event) => updateField('taskEndTime', event.target.value)}
                  required
                />
              </label>
            </div>

            <label>
              <span>Task Definition</span>
              <textarea
                value={form.taskDefinition}
                onChange={(event) => updateField('taskDefinition', event.target.value)}
                rows="4"
                required
              />
            </label>

            {status !== null && (
              <p className={`task-form-status ${status.type}`} role="status">
                {status.text}
              </p>
            )}

            <div className="task-modal-actions">
              <button className="task-secondary-button" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="task-save-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="task-alert-copy" id="task-alert-description">
              This will permanently delete <strong>{task?.taskName}</strong>. This action cannot be undone.
            </p>

            {status !== null && (
              <p className={`task-form-status ${status.type}`} role="status">
                {status.text}
              </p>
            )}

            <div className="task-modal-actions">
              <button className="task-secondary-button" type="button" onClick={onClose}>
                Cancel
              </button>
              <button className="task-danger-button" type="button" disabled={isSaving} onClick={handleDelete}>
                {isSaving ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </>
        )}
      </section>

    </div>
  )
}

function TaskModal({ createdBy, onClose }) {
  const createTask = useMutation(api.tasks.create)
  const tasks = useQuery(api.tasks.listByUser, { createdBy, limit: 50 })
  const [form, setForm] = useState(initialTaskForm)
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [taskAction, setTaskAction] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(tasks))
  const visibleTasks = getTablePage(tasks, safeCurrentPage)

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setStatus(null)

    try {
      await createTask({
        ...form,
        createdBy,
      })
      setStatus({ type: 'success', text: 'Task saved successfully.' })
      setForm(initialTaskForm)
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to save task.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Audience</p>
            <h2 id="task-modal-title">Create Task</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close create task modal" onClick={onClose}>
            x
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            <span>Create Task</span>
            <input
              type="text"
              value={form.taskName}
              onChange={(event) => updateField('taskName', event.target.value)}
              placeholder="Enter task name"
              required
            />
          </label>

          <div className="task-form-row">
            <label>
              <span>Calendar Pick</span>
              <input
                type="date"
                value={form.taskDate}
                onChange={(event) => updateField('taskDate', event.target.value)}
                required
              />
            </label>

            <label>
              <span>Start Time</span>
              <input
                type="time"
                value={form.taskStartTime}
                onChange={(event) => updateField('taskStartTime', event.target.value)}
                required
              />
            </label>

            <label>
              <span>End Time</span>
              <input
                type="time"
                value={form.taskEndTime}
                onChange={(event) => updateField('taskEndTime', event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            <span>Task Definition</span>
            <textarea
              value={form.taskDefinition}
              onChange={(event) => updateField('taskDefinition', event.target.value)}
              placeholder="Describe the task"
              rows="5"
              required
            />
          </label>

          {status !== null && (
            <p className={`task-form-status ${status.type}`} role="status">
              {status.text}
            </p>
          )}

          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="task-save-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>

        <div className="task-table-section">
          <div className="task-table-header">
            <h3>Tasks</h3>
            <span>{tasks === undefined ? 'Loading...' : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`}</span>
          </div>

          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Date</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Definition</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tasks === undefined && (
                  <tr>
                    <td colSpan="7">Loading tasks...</td>
                  </tr>
                )}

                {tasks !== undefined && tasks.length === 0 && (
                  <tr>
                    <td colSpan="7">No tasks saved yet.</td>
                  </tr>
                )}

                {visibleTasks?.map((task) => (
                  <tr key={task._id}>
                    <td data-label="Task">{task.taskName}</td>
                    <td data-label="Date">{task.taskDate}</td>
                    <td data-label="Start">{task.taskStartTime || task.taskTime || '-'}</td>
                    <td data-label="End">{task.taskEndTime || '-'}</td>
                    <td data-label="Definition">{task.taskDefinition}</td>
                    <td data-label="Status">
                      <span className={`task-status-pill ${task.status === 'completed' ? 'completed' : 'pending'}`}>
                        {task.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td data-label="Action">
                      <div className="task-table-actions">
                        <button
                          className="task-icon-button"
                          type="button"
                          aria-label={`Edit ${task.taskName}`}
                          title="Edit"
                          onClick={() => setTaskAction({ type: 'edit', task })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M16.862 4.487 19.5 7.125 8.75 17.875 5.5 18.5l.625-3.25L16.862 4.487z" />
                            <path d="M14.75 6.6 17.4 9.25" />
                          </svg>
                        </button>
                        <button
                          className="task-icon-button danger"
                          type="button"
                          aria-label={`Delete ${task.taskName}`}
                          title="Delete"
                          onClick={() => setTaskAction({ type: 'delete', task })}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 7h16" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M6 7l1 14h10l1-14" />
                            <path d="M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination currentPage={safeCurrentPage} records={tasks} onPageChange={setCurrentPage} />
        </div>
      </section>

      {taskAction !== null && (
        <TaskActionModal
          action={taskAction.type}
          task={taskAction.task}
          onClose={() => setTaskAction(null)}
        />
      )}
    </div>
  )
}

function AuditModal({ createdBy, onClose }) {
  const createInflow = useMutation(api.audit.createInflow)
  const createOutflow = useMutation(api.audit.createOutflow)
  const updateAudit = useMutation(api.audit.update)
  const deleteAudit = useMutation(api.audit.remove)
  const auditRecords = useQuery(api.audit.listByUser, { createdBy, limit: 100 })
  const [mode, setMode] = useState('menu')
  const [form, setForm] = useState(initialAuditForm)
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const activeAuditType = mode === 'edit' ? selectedAudit?.type : mode
  const isInflow = activeAuditType === 'inflow'
  const isOutflow = activeAuditType === 'outflow'
  const summary = getAuditSummary(auditRecords ?? [])

  function openForm(nextMode) {
    setMode(nextMode)
    setForm(initialAuditForm)
    setSelectedAudit(null)
    setStatus(null)
  }

  function openEdit(record) {
    setSelectedAudit(record)
    setForm(getAuditForm(record))
    setMode('edit')
    setStatus(null)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setStatus(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    setStatus(null)

    const totalAmount = Number(form.totalAmount)

    try {
      if (mode === 'edit' && selectedAudit) {
        await updateAudit({
          auditId: selectedAudit._id,
          type: selectedAudit.type,
          sourceName: form.name,
          totalAmount,
          createdBy,
        })
      } else if (isInflow) {
        await createInflow({
          moneyFrom: form.name,
          totalAmount,
          createdBy,
        })
      } else {
        await createOutflow({
          expenseName: form.name,
          totalAmount,
          createdBy,
        })
      }

      setMode('success')
      setForm(initialAuditForm)
      setSelectedAudit(null)
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to save audit data.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteAudit() {
    if (!deleteTarget) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await deleteAudit({ auditId: deleteTarget._id })
      setDeleteTarget(null)
      setStatus({ type: 'success', text: 'Audit record deleted.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete audit record.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-alert-modal audit-modal" role="dialog" aria-modal="true" aria-labelledby="audit-modal-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Reporting</p>
            <h2 id="audit-modal-title">
              {mode === 'menu' && 'Money Flow'}
              {mode === 'edit' && `Edit ${selectedAudit?.type === 'inflow' ? 'In Flow' : 'Out Flow'} Money`}
              {mode !== 'edit' && isInflow && 'In Flow Money'}
              {mode !== 'edit' && isOutflow && 'Out Flow Money'}
              {mode === 'success' && 'Saved Success'}
            </h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close reporting modal" onClick={onClose}>
            x
          </button>
        </div>

        {mode === 'menu' && (
          <>
            <div className="audit-choice-grid">
              <button className="audit-choice-button inflow" type="button" onClick={() => openForm('inflow')}>
                <span>In Flow Money</span>
              </button>
              <button className="audit-choice-button outflow" type="button" onClick={() => openForm('outflow')}>
                <span>Out Flow Money</span>
              </button>
            </div>

            <div className="audit-summary-grid">
              <div className="audit-summary-card">
                <span>Grand Total In Flow</span>
                <strong>{formatMoney(summary.inflow)}</strong>
              </div>
              <div className="audit-summary-card">
                <span>Grand Total Out Flow</span>
                <strong>{formatMoney(summary.outflow)}</strong>
              </div>
              <div className={`audit-summary-card ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
                <span>{summary.balance >= 0 ? 'Balance Positive' : 'Balance Negative'}</span>
                <strong>{formatMoney(summary.balance)}</strong>
              </div>
            </div>

            <button
              className="task-save-button task-wide-button"
              type="button"
              disabled={!auditRecords || auditRecords.length === 0}
              onClick={() => generateAuditReport(auditRecords ?? [], summary)}
            >
              Generate Report PDF
            </button>

            {status !== null && (
              <p className={`task-form-status ${status.type}`} role="status">
                {status.text}
              </p>
            )}

            <AuditTable records={auditRecords} onDelete={setDeleteTarget} onEdit={openEdit} />
          </>
        )}

        {(isInflow || isOutflow || mode === 'edit') && (
          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              <span>{isInflow ? 'Money From' : 'Expense Name'}</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder={isInflow ? 'Enter money source' : 'Enter expense name'}
                required
              />
            </label>

            <label>
              <span>Total Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.totalAmount}
                onChange={(event) => updateField('totalAmount', event.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            {status !== null && (
              <p className={`task-form-status ${status.type}`} role="status">
                {status.text}
              </p>
            )}

            <div className="task-modal-actions">
              <button className="task-secondary-button" type="button" onClick={() => setMode('menu')}>
                Back
              </button>
              <button className="task-save-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : isInflow ? 'Save' : 'Expense'}
              </button>
            </div>
          </form>
        )}

        {mode === 'success' && (
          <div className="audit-success-panel">
            <div className="audit-success-icon" aria-hidden="true">
              ✓
            </div>
            <p className="task-alert-copy">Audit data saved successfully.</p>
            <button className="task-save-button task-wide-button" type="button" onClick={() => setMode('menu')}>
              Done
            </button>
          </div>
        )}
      </section>

      {deleteTarget !== null && (
        <section
          className="task-alert-modal audit-delete-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="audit-delete-title"
          aria-describedby="audit-delete-description"
        >
          <div className="task-modal-header">
            <div>
              <p className="task-modal-eyebrow">Delete Audit</p>
              <h2 id="audit-delete-title">Delete this record?</h2>
            </div>
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}>
              x
            </button>
          </div>
          <p className="task-alert-copy" id="audit-delete-description">
            This will permanently delete <strong>{deleteTarget.sourceName}</strong> from the audit table.
          </p>
          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="task-danger-button" type="button" disabled={isSaving} onClick={handleDeleteAudit}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function formatTaskDate(dateValue) {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTaskDateTime(timestamp) {
  if (!timestamp) {
    return '-'
  }

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getLocalDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getLocalTimeValue(date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function getCurrentMinuteKey() {
  const now = new Date()

  return `${getLocalDateValue(now)}T${getLocalTimeValue(now)}`
}

function playAlertSound(audio) {
  if (!audio) {
    return
  }

  audio.currentTime = 0
  audio.play().catch(() => {})
}

function TaskDetail({ label, value }) {
  return (
    <div className="task-card-detail">
      <dt>{label}</dt>
      <dd>{value || '-'}</dd>
    </div>
  )
}

function BusinessNewsModal({ createdBy, onClose, onLog }) {
  const narratives = useQuery(api.narratives.listByUser, { createdBy, limit: 100 })
  const updateNarrative = useMutation(api.narratives.update)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingNarrative, setEditingNarrative] = useState(null)
  const [form, setForm] = useState(initialNarrativeForm)
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(narratives))
  const visibleNarratives = getTablePage(narratives, safeCurrentPage)

  function openEdit(record) {
    setEditingNarrative(record)
    setForm({ narrative: record.narrative })
    setStatus(null)
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!editingNarrative) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await updateNarrative({
        narrativeId: editingNarrative._id,
        reportDate: editingNarrative.reportDate,
        createdBy: editingNarrative.createdBy,
        taskCount: editingNarrative.taskCount,
        narrative: form.narrative,
      })
      await onLog?.('Updated narrative report', editingNarrative.reportDate)
      setEditingNarrative(null)
      setForm(initialNarrativeForm)
      setStatus({ type: 'success', text: 'Narrative updated.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to update narrative.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-alert-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="business-news-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Business News</p>
            <h2 id="business-news-title">My Narrative Reports</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close narrative reports modal" onClick={onClose}>
            x
          </button>
        </div>

        {status !== null && (
          <p className={`task-form-status ${status.type}`} role="status">
            {status.text}
          </p>
        )}

        {editingNarrative !== null ? (
          <form className="task-form" onSubmit={handleSave}>
            <label>
              <span>Narrative Report</span>
              <textarea
                rows="6"
                value={form.narrative}
                onChange={(event) => setForm({ narrative: event.target.value })}
                required
              />
            </label>

            <div className="task-modal-actions">
              <button className="task-secondary-button" type="button" onClick={() => setEditingNarrative(null)}>
                Cancel
              </button>
              <button className="task-save-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="task-table-section users-table-section">
            <div className="task-table-header">
              <h3>My Narrative Table</h3>
              <span>
                {narratives === undefined
                  ? 'Loading...'
                  : `${narratives.length} report${narratives.length === 1 ? '' : 's'}`}
              </span>
            </div>

            <div className="users-table-toolbar">
              <button
                className="task-save-button"
                type="button"
                disabled={!narratives || narratives.length === 0}
                onClick={() => generateNarrativesPdf(narratives ?? [])}
              >
                Save PDF
              </button>
            </div>

            <div className="task-table-wrap">
              <table className="task-table users-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Narrative</th>
                    <th>Tasks</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {narratives === undefined && (
                    <tr>
                      <td colSpan="5">Loading reports...</td>
                    </tr>
                  )}

                  {narratives !== undefined && narratives.length === 0 && (
                    <tr>
                      <td colSpan="5">No narrative reports saved yet.</td>
                    </tr>
                  )}

                  {visibleNarratives?.map((record) => (
                    <tr key={record._id}>
                      <td data-label="Date">{formatTaskDate(record.reportDate)}</td>
                      <td data-label="Narrative">{record.narrative}</td>
                      <td data-label="Tasks">{record.taskCount}</td>
                      <td data-label="Created">{formatTaskDateTime(record.updatedAt || record.createdAt)}</td>
                      <td data-label="Action">
                        <div className="task-table-actions">
                          <button className="task-icon-button" type="button" aria-label={`Edit narrative ${record.reportDate}`} onClick={() => openEdit(record)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M16.862 4.487 19.5 7.125 8.75 17.875 5.5 18.5l.625-3.25L16.862 4.487z" />
                              <path d="M14.75 6.6 17.4 9.25" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePagination currentPage={safeCurrentPage} records={narratives} onPageChange={setCurrentPage} />
          </div>
        )}
      </section>
    </div>
  )
}

function TaskReminderModal({ task, onStart }) {
  return (
    <div className="task-alert-backdrop" role="presentation">
      <section
        className="task-alert-modal task-reminder-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="task-reminder-title"
        aria-describedby="task-reminder-description"
      >
        <div className="task-reminder-icon" aria-hidden="true">
          !
        </div>
        <p className="task-modal-eyebrow">Task Reminder</p>
        <h2 id="task-reminder-title">Work your task now</h2>
        <p className="task-alert-copy" id="task-reminder-description">
          <strong>{task.taskName}</strong> starts at {getTaskStartTime(task) || 'now'}.
        </p>
        <button className="task-save-button task-wide-button" type="button" onClick={onStart}>
          Work My Task
        </button>
      </section>
    </div>
  )
}

function WorkingTaskModal({ task, isCompleting, onComplete }) {
  return (
    <div className="task-alert-backdrop" role="presentation">
      <section
        className="task-alert-modal task-working-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-working-title"
      >
        <p className="task-modal-eyebrow">Working</p>
        <h2 id="task-working-title">{task.taskName}</h2>
        <p className="task-alert-copy">{task.taskDefinition}</p>

        <dl className="task-working-details">
          <TaskDetail label="Task Date" value={formatTaskDate(task.taskDate)} />
          <TaskDetail label="Start Time" value={getTaskStartTime(task)} />
          <TaskDetail label="End Time" value={task.taskEndTime} />
          <TaskDetail label="Created By" value={task.createdBy} />
        </dl>

        <button className="task-complete-button" type="button" disabled={isCompleting} onClick={onComplete}>
          {isCompleting ? 'Completing...' : 'Complete Task'}
        </button>
      </section>
    </div>
  )
}

function NarrativeReportModal({ currentDate, existingNarrative = '', isSaving, onClose, onSave, taskCount }) {
  const [form, setForm] = useState(() => ({
    narrative: existingNarrative,
  }))
  const [status, setStatus] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus(null)

    const result = await onSave(form.narrative)

    if (result.ok) {
      return
    }

    setStatus({ type: 'error', text: result.message || 'Unable to save narrative report.' })
  }

  return (
    <div className="task-alert-backdrop" role="presentation">
      <section className="task-alert-modal" role="dialog" aria-modal="true" aria-labelledby="narrative-report-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Narrative Report</p>
            <h2 id="narrative-report-title">Create a narrative report for your works today</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close narrative report modal" onClick={onClose}>
            x
          </button>
        </div>

        <p className="task-alert-copy">
          All {taskCount} tasks for {formatTaskDate(currentDate)} are completed. Write your summary for today here.
        </p>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            <span>Narrative</span>
            <textarea
              rows="6"
              value={form.narrative}
              onChange={(event) => {
                setForm({ narrative: event.target.value })
                setStatus(null)
              }}
              placeholder="Describe your work today."
              required
            />
          </label>

          {status !== null && (
            <p className={`task-form-status ${status.type}`} role="status">
              {status.text}
            </p>
          )}

          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={onClose}>
              Close
            </button>
            <button className="task-save-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Narrative'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function NarrativeSuccessModal({ onClose }) {
  return (
    <div className="task-alert-backdrop" role="presentation">
      <section className="task-alert-modal" role="dialog" aria-modal="true" aria-labelledby="narrative-success-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Narrative Report</p>
            <h2 id="narrative-success-title">Saved Success</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close success modal" onClick={onClose}>
            x
          </button>
        </div>

        <p className="task-alert-copy">Your narrative report was saved successfully.</p>

        <div className="task-modal-actions">
          <button className="task-save-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  )
}

function TaskDashboard({ tasks, currentDate, onCompleteTask, completingTaskId, completionStatus }) {
  const taskCount = tasks?.length ?? 0

  return (
    <section className="admin-content" data-purpose="task-dashboard">
      <div className="task-dashboard">
        <div className="task-dashboard-header">
          <div>
            <p className="task-dashboard-eyebrow">Daily Task Monitoring</p>
            <h1>Tasks</h1>
          </div>

        </div>

        {completionStatus !== null && (
          <p className={`task-form-status ${completionStatus.type}`} role="status">
            {completionStatus.text}
          </p>
        )}

        {tasks === undefined && (
          <div className="task-dashboard-empty">
            <div className="admin-illustration-wrap">
              <EmptyStateIllustration />
            </div>
            <h2>Loading tasks...</h2>
            <p>Fetching the latest tasks.</p>
          </div>
        )}

        {tasks !== undefined && taskCount === 0 && (
          <div className="task-dashboard-empty">
            <div className="admin-illustration-wrap">
              <EmptyStateIllustration />
            </div>
            <h2>No tasks for today</h2>
            <p>No saved tasks match {formatTaskDate(currentDate)}.</p>
          </div>
        )}

        {tasks !== undefined && taskCount > 0 && (
          <div className="task-card-grid" aria-label="Convex tasks">
            {tasks.map((task) => {
              const isCompleted = task.status === 'completed'
              const isCompleting = completingTaskId === task._id

              return (
                <article className="task-card" key={task._id}>
                  <div className="task-card-header">
                    <div>
                      <p className="task-card-kicker">{formatTaskDate(task.taskDate)}</p>
                      <h2>{task.taskName}</h2>
                    </div>
                    <span className={`task-status-pill ${isCompleted ? 'completed' : 'pending'}`}>
                      {isCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </div>

                  <p className="task-card-definition">{task.taskDefinition}</p>

                  <dl className="task-card-details">
                    <TaskDetail label="Task Date" value={formatTaskDate(task.taskDate)} />
                    <TaskDetail label="Start Time" value={getTaskStartTime(task)} />
                    <TaskDetail label="End Time" value={task.taskEndTime} />
                    <TaskDetail label="Created By" value={task.createdBy} />
                    <TaskDetail label="Created" value={formatTaskDateTime(task._creationTime)} />
                    <TaskDetail label="Completed" value={formatTaskDateTime(task.completedAt)} />
                  </dl>

                  <button
                    className={`task-complete-button ${isCompleted ? 'completed' : ''}`}
                    type="button"
                    disabled={isCompleted || isCompleting}
                    onClick={() => onCompleteTask(task._id)}
                  >
                    {isCompleted ? 'Completed' : isCompleting ? 'Completing...' : 'Complete Task'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function BrandLogo({ isExpanded = false, onClick }) {
  return (
    <button
      className="admin-brand"
      type="button"
      aria-label={isExpanded ? 'Hide sidebar buttons' : 'Show sidebar buttons'}
      aria-expanded={isExpanded}
      onClick={onClick}
    >
      <img className="admin-brand-icon" src={cinifixLogo} alt="CINI FIX" />
    </button>
  )
}

function EmptyStateIllustration() {
  return (
    <svg className="admin-empty-illustration" fill="none" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
      <path d="M180 80h10v30h-10z" fill="#E5E7EB" />
      <circle cx="185" cy="70" r="15" stroke="#E5E7EB" strokeWidth="4" />
      <path d="M220 50h10v50h-10z" fill="#F3F4F6" stroke="#E5E7EB" strokeDasharray="4 4" />
      <circle cx="225" cy="40" r="15" stroke="#E5E7EB" strokeDasharray="4 4" strokeWidth="2" />

      <g transform="translate(240, 60)">
        <rect fill="#4B5563" height="40" rx="2" width="12" x="25" y="50" />
        <rect fill="#4B5563" height="40" rx="2" width="12" x="10" y="50" />
        <path d="M10 20h30v35H10z" fill="#6366F1" />
        <circle cx="25" cy="15" fill="#FCD34D" r="8" />
        <rect fill="#FCD34D" height="8" rx="4" transform="rotate(-15 35 25)" width="20" x="35" y="25" />
      </g>

      <g transform="translate(260, 45) rotate(-20)">
        <circle cx="20" cy="20" fill="#9CA3AF" r="10" />
        <rect fill="#9CA3AF" height="8" width="30" x="30" y="16" />
      </g>
    </svg>
  )
}

function getGreeting() {
  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Good Morning'
  }

  if (hour < 18) {
    return 'Good Afternoon'
  }

  return 'Good Evening'
}

export {
  SidebarIcon,
  TaskModal,
  AuditModal,
  TaskDashboard,
  BrandLogo,
  TaskReminderModal,
  WorkingTaskModal,
  getGreeting,
  getCurrentMinuteKey,
  playAlertSound,
  getTaskStartTime,
  formatTaskDate,
  formatTaskDateTime,
  getAuditForm,
  getAuditSummary,
  formatMoney,
  generateAuditReport,
  AuditTable,
  TaskDetail,
}

export default function Admin({ userName = 'CINIFIX' }) {
  const greeting = getGreeting()
  const completeTask = useMutation(api.tasks.complete)
  const saveNarrative = useMutation(api.narratives.save)
  const createUserLog = useMutation(api.userLogs.create)
  const alertAudioRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isBusinessNewsModalOpen, setIsBusinessNewsModalOpen] = useState(false)
  const [isNarrativeModalOpen, setIsNarrativeModalOpen] = useState(false)
  const [isNarrativeSuccessOpen, setIsNarrativeSuccessOpen] = useState(false)
  const [isNarrativeSaving, setIsNarrativeSaving] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState(null)
  const [completionStatus, setCompletionStatus] = useState(null)
  const [currentMinuteKey, setCurrentMinuteKey] = useState(() => getCurrentMinuteKey())
  const [reminderTask, setReminderTask] = useState(null)
  const [workingTask, setWorkingTask] = useState(null)
  const shownReminderKeysRef = useRef(new Set())
  const dismissedNarrativeDatesRef = useRef(new Set())
  const savedNarrativeDatesRef = useRef(new Set())
  const narrativeReminderTimeoutRef = useRef(null)
  const [currentDate] = currentMinuteKey.split('T')
  const tasks = useQuery(api.tasks.listByDateForUser, { taskDate: currentDate, createdBy: userName, limit: 50 })
  const savedNarrative = useQuery(api.narratives.getByDate, {
    reportDate: currentDate,
    createdBy: userName,
  })
  const allTodayTasksComplete =
    tasks !== undefined &&
    tasks.length > 0 &&
    tasks.every((task) => task.status === 'completed')

  const activeReminderTask =
    reminderTask !== null &&
    (tasks === undefined || tasks.some((task) => task._id === reminderTask._id && task.status !== 'completed'))
      ? reminderTask
      : null

  const activeWorkingTask =
    workingTask !== null &&
    (tasks === undefined || tasks.some((task) => task._id === workingTask._id && task.status !== 'completed'))
      ? workingTask
      : null

  useEffect(() => {
    alertAudioRef.current = new Audio(alertSoundUrl)
    alertAudioRef.current.preload = 'auto'

    return () => {
      alertAudioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    const updateCurrentMinute = () => setCurrentMinuteKey(getCurrentMinuteKey())
    const timerId = window.setInterval(updateCurrentMinute, 1000)

    updateCurrentMinute()

    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    if (!tasks || reminderTask !== null || workingTask !== null) {
      return
    }

    const [currentDate, currentTime] = currentMinuteKey.split('T')
    const dueTask = tasks.find((task) => {
      const taskStartTime = getTaskStartTime(task)

      return (
        task.status !== 'completed' &&
        task.taskDate === currentDate &&
        taskStartTime === currentTime
      )
    })

    if (!dueTask) {
      return
    }

    const reminderKey = `${dueTask._id}-${dueTask.taskDate}-${getTaskStartTime(dueTask)}`

    if (shownReminderKeysRef.current.has(reminderKey)) {
      return
    }

    shownReminderKeysRef.current.add(reminderKey)
    window.setTimeout(() => setReminderTask(dueTask), 0)

    const audio = alertAudioRef.current

    if (audio) {
      playAlertSound(audio)
    }
  }, [currentMinuteKey, reminderTask, tasks, workingTask])

  useEffect(() => {
    if (activeReminderTask === null) {
      return undefined
    }

    const timerId = window.setInterval(() => {
      playAlertSound(alertAudioRef.current)
    }, 120000)

    return () => window.clearInterval(timerId)
  }, [activeReminderTask])

  useEffect(() => {
    if (
      !allTodayTasksComplete ||
      savedNarrative === undefined ||
      savedNarrative !== null ||
      isNarrativeModalOpen ||
      isNarrativeSuccessOpen ||
      savedNarrativeDatesRef.current.has(currentDate) ||
      dismissedNarrativeDatesRef.current.has(currentDate)
    ) {
      return
    }

    window.setTimeout(() => setIsNarrativeModalOpen(true), 0)
  }, [allTodayTasksComplete, currentDate, isNarrativeModalOpen, isNarrativeSuccessOpen, savedNarrative])

  useEffect(() => {
    if (savedNarrative === undefined) {
      return
    }

    if (savedNarrative === null) {
      savedNarrativeDatesRef.current.delete(currentDate)
      return
    }

    savedNarrativeDatesRef.current.add(currentDate)
  }, [currentDate, savedNarrative])

  useEffect(() => {
    return () => {
      if (narrativeReminderTimeoutRef.current !== null) {
        window.clearTimeout(narrativeReminderTimeoutRef.current)
      }
    }
  }, [])

  async function logUserAction(action, details = '') {
    try {
      await createUserLog({
        userName,
        action,
        details,
      })
    } catch {
      // Logs should not interrupt the main workflow.
    }
  }

  async function handleCompleteTask(taskId) {
    setCompletingTaskId(taskId)
    setCompletionStatus(null)
    const completedTask = tasks?.find((task) => task._id === taskId)

    try {
      await completeTask({ taskId })
      await logUserAction('Completed task', completedTask?.taskName ?? taskId)
      setCompletionStatus({ type: 'success', text: 'Task marked as completed.' })
      setReminderTask(null)
      setWorkingTask(null)
      return true
    } catch (error) {
      setCompletionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to complete task.',
      })
      return false
    } finally {
      setCompletingTaskId(null)
    }
  }

  function handleStartWorkingTask() {
    if (!activeReminderTask) {
      return
    }

    setWorkingTask(activeReminderTask)
    setReminderTask(null)
  }

  function scheduleNarrativeReminder(dateToRemind) {
    if (narrativeReminderTimeoutRef.current !== null) {
      window.clearTimeout(narrativeReminderTimeoutRef.current)
    }

    narrativeReminderTimeoutRef.current = window.setTimeout(() => {
      narrativeReminderTimeoutRef.current = null
      dismissedNarrativeDatesRef.current.delete(dateToRemind)

      if (savedNarrativeDatesRef.current.has(dateToRemind)) {
        return
      }

      if (getCurrentMinuteKey().split('T')[0] !== dateToRemind) {
        return
      }

      setIsNarrativeModalOpen(true)
    }, 60000)
  }

  function handleCloseNarrativeModal() {
    dismissedNarrativeDatesRef.current.add(currentDate)
    setIsNarrativeModalOpen(false)
    scheduleNarrativeReminder(currentDate)
  }

  async function handleSaveNarrative(narrative) {
    setIsNarrativeSaving(true)

    try {
      if (narrativeReminderTimeoutRef.current !== null) {
        window.clearTimeout(narrativeReminderTimeoutRef.current)
        narrativeReminderTimeoutRef.current = null
      }

      await saveNarrative({
        reportDate: currentDate,
        narrative,
        createdBy: userName,
        taskCount: tasks?.length ?? 0,
      })
      await logUserAction('Saved narrative report', formatTaskDate(currentDate))
      savedNarrativeDatesRef.current.add(currentDate)
      dismissedNarrativeDatesRef.current.add(currentDate)
      setIsNarrativeModalOpen(false)
      setIsNarrativeSuccessOpen(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unable to save narrative report.',
      }
    } finally {
      setIsNarrativeSaving(false)
    }
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${isSidebarOpen ? ' expanded' : ' collapsed'}`} data-purpose="main-navigation">
        <BrandLogo isExpanded={isSidebarOpen} onClick={() => setIsSidebarOpen((current) => !current)} />

        {isSidebarOpen && (
          <nav className="admin-sidebar-nav" aria-label="Primary">
            {topNavItems.map((item) => (
              <SidebarIcon
                item={item}
                key={item.title}
                onClick={
                  item.title === 'Audience'
                    ? () => setIsTaskModalOpen(true)
                    : item.title === 'Reporting'
                      ? () => setIsAuditModalOpen(true)
                      : item.title === 'Business News'
                        ? () => setIsBusinessNewsModalOpen(true)
                      : undefined
                }
              />
            ))}
          </nav>
        )}

        {isSidebarOpen && (
          <nav className="admin-sidebar-nav bottom" aria-label="Secondary">
            {bottomNavItems.map((item) => (
              <SidebarIcon item={item} key={item.title} />
            ))}
          </nav>
        )}
      </aside>

      <main className="admin-workspace">
        <header className="admin-topbar" data-purpose="top-navigation-bar">
          <p className="admin-greeting">
            Hello {userName}, {greeting}!
          </p>
        </header>

        <TaskDashboard
          tasks={tasks}
          currentDate={currentDate}
          completionStatus={completionStatus}
          completingTaskId={completingTaskId}
          onCompleteTask={handleCompleteTask}
        />
      </main>

      {isTaskModalOpen && <TaskModal createdBy={userName} onClose={() => setIsTaskModalOpen(false)} />}
      {isAuditModalOpen && <AuditModal createdBy={userName} onClose={() => setIsAuditModalOpen(false)} />}
      {isBusinessNewsModalOpen && (
        <BusinessNewsModal createdBy={userName} onClose={() => setIsBusinessNewsModalOpen(false)} onLog={logUserAction} />
      )}
      {isNarrativeModalOpen && (
        <NarrativeReportModal
          key={`${currentDate}-${savedNarrative?._id ?? 'new'}`}
          currentDate={currentDate}
          existingNarrative={savedNarrative?.narrative ?? ''}
          isSaving={isNarrativeSaving}
          onClose={handleCloseNarrativeModal}
          onSave={handleSaveNarrative}
          taskCount={tasks?.length ?? 0}
        />
      )}
      {isNarrativeSuccessOpen && <NarrativeSuccessModal onClose={() => setIsNarrativeSuccessOpen(false)} />}
      {activeReminderTask !== null && <TaskReminderModal task={activeReminderTask} onStart={handleStartWorkingTask} />}
      {activeWorkingTask !== null && (
        <WorkingTaskModal
          task={activeWorkingTask}
          isCompleting={completingTaskId === activeWorkingTask._id}
          onComplete={() => handleCompleteTask(activeWorkingTask._id)}
        />
      )}
    </div>
  )
}
