import { useState } from 'react'
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

  async function handleSubmit(event) {
    event.preventDefault()

    if (password.length === 0) {
      setStatus({ type: 'error', text: 'Secret key is required.' })
      return
    }

    setIsSubmitting(true)
    setStatus(null)

    try {
      const result = await verifySecretKey({ password })

      if (result.ok) {
        onLoginSuccess?.(result)
        return
      }

      setStatus({ type: 'error', text: 'Incorrect secret key.' })
    } catch {
      setStatus({
        type: 'error',
        text: 'Unable to check the secret key. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-header">
          <img className="login-logo" src={cinifixLogo} alt="CINI FIX" />
          <h1 id="login-title">CINI FIX</h1>
          <p>Daily Task Monitoring | Allowance Tracking</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
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
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'visibility_off' : 'visibility'}
              </button>
            </div>
          </div>

          <button className="sign-in-button" type="submit" disabled={isSubmitting}>
            <span>{isSubmitting ? 'Checking...' : 'Sign In'}</span>
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </button>

          {status !== null && (
            <p className={`login-status ${status.type}`} role="status">
              {status.text}
            </p>
          )}
        </form>

        <p className="login-footer">
          Don&apos;t have an account? Message CINI FIX TECH to get access.
          <a href="https://www.facebook.com/cinanyag">Message</a>
        </p>
      </section>
    </main>
  )
}
