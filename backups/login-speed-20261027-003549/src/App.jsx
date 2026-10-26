import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { CurrentUserContext, useSession } from './auth/session.jsx'
import Login from './LOGIN/login.jsx'
import Admin from './ADMIN/admin.jsx'
import UsersPage from './users/users.jsx'

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn } = useSession()
  const user = useQuery(api.sessions.me, isAuthenticated ? {} : 'skip')
  if (isLoading || (isAuthenticated && user === undefined)) return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', background: '#faf8f2', fontFamily: 'system-ui' }} role="status">Opening your workspace…</main>
  if (!isAuthenticated || !user) return <Login onLoginSuccess={signIn} />
  return <CurrentUserContext.Provider value={user}>{user.role === 'admin' ? <Admin userName={user.name} userRole={user.role} /> : <UsersPage userName={user.name} />}</CurrentUserContext.Provider>
}
