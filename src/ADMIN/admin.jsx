import { useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import alertSoundUrl from '../assets/alert.mp3'
import {
  AuditModal,
  formatTaskDate,
  formatTaskDateTime,
  getCurrentMinuteKey,
  getGreeting,
  getTaskStartTime,
  playAlertSound,
  TaskDashboard,
  TaskModal,
  TaskReminderModal,
  WorkingTaskModal,
} from '../users/users.jsx'
import { DashboardShell } from '../ui/dashboard.jsx'
import { Pencil, Trash2, RotateCcw, X } from 'lucide-react'
import NarrativeReports from '../reports/narrative-reports.jsx'
import './admin.css'

const topNavItems = [
  {
    "title": "Ads Manager"
  },
  {
    "title": "Reporting"
  },
  {
    "title": "Audience"
  },
  {
    "title": "Business News"
  },
  {
    "title": "Campaigns"
  },
  {
    "title": "Billing"
  },
  {
    "title": "Business Tools"
  }
]

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
          <button className="task-modal-close" type="button" aria-label="Close user logs modal" onClick={onClose}><X size={19} aria-hidden="true" /></button>
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
          <button className="task-modal-close" type="button" aria-label="Close archive modal" onClick={onClose}><X size={19} aria-hidden="true" /></button>
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
                          <RotateCcw size={18} aria-hidden="true" />
                        </button>
                        <button className="task-icon-button danger" type="button" aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}>
                          <Trash2 size={18} aria-hidden="true" />
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
            <button className="task-modal-close" type="button" aria-label="Close restore modal" onClick={() => setRestoreTarget(null)}><X size={19} aria-hidden="true" /></button>
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
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}><X size={19} aria-hidden="true" /></button>
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
          <button className="task-modal-close" type="button" aria-label="Close business tools modal" onClick={onClose}><X size={19} aria-hidden="true" /></button>
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
              <h3>User directory</h3>
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
                            <Pencil size={18} aria-hidden="true" />
                          </button>
                          <button className="task-icon-button danger" type="button" aria-label={`Delete ${user.name}`} onClick={() => setDeleteTarget(user)}>
                            <Trash2 size={18} aria-hidden="true" />
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
            <button className="task-modal-close" type="button" aria-label="Close delete modal" onClick={() => setDeleteTarget(null)}><X size={19} aria-hidden="true" /></button>
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
          <button className="task-modal-close" type="button" aria-label="Close narrative report modal" onClick={onClose}><X size={19} aria-hidden="true" /></button>
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
          <button className="task-modal-close" type="button" aria-label="Close success modal" onClick={onClose}><X size={19} aria-hidden="true" /></button>
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

  function handleNavigate(title) {
    setIsTaskModalOpen(title === 'Audience')
    setIsAuditModalOpen(title === 'Reporting')
    setIsBusinessNewsModalOpen(title === 'Business News')
    setIsCampaignsModalOpen(title === 'Campaigns')
    setIsBillingModalOpen(title === 'Billing')
    setIsBusinessToolsModalOpen(title === 'Business Tools')
  }

  const activeNav = isTaskModalOpen ? 'Audience' : isAuditModalOpen ? 'Reporting' : isBusinessNewsModalOpen ? 'Business News' : isCampaignsModalOpen ? 'Campaigns' : isBillingModalOpen ? 'Billing' : isBusinessToolsModalOpen ? 'Business Tools' : 'Ads Manager'

  return (
    <DashboardShell
      userName={userName}
      role={userRole === 'admin' ? 'Admin' : 'User'}
      greeting={greeting}
      items={topNavItems}
      activeNav={activeNav}
      isSidebarOpen={isSidebarOpen}
      setIsSidebarOpen={setIsSidebarOpen}
      onNavigate={handleNavigate}
    >
      <TaskDashboard
        tasks={tasks}
        currentDate={currentDate}
        completionStatus={completionStatus}
        completingTaskId={completingTaskId}
        onCompleteTask={handleCompleteTask}
        onManageTasks={() => setIsTaskModalOpen(true)}
      />

      {isTaskModalOpen && <TaskModal createdBy={userName} onClose={() => setIsTaskModalOpen(false)} />}
      {isAuditModalOpen && <AuditModal createdBy={userName} onClose={() => setIsAuditModalOpen(false)} />}
      {isBusinessNewsModalOpen && (
        <NarrativeReports userName={userName} isAdmin={userRole === 'admin'} onClose={() => setIsBusinessNewsModalOpen(false)} onLog={logUserAction} />
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
    </DashboardShell>
  )
}
