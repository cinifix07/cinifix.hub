import { useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import alertSoundUrl from '../assets/alert.mp3'
import {
  AuditModal,
  BrandLogo,
  formatTaskDate,
  formatTaskDateTime,
  getCurrentMinuteKey,
  getGreeting,
  getTaskStartTime,
  playAlertSound,
  SidebarIcon,
  TaskDashboard,
  TaskModal,
  TaskReminderModal,
  WorkingTaskModal,
} from '../users/users.jsx'
import './admin.css'

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
  {
    title: 'Campaigns',
    icon: (
      <path
        d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6M5.436 13.683A4.001 4.001 0 0 1 7 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 0 1-1.564-.317z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: 'Billing',
    icon: (
      <path
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
  {
    title: 'Business Tools',
    icon: (
      <path
        d="M19 11H5m14 0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2m14 0V9a2 2 0 0 0-2-2M5 11V9a2 2 0 0 1 2-2m0 0V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2M7 7h10"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    ),
  },
]

const bottomNavItems = []

const initialNarrativeForm = {
  narrative: '',
}

const initialUserForm = {
  name: '',
  password: '',
  role: 'user',
}

const TABLE_PAGE_SIZE = 5

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

function BusinessNewsModal({ onClose, onLog }) {
  const narratives = useQuery(api.narratives.list, { limit: 100 })
  const updateNarrative = useMutation(api.narratives.update)
  const removeNarrative = useMutation(api.narratives.remove)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingNarrative, setEditingNarrative] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
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

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await removeNarrative({ narrativeId: deleteTarget._id })
      await onLog?.('Deleted narrative report', deleteTarget.reportDate)
      setDeleteTarget(null)
      setStatus({ type: 'success', text: 'Narrative deleted.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete narrative.',
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
            <h2 id="business-news-title">Narrative Reports</h2>
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
              <h3>Convex Narrative Table</h3>
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
                    <th>Created By</th>
                    <th>Tasks</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {narratives === undefined && (
                    <tr>
                      <td colSpan="6">Loading reports...</td>
                    </tr>
                  )}

                  {narratives !== undefined && narratives.length === 0 && (
                    <tr>
                      <td colSpan="6">No narrative reports saved yet.</td>
                    </tr>
                  )}

                  {visibleNarratives?.map((record) => (
                    <tr key={record._id}>
                      <td data-label="Date">{formatTaskDate(record.reportDate)}</td>
                      <td data-label="Narrative">{record.narrative}</td>
                      <td data-label="Created By">{record.createdBy}</td>
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
                          <button className="task-icon-button danger" type="button" aria-label={`Delete narrative ${record.reportDate}`} onClick={() => setDeleteTarget(record)}>
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

            <TablePagination currentPage={safeCurrentPage} records={narratives} onPageChange={setCurrentPage} />
          </div>
        )}
      </section>

      {deleteTarget !== null && (
        <section className="task-alert-modal audit-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="narrative-delete-title">
          <div className="task-modal-header">
            <div>
              <p className="task-modal-eyebrow">Delete Narrative</p>
              <h2 id="narrative-delete-title">Delete this report?</h2>
            </div>
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}>
              x
            </button>
          </div>
          <p className="task-alert-copy">
            This will permanently delete the narrative for <strong>{formatTaskDate(deleteTarget.reportDate)}</strong>.
          </p>
          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="task-danger-button" type="button" disabled={isSaving} onClick={handleDelete}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function CampaignsModal({ onClose }) {
  const logs = useQuery(api.userLogs.list, { limit: 100 })
  const [currentPage, setCurrentPage] = useState(1)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(logs))
  const visibleLogs = getTablePage(logs, safeCurrentPage)

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-alert-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="campaigns-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Campaigns</p>
            <h2 id="campaigns-title">User Logs</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close user logs modal" onClick={onClose}>
            x
          </button>
        </div>

        <div className="task-table-section users-table-section">
          <div className="task-table-header">
            <h3>All User Records</h3>
            <span>{logs === undefined ? 'Loading...' : `${logs.length} record${logs.length === 1 ? '' : 's'}`}</span>
          </div>

          <div className="task-table-wrap">
            <table className="task-table users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {logs === undefined && (
                  <tr>
                    <td colSpan="4">Loading logs...</td>
                  </tr>
                )}

                {logs !== undefined && logs.length === 0 && (
                  <tr>
                    <td colSpan="4">No user logs saved yet.</td>
                  </tr>
                )}

                {visibleLogs?.map((log) => (
                  <tr key={log._id}>
                    <td data-label="User">{log.userName}</td>
                    <td data-label="Action">{log.action}</td>
                    <td data-label="Details">{log.details || '-'}</td>
                    <td data-label="Created">{formatTaskDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination currentPage={safeCurrentPage} records={logs} onPageChange={setCurrentPage} />
        </div>
      </section>
    </div>
  )
}

function ArchiveModal({ onClose, onLog }) {
  const archivedUsers = useQuery(api.userArchives.list, { limit: 100 })
  const restoreArchive = useMutation(api.userArchives.restore)
  const deleteArchive = useMutation(api.userArchives.remove)
  const [currentPage, setCurrentPage] = useState(1)
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(archivedUsers))
  const visibleArchivedUsers = getTablePage(archivedUsers, safeCurrentPage)

  async function handleRestore() {
    if (!restoreTarget) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await restoreArchive({ archivedUserId: restoreTarget._id })
      await onLog?.('Restored archived user', restoreTarget.name)
      setRestoreTarget(null)
      setStatus({ type: 'success', text: 'Archived user restored.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to restore user.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await deleteArchive({ archivedUserId: deleteTarget._id })
      setDeleteTarget(null)
      setStatus({ type: 'success', text: 'Archived user deleted.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete archived user.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-alert-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Billing</p>
            <h2 id="archive-modal-title">Archive</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close archive modal" onClick={onClose}>
            x
          </button>
        </div>

        {status !== null && (
          <p className={`task-form-status ${status.type}`} role="status">
            {status.text}
          </p>
        )}

        <div className="task-table-section users-table-section">
          <div className="task-table-header">
            <h3>Archived Users</h3>
            <span>
              {archivedUsers === undefined
                ? 'Loading...'
                : `${archivedUsers.length} record${archivedUsers.length === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="task-table-wrap">
            <table className="task-table users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Normalized Name</th>
                  <th>Role</th>
                  <th>Archived</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {archivedUsers === undefined && (
                  <tr>
                    <td colSpan="5">Loading archived users...</td>
                  </tr>
                )}

                {archivedUsers !== undefined && archivedUsers.length === 0 && (
                  <tr>
                    <td colSpan="5">No archived user records yet.</td>
                  </tr>
                )}

                {visibleArchivedUsers?.map((user) => (
                  <tr key={user._id}>
                    <td data-label="Name">{user.name}</td>
                    <td data-label="Normalized Name">{user.normalizedName}</td>
                    <td data-label="Role">{user.role === 'admin' ? 'Admin' : 'User'}</td>
                    <td data-label="Archived">{formatTaskDateTime(user.archivedAt)}</td>
                    <td data-label="Action">
                      <div className="task-table-actions">
                        <button className="task-icon-button restore" type="button" aria-label={`Restore ${user.name}`} onClick={() => setRestoreTarget(user)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 12a9 9 0 1 0 3-6.708" />
                            <path d="M3 4v6h6" />
                            <path d="M12 8v5l3 2" />
                          </svg>
                        </button>
                        <button className="task-icon-button danger" type="button" aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}>
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

          <TablePagination currentPage={safeCurrentPage} records={archivedUsers} onPageChange={setCurrentPage} />
        </div>
      </section>

      {restoreTarget !== null && (
        <section className="task-alert-modal audit-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="restore-user-title">
          <div className="task-modal-header">
            <div>
              <p className="task-modal-eyebrow">Restore User</p>
              <h2 id="restore-user-title">Restore this user?</h2>
            </div>
            <button className="task-modal-close" type="button" aria-label="Close restore modal" onClick={() => setRestoreTarget(null)}>
              x
            </button>
          </div>
          <p className="task-alert-copy">
            This will restore <strong>{restoreTarget.name}</strong> back to the users table.
          </p>
          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={() => setRestoreTarget(null)}>
              Cancel
            </button>
            <button className="task-save-button" type="button" disabled={isSaving} onClick={handleRestore}>
              {isSaving ? 'Restoring...' : 'Restore'}
            </button>
          </div>
        </section>
      )}

      {deleteTarget !== null && (
        <section className="task-alert-modal audit-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-archive-title">
          <div className="task-modal-header">
            <div>
              <p className="task-modal-eyebrow">Delete Archive</p>
              <h2 id="delete-archive-title">Permanently delete?</h2>
            </div>
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}>
              x
            </button>
          </div>
          <p className="task-alert-copy">
            This will permanently delete <strong>{deleteTarget.name}</strong> from the archive logs.
          </p>
          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="task-danger-button" type="button" disabled={isSaving} onClick={handleDelete}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function getUserForm(user) {
  return {
    name: user.name,
    password: '',
    role: user.role || 'user',
  }
}

function BusinessToolsModal({ onClose, onLog }) {
  const users = useQuery(api.users.list, { limit: 100 })
  const createUser = useAction(api.userActions.createUser)
  const updateUser = useAction(api.userActions.updateUser)
  const deleteUser = useMutation(api.users.remove)
  const [mode, setMode] = useState('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(initialUserForm)
  const [status, setStatus] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const safeCurrentPage = Math.min(currentPage, getTablePageCount(users))
  const visibleUsers = getTablePage(users, safeCurrentPage)
  const isEditing = mode === 'edit'
  const isAdding = mode === 'add'

  function openAdd() {
    setMode('add')
    setEditingUser(null)
    setForm(initialUserForm)
    setStatus(null)
  }

  function openEdit(user) {
    setMode('edit')
    setEditingUser(user)
    setForm(getUserForm(user))
    setStatus(null)
  }

  function closeForm() {
    setMode('table')
    setEditingUser(null)
    setForm(initialUserForm)
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

    try {
      if (isEditing && editingUser) {
        const updatePayload = {
          userId: editingUser._id,
          name: form.name,
          role: form.role,
        }

        if (form.password.length > 0) {
          updatePayload.password = form.password
        }

        await updateUser(updatePayload)
        await onLog?.('Updated user', `${form.name} (${form.role})`)
        closeForm()
        setStatus({ type: 'success', text: 'User updated.' })
      } else {
        await createUser({
          name: form.name,
          password: form.password,
          role: form.role,
        })
        await onLog?.('Added user', `${form.name} (${form.role})`)
        closeForm()
        setStatus({ type: 'success', text: 'User added.' })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to save user.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setIsSaving(true)
    setStatus(null)

    try {
      await deleteUser({ userId: deleteTarget._id })
      await onLog?.('Archived user', deleteTarget.name)
      setDeleteTarget(null)
      setStatus({ type: 'success', text: 'User deleted.' })
    } catch (error) {
      setStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to delete user.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="task-modal-backdrop" role="presentation">
      <section className="task-alert-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="users-modal-title">
        <div className="task-modal-header">
          <div>
            <p className="task-modal-eyebrow">Business Tools</p>
            <h2 id="users-modal-title">{isAdding ? 'Add User' : isEditing ? 'Edit User' : 'Users'}</h2>
          </div>
          <button className="task-modal-close" type="button" aria-label="Close business tools modal" onClick={onClose}>
            x
          </button>
        </div>

        {status !== null && (
          <p className={`task-form-status ${status.type}`} role="status">
            {status.text}
          </p>
        )}

        {isAdding || isEditing ? (
          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="Enter user name"
                required
              />
            </label>

            <label>
              <span>{isEditing ? 'New Secret Key' : 'Secret Key'}</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder={isEditing ? 'Leave blank to keep current secret key' : 'Enter secret key'}
                required={isAdding}
              />
            </label>

            <label>
              <span>Role</span>
              <select value={form.role} onChange={(event) => updateField('role', event.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div className="task-modal-actions">
              <button className="task-secondary-button" type="button" onClick={closeForm}>
                Cancel
              </button>
              <button className="task-save-button" type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </form>
        ) : (
          <div className="task-table-section users-table-section">
            <div className="task-table-header">
              <h3>Convex Users Table</h3>
              <span>{users === undefined ? 'Loading...' : `${users.length} user${users.length === 1 ? '' : 's'}`}</span>
            </div>

            <div className="users-table-toolbar">
              <button className="task-save-button" type="button" onClick={openAdd}>
                Add User
              </button>
            </div>

            <div className="task-table-wrap">
              <table className="task-table users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Normalized Name</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users === undefined && (
                    <tr>
                      <td colSpan="5">Loading users...</td>
                    </tr>
                  )}

                  {users !== undefined && users.length === 0 && (
                    <tr>
                      <td colSpan="5">No users saved yet.</td>
                    </tr>
                  )}

                  {visibleUsers?.map((user) => (
                    <tr key={user._id}>
                      <td data-label="Name">{user.name}</td>
                      <td data-label="Normalized Name">{user.normalizedName}</td>
                      <td data-label="Role">{user.role === 'admin' ? 'Admin' : 'User'}</td>
                      <td data-label="Created">{formatTaskDateTime(user._creationTime)}</td>
                      <td data-label="Action">
                        <div className="task-table-actions">
                          <button className="task-icon-button" type="button" aria-label={`Edit ${user.name}`} onClick={() => openEdit(user)}>
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M16.862 4.487 19.5 7.125 8.75 17.875 5.5 18.5l.625-3.25L16.862 4.487z" />
                              <path d="M14.75 6.6 17.4 9.25" />
                            </svg>
                          </button>
                          <button className="task-icon-button danger" type="button" aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}>
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

            <TablePagination currentPage={safeCurrentPage} records={users} onPageChange={setCurrentPage} />
          </div>
        )}
      </section>

      {deleteTarget !== null && (
        <section className="task-alert-modal audit-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="users-delete-title">
          <div className="task-modal-header">
            <div>
              <p className="task-modal-eyebrow">Delete User</p>
              <h2 id="users-delete-title">Delete this user?</h2>
            </div>
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}>
              x
            </button>
          </div>
          <p className="task-alert-copy">
            This will archive <strong>{deleteTarget.name}</strong> from the users table.
          </p>
          <div className="task-modal-actions">
            <button className="task-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className="task-danger-button" type="button" disabled={isSaving} onClick={handleDelete}>
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </section>
      )}
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

export default function Admin({ userName = 'CINIFIX', userRole = 'admin' }) {
  const greeting = getGreeting()
  const completeTask = useMutation(api.tasks.complete)
  const saveNarrative = useMutation(api.narratives.save)
  const createUserLog = useMutation(api.userLogs.create)
  const alertAudioRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [isBusinessNewsModalOpen, setIsBusinessNewsModalOpen] = useState(false)
  const [isBusinessToolsModalOpen, setIsBusinessToolsModalOpen] = useState(false)
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
  const [isCampaignsModalOpen, setIsCampaignsModalOpen] = useState(false)
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

    const [liveDate, currentTime] = currentMinuteKey.split('T')
    const dueTask = tasks.find((task) => {
      const taskStartTime = getTaskStartTime(task)

      return task.status !== 'completed' && task.taskDate === liveDate && taskStartTime === currentTime
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
      await completeTask({ taskId, taskDate: currentDate, createdBy: userName })
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
                        : item.title === 'Campaigns'
                          ? () => setIsCampaignsModalOpen(true)
                          : item.title === 'Billing'
                            ? () => setIsBillingModalOpen(true)
                            : item.title === 'Business Tools'
                              ? () => setIsBusinessToolsModalOpen(true)
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
            <span className="admin-role-label">{userRole === 'admin' ? 'Admin' : 'User'}</span>
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
        <BusinessNewsModal onClose={() => setIsBusinessNewsModalOpen(false)} onLog={logUserAction} />
      )}
      {isBusinessToolsModalOpen && (
        <BusinessToolsModal onClose={() => setIsBusinessToolsModalOpen(false)} onLog={logUserAction} />
      )}
      {isCampaignsModalOpen && <CampaignsModal onClose={() => setIsCampaignsModalOpen(false)} />}
      {isBillingModalOpen && <ArchiveModal onClose={() => setIsBillingModalOpen(false)} onLog={logUserAction} />}
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
