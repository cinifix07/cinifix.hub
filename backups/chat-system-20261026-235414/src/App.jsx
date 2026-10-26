import { useState } from 'react'
import Login from './LOGIN/login.jsx'
import Admin from './ADMIN/admin.jsx'
import UsersPage from './users/users.jsx'

const DEFAULT_USER_NAME = 'CINIFIX'
const DEFAULT_USER_ROLE = 'user'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem('cinifix-admin-authenticated') === 'true',
  )
  const [userName, setUserName] = useState(
    () => sessionStorage.getItem('cinifix-admin-user-name') || DEFAULT_USER_NAME,
  )
  const [userRole, setUserRole] = useState(
    () => {
      const storedRole = sessionStorage.getItem('cinifix-admin-user-role')
      const storedName = sessionStorage.getItem('cinifix-admin-user-name') || DEFAULT_USER_NAME

      return storedRole || (storedName.toLowerCase() === 'cinifix' ? 'admin' : DEFAULT_USER_ROLE)
    },
  )

  function handleLoginSuccess(result) {
    const nextUserName = result?.name || DEFAULT_USER_NAME
    const nextUserRole = result?.role || DEFAULT_USER_ROLE

    sessionStorage.setItem('cinifix-admin-authenticated', 'true')
    sessionStorage.setItem('cinifix-admin-user-name', nextUserName)
    sessionStorage.setItem('cinifix-admin-user-role', nextUserRole)
    window.location.hash = nextUserRole === 'admin' ? 'admin' : 'users'
    setUserName(nextUserName)
    setUserRole(nextUserRole)
    setIsAuthenticated(true)
  }

  if (isAuthenticated) {
    if (userRole === 'admin') {
      return <Admin userName={userName} userRole={userRole} />
    }

    return <UsersPage userName={userName} />
  }

  return <Login onLoginSuccess={handleLoginSuccess} />
}
