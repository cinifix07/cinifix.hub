import { useEffect, useRef, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import cinifixLogo from '../assets/cinifix.jpg'
import './login.css'

const iconPaths = {
  lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="m3 3 18 18M10.6 5.1 12 5c6.5 0 10 7 10 7a19 19 0 0 1-3 3.8M6.3 6.3A21 21 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.7-1.7M10 10a3 3 0 0 0 4 4" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
}

function LoginIcon({ name, className = '' }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}

export default function Login({ onLoginSuccess }) {
  const verifySecretKey = useAction(api.userActions.verifySecretKey)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submissionPending = useRef(false)
  const requestTimer = useRef(null)
  const mounted = useRef(false)
  const badgeFrame = useRef(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(requestTimer.current)
      window.cancelAnimationFrame(badgeFrame.current)
    }
  }, [])

  function handleBadgeMove(event) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const stage = event.currentTarget
    const bounds = stage.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    window.cancelAnimationFrame(badgeFrame.current)
    badgeFrame.current = window.requestAnimationFrame(() => {
      stage.style.setProperty('--badge-x', `${(y - 0.5) * -12}deg`)
      stage.style.setProperty('--badge-y', `${(x - 0.5) * 12}deg`)
      stage.style.setProperty('--light-x', `${x * 100}%`)
      stage.style.setProperty('--light-y', `${y * 100}%`)
    })
  }

  function resetBadge(event) {
    window.cancelAnimationFrame(badgeFrame.current)
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
    const deadline = Date.now() + 2000

    try {
      const result = await Promise.race([
        verifySecretKey({ password }),
        new Promise((_, reject) => {
          requestTimer.current = window.setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 2000)
        }),
      ])
      if (!mounted.current) return

      if (result.ok) {
        // Run inside this try/catch: old backend responses or session errors
        // must never leave the form locked on a false "Signed in" message.
        if (typeof onLoginSuccess !== 'function' || !result.token || !result.refreshToken) throw new Error('SESSION_UNAVAILABLE')
        await onLoginSuccess(result, { deadline })
        return
      }

      setStatus({ type: 'error', text: 'Incorrect secret key.' })
    } catch (error) {
      if (!mounted.current) return
      setStatus({
        type: 'error',
        text: error.message === 'LOGIN_TIMEOUT'
          ? 'Sign-in is taking longer than 2 seconds. Please check your connection and try again.'
          : error.message === 'SESSION_UNAVAILABLE'
            ? 'Sign-in is temporarily unavailable. Please refresh and try again shortly.'
            : 'Unable to complete sign-in. Please try again.',
      })
    } finally {
      window.clearTimeout(requestTimer.current)
      requestTimer.current = null
      submissionPending.current = false
      if (mounted.current) setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-ambient" aria-hidden="true" />
      <div className="login-background-lines" aria-hidden="true" />
      <div className="login-wordmark" aria-hidden="true"><span />CINIFIX<span className="login-wordmark-rule" />WORKSPACE</div>
      <div className="login-composition">
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-topline" aria-hidden="true"><span className="login-dot" />YOUR DAILY MOMENTUM</div>
          <div className="login-header">
            <div className="login-badge-entrance">
              <div className="login-badge-float">
                <div className="login-badge-stage" onPointerMove={handleBadgeMove} onPointerLeave={resetBadge}>
                  <div className="login-badge-halo" aria-hidden="true" />
                  <div className="login-badge">
                    <img className="login-logo" src={cinifixLogo} alt="Official CINIFIX badge" width="500" height="500" />
                  </div>
                </div>
              </div>
            </div>
            <h1 id="login-title" aria-label="CINIFIX">
              {'CINIFIX'.split('').map((letter, index) => <span className="login-title-letter" aria-hidden="true" key={index} style={{ '--letter-index': index }}>{letter}</span>)}
            </h1>
            <p>Daily Task Monitoring <span className="login-subtitle-separator">|</span> Allowance Tracking</p>
          </div>

          <div className="login-welcome"><h2>Welcome back.</h2><p>A little focus. A lot of progress.</p></div>
          <form className="login-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <div className="form-field">
              <label htmlFor="password">Secret key</label>
              <div className="password-control">
                <LoginIcon name="lock" className="field-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your secret key"
                  autoComplete="current-password"
                  spellCheck={false}
                  autoCapitalize="none"
                  aria-invalid={status?.type === 'error'}
                  aria-describedby={status ? 'login-status' : undefined}
                  readOnly={isSubmitting}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setStatus(null)
                  }}
                />
                <button
                  className="visibility-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide secret key' : 'Show secret key'}
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <span className="login-eye" key={showPassword ? 'visible' : 'hidden'}><LoginIcon name={showPassword ? 'eyeOff' : 'eye'} /></span>
                </button>
              </div>
            </div>

            {status !== null && (
              <p id="login-status" className={`login-status ${status.type}`} role={status.type === 'error' ? 'alert' : 'status'}>
                {status.text}
              </p>
            )}
            <div className="login-button-reveal">
              <button className="sign-in-button" type="submit" disabled={isSubmitting}>
                {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
                <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
                {!isSubmitting && <LoginIcon name="arrow" className="button-arrow" />}
              </button>
            </div>
          </form>

          <p className="login-footer">
            Don&apos;t have an account?<br />
            <a href="https://www.facebook.com/cinanyag">Message</a> CINIFIX TECH to get access.
          </p>
        </section>
        <p className="login-page-caption"><span /> A clearer day starts here. <span /></p>
      </div>
    </main>
  )
}
