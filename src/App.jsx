import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { CurrentUserContext, useSession } from './auth/session.jsx'
import Login from './LOGIN/login.jsx'
import Admin from './ADMIN/admin.jsx'
import UsersPage from './users/users.jsx'
import WorkspaceLoader from './ui/workspace-loader.jsx'

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn, credentials, authDeadline, cancelSignIn } = useSession()
  const user = useQuery(api.sessions.me, isAuthenticated ? {} : 'skip')
  const pending = Boolean(credentials && (isLoading || !isAuthenticated || user === undefined))
  const ready = Boolean(credentials && isAuthenticated && user)
  if (!pending && !ready) return <Login onLoginSuccess={signIn} />
  return <>
    {ready && <CurrentUserContext.Provider value={user}>{user.role === 'admin' ? <Admin userName={user.name} userRole={user.role} /> : <UsersPage userName={user.name} />}</CurrentUserContext.Provider>}
    <WorkspaceLoader key={authDeadline} ready={ready} verified={isAuthenticated} deadline={authDeadline} onCancel={cancelSignIn} />
  </>
}
