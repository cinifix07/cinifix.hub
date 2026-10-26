/* eslint-disable react-refresh/only-export-components -- Shared session context and provider. */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ConvexProviderWithAuth } from 'convex/react'
import { api } from '../../convex/_generated/api'

const STORAGE_KEY = 'cinifix-session-v1'
const SessionContext = createContext(null)
export const CurrentUserContext = createContext(null)
export function useCurrentUser() { return useContext(CurrentUserContext) }
export function useSession() { return useContext(SessionContext) }
function loadSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    return typeof value?.refreshToken === 'string' && value.refreshToken.length === 43 ? value : null
  } catch { return null }
}
function useSessionAuth() {
  const { credentials, fetchAccessToken } = useSession()
  return { isLoading: false, isAuthenticated: Boolean(credentials), fetchAccessToken }
}
export function SessionProvider({ client, children }) {
  const [credentials, setCredentials] = useState(loadSession)
  const [authDeadline, setAuthDeadline] = useState(() => Date.now() + 2000)
  const current = useRef(credentials)
  const pending = useRef(null)
  const refreshToken = credentials?.refreshToken
  const save = useCallback((value) => {
    current.current = value
    pending.current = null
    try {
      if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      else sessionStorage.removeItem(STORAGE_KEY)
      for (const key of ['cinifix-admin-authenticated', 'cinifix-admin-user-name', 'cinifix-admin-user-role']) sessionStorage.removeItem(key)
    } catch { /* Memory-only sign-in remains usable when storage is unavailable. */ }
    setCredentials(value)
  }, [])
  const signIn = useCallback((result, { deadline = Date.now() + 2000 } = {}) => {
    if (!result?.token || !result.refreshToken) throw new Error('Secure sign-in was not confirmed.')
    setAuthDeadline(deadline)
    save({ token: result.token, expiresAt: result.expiresAt, refreshToken: result.refreshToken })
    window.location.hash = result.role === 'admin' ? 'admin' : 'users'
  }, [save])
  const cancelSignIn = useCallback(() => {
    const value = current.current
    save(null)
    if (value) client.action(api.sessionActions.logout, { refreshToken: value.refreshToken }).catch(() => {})
  }, [client, save])
  const signOut = useCallback(async () => {
    const value = current.current
    if (value) await client.action(api.sessionActions.logout, { refreshToken: value.refreshToken })
    save(null)
    window.location.hash = ''
  }, [client, save])
  const fetchAccessToken = useCallback(async ({ forceRefreshToken }) => {
    const value = current.current
    if (!value || value.refreshToken !== refreshToken) return null
    if (!forceRefreshToken && value.token && value.expiresAt > Date.now() + 30000) return value.token
    if (pending.current) return pending.current
    const request = (async () => {
      try {
        const result = await client.action(api.sessionActions.refresh, { refreshToken: value.refreshToken })
        if (current.current?.refreshToken !== value.refreshToken) return null
        if (!result.ok) { save(null); return null }
        const next = { ...value, token: result.token, expiresAt: result.expiresAt }
        current.current = next
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Memory fallback. */ }
        return result.token
      } catch { return null }
      finally { if (pending.current === request) pending.current = null }
    })()
    pending.current = request
    return request
  }, [client, save, refreshToken])
  const value = useMemo(() => ({ credentials, authDeadline, signIn, cancelSignIn, signOut, fetchAccessToken }), [credentials, authDeadline, signIn, cancelSignIn, signOut, fetchAccessToken])
  return <SessionContext.Provider value={value}><ConvexProviderWithAuth client={client} useAuth={useSessionAuth}>{children}</ConvexProviderWithAuth></SessionContext.Provider>
}
