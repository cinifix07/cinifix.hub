import { useEffect, useRef, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import cinifixLogo from '../assets/cinifix.jpg'
import './login.css'

export default function Login({ onLoginSuccess }) {
  const verifySecretKey = useAction(api.userActions.verifySecretKey)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const submissionPending = useRef(false)
  const successTimer = useRef(null)

  useEffect(() => () => window.clearTimeout(successTimer.current), [])

  function handleBadgeMove(event) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const badge = event.currentTarget
    const bounds = badge.getBoundingClientRect()
    badge.style.setProperty('--badge-x', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -10}deg`)
    badge.style.setProperty('--badge-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 10}deg`)
  }

  function resetBadge(event) {
    event.currentTarget.style.setProperty('--badge-x', '0deg')
    event.currentTarget.style.setProperty('--badge-y', '0deg')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submissionPending.current) return

    if (password.length === 0) {
      setStatus({ type: 'error', text: 'Secret key is required.' })
      return
    }

    submissionPending.current = true
    setIsSubmitting(true)
    setStatus(null)

    try {
      const result = await verifySecretKey({ password })

      if (result.ok) {
        setIsSuccess(true)
        setStatus({ type: 'success', text: 'You’re signed in. Opening your dashboard…' })
        // The existing routing callback runs only after server confirmation.
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220
        successTimer.current = window.setTimeout(() => onLoginSuccess?.(result), duration)
        return
      }

      setStatus({ type: 'error', text: 'Incorrect secret key.' })
    } catch {
      setStatus({
        type: 'error',
        text: 'Unable to check the secret key. Please try again.',
      })
    } finally {
      // Keep the form locked during the confirmed-success transition.
      submissionPending.current = successTimer.current !== null
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-ambient" aria-hidden="true" />
      <section className={`login-card${isSuccess ? ' is-success' : ''}`} aria-labelledby="login-title">
        <div className="login-header">
          <div className="login-badge-entrance">
            <div className="login-badge-float">
              <div className="login-badge" onPointerMove={handleBadgeMove} onPointerLeave={resetBadge}>
                <img className="login-logo" src={cinifixLogo} alt="Official CINIFIX badge" width="500" height="500" />
              </div>
            </div>
          </div>
          <h1 id="login-title">CINIFIX</h1>
          <p>Daily Task Monitoring | Allowance Tracking</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="form-field">
            <label htmlFor="password">Secret key</label>
            <div className="password-control">
              <span className="material-symbols-outlined field-icon" aria-hidden="true">
                lock
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="********"
                autoComplete="current-password"
                spellCheck={false}
                autoCapitalize="none"
                aria-invalid={status?.type === 'error'}
                aria-describedby={status ? 'login-status' : undefined}
                readOnly={isSubmitting || isSuccess}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setStatus(null)
                }}
              />
              <button
                className="material-symbols-outlined visibility-toggle"
                type="button"
                aria-label={showPassword ? 'Hide secret key' : 'Show secret key'}
                aria-pressed={showPassword}
                disabled={isSuccess}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </button>
            </div>
          </div>

          {status !== null && (
            <p id="login-status" className={`login-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
              {status.text}
            </p>
          )}
          <div className="login-button-reveal">
            <button className="sign-in-button" type="submit" disabled={isSubmitting || isSuccess}>
              {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
              <span>{isSuccess ? 'Signed in' : isSubmitting ? 'Signing in...' : 'Sign In'}</span>
              {!isSubmitting && <span className="material-symbols-outlined button-arrow" aria-hidden="true">{isSuccess ? 'check' : 'arrow_forward'}</span>}
            </button>
          </div>
        </form>

        <p className="login-footer">
          Don&apos;t have an account?<br />
          <a href="https://www.facebook.com/cinanyag">Message</a> CINIFIX TECH to get access.
        </p>
      </section>
    </main>
  )
}
