import { useEffect, useState } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { CurrentUserContext, useSession } from './auth/session.jsx'
import Login from './LOGIN/login.jsx'
import Admin from './ADMIN/admin.jsx'
import UsersPage from './users/users.jsx'

function OpeningWorkspace({ deadline, cancel }) {
  const [timedOut, setTimedOut] = useState(() => Date.now() >= deadline)
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), Math.max(0, deadline - Date.now()))
    return () => window.clearTimeout(timer)
  }, [deadline])
  return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', background: '#faf8f2', fontFamily: 'system-ui', padding: 24, boxSizing: 'border-box', textAlign: 'center' }}><div>{timedOut ? <><p role="alert">Sign-in is taking longer than 2 seconds.</p><p>Check your connection, then try again.</p><button className="sign-in-button" type="button" onClick={cancel}>Back to sign in</button></> : <p role="status">Opening your workspace…</p>}</div></main>
}

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signIn, credentials, authDeadline, cancelSignIn } = useSession()
  const user = useQuery(api.sessions.me, isAuthenticated ? {} : 'skip')
  if (credentials && (isLoading || !isAuthenticated || user === undefined)) return <OpeningWorkspace key={authDeadline} deadline={authDeadline} cancel={cancelSignIn} />
  if (!credentials || !isAuthenticated || !user) return <Login onLoginSuccess={signIn} />
  return <CurrentUserContext.Provider value={user}>{user.role === 'admin' ? <Admin userName={user.name} userRole={user.role} /> : <UsersPage userName={user.name} />}</CurrentUserContext.Provider>
}
