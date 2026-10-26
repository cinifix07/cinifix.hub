/* eslint-disable react-refresh/only-export-components -- Isolated verification entry point. */
/* Local UI fixture: no authentication, Convex requests, or production data. */
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardDialog, DashboardShell } from '../src/ui/dashboard.jsx'
import { TaskDashboard } from '../src/users/users.jsx'

const today = '2026-10-26'
const fixtureTasks = [
  { _id: 'fixture-1', taskName: 'Review the daily task schedule', taskDefinition: 'Review the priorities for today and confirm that each scheduled task has a clear next step. Use the task details view to read the complete description and review the schedule before you begin.', taskWeekdays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], taskStartTime: '09:00', taskEndTime: '10:00', createdBy: 'CINIFIX', status: 'pending' },
  { _id: 'fixture-2', taskName: 'Organize allowance records', taskDefinition: 'Keep your allowance records up to date and review today’s entries.', taskWeekdays: ['monday', 'wednesday', 'friday'], taskStartTime: '13:00', taskEndTime: '14:00', createdBy: 'CINIFIX', status: 'pending' },
  { _id: 'fixture-3', taskName: 'Prepare the weekly narrative', taskDefinition: 'Collect the highlights and completed work for the weekly narrative report.', taskWeekdays: ['monday'], taskStartTime: '15:00', taskEndTime: '16:00', createdBy: 'CINIFIX', status: 'completed', completedAt: Date.parse('2026-10-26T08:00:00Z') },
].map((task) => ({ ...task, taskStartDate: today, taskEndDate: '2026-10-30', _creationTime: Date.parse('2026-10-25T01:00:00Z') }))

function Preview() {
  const [tasks, setTasks] = useState(fixtureTasks)
  const [expanded, setExpanded] = useState(true)
  const [active, setActive] = useState('Ads Manager')
  const [pending, setPending] = useState(null)
  const [status, setStatus] = useState(null)
  const role = new URLSearchParams(window.location.search).get('role') === 'user' ? 'User' : 'Admin'
  const items = ['Ads Manager', 'Reporting', 'Audience', 'Business News', ...(role === 'Admin' ? ['Campaigns', 'Billing', 'Business Tools'] : [])].map((title) => ({ title }))
  async function complete(taskId) {
    setPending(taskId)
    setStatus(null)
    await new Promise((resolve) => window.setTimeout(resolve, 800))
    setTasks((current) => current.map((task) => task._id === taskId ? { ...task, status: 'completed', completedAt: Date.now() } : task))
    setPending(null)
    setStatus({ type: 'success', text: 'Sample task completed. This is an isolated UI check.' })
    return true
  }
  return <DashboardShell userName="CINIFIX" role={role} greeting="Good Evening" items={items} activeNav={active} onNavigate={setActive} isSidebarOpen={expanded} setIsSidebarOpen={setExpanded}>
    <TaskDashboard tasks={tasks} currentDate={today} onCompleteTask={complete} completingTaskId={pending} completionStatus={status} onManageTasks={() => setActive('Audience')} />
    {active !== 'Ads Manager' && <DashboardDialog title="Isolated UI preview" eyebrow={active} onClose={() => setActive('Ads Manager')}><p className="task-alert-copy">This fixture checks navigation and dialog presentation. Production dialogs retain their existing data and handlers.</p><div className="task-modal-actions"><button className="task-secondary-button" type="button" onClick={() => setActive('Ads Manager')}>Close preview</button></div></DashboardDialog>}
  </DashboardShell>
}

createRoot(document.getElementById('root')).render(<Preview />)
