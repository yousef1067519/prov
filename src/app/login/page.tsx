'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import GoogleAuthButton, { safeDest } from '@/components/GoogleAuthButton'
import Link from 'next/link'

const DEV = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

// Sign in with password (default), an emailed 8-digit code (fallback), or Google.
// After any successful auth we hard-navigate (window.location) so the fresh session
// cookie reaches the server on the first request — no double-submit, no bounce.
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'password' | 'code-request' | 'code-verify'>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyType, setVerifyType] = useState<'email' | 'signup'>('email')
  const [devCode, setDevCode] = useState('')

  // Dev bypass: skip auth entirely so you can test the product.
  function devEnter() {
    router.push('/dashboard')
    router.refresh()
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (err) {
      setLoading(false)
      setError(/credentials/i.test(err.message)
        ? 'Wrong email or password. If you signed up with a code or Google, use those instead.'
        : err.message)
      return
    }
    window.location.assign(safeDest())
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/send-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const d = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(d.error || 'Could not send the code. Try again.'); return }
    setVerifyType(d.type === 'signup' ? 'signup' : 'email')
    if (d.devCode) setDevCode(d.devCode)
    setMode('code-verify')
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    // Try the indicated type, then fall back to the other email-OTP type to be safe.
    let { error: err } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: verifyType })
    if (err) {
      const alt = verifyType === 'signup' ? 'email' : 'signup'
      const retry = await supabase.auth.verifyOtp({ email, token: code.trim(), type: alt })
      err = retry.error
    }
    if (err) { setLoading(false); setError('That code is invalid or expired. Try again.'); return }
    window.location.assign(safeDest())
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f5f5f5', textDecoration: 'none' }}>
            Pr<span style={{ color: '#FFD700' }}>o</span>v
          </Link>
        </div>

        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 20, padding: '40px 36px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {DEV ? (
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in</h1>
              <p style={{ color: '#888', marginBottom: 28 }}>Developer mode is on. Skip straight to the dashboard.</p>
              <button onClick={devEnter} className="btn-gold py-4" style={{ width: '100%', justifyContent: 'center' }}>
                Continue to dashboard <ArrowRight size={16} />
              </button>
            </div>
          ) : mode === 'password' ? (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in</h1>
              <p style={{ color: '#888', marginBottom: 28 }}>Welcome back.</p>

              <GoogleAuthButton label="Continue with Google" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#222' }} />
                <span style={{ color: '#555', fontSize: '0.78rem' }}>or with email</span>
                <div style={{ flex: 1, height: 1, background: '#222' }} />
              </div>

              <form onSubmit={signInWithPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="email" className="input-dark" placeholder="your@agency.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <input type="password" className="input-dark" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="submit" disabled={loading} className="btn-gold py-4">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign in <ArrowRight size={16} /></>}
                </button>
              </form>

              <button onClick={() => { setMode('code-request'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.85rem', marginTop: 18, cursor: 'pointer', width: '100%', textDecoration: 'underline' }}>
                Email me a sign-in code instead
              </button>

              <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 20 }}>
                New to Prov?{' '}
                <Link href="/signup" style={{ color: '#FFD700', textDecoration: 'underline' }}>Create an account</Link>
              </p>
              <p style={{ textAlign: 'center', color: '#555', fontSize: '0.85rem', marginTop: 8 }}>
                Have a team invite code?{' '}
                <Link href="/join" style={{ color: '#888', textDecoration: 'underline' }}>Join your team</Link>
              </p>
            </>
          ) : mode === 'code-request' ? (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in with a code</h1>
              <p style={{ color: '#888', marginBottom: 32 }}>We&apos;ll email you an 8-digit code.</p>
              <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="email" className="input-dark" placeholder="your@agency.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                <button type="submit" disabled={loading} className="btn-gold py-4">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send code <ArrowRight size={16} /></>}
                </button>
              </form>
              <button onClick={() => { setMode('password'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.875rem', marginTop: 20, cursor: 'pointer', width: '100%' }}>
                ← Back to password sign-in
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Enter your code</h1>
              <p style={{ color: '#888', marginBottom: 32 }}>
                We sent an 8-digit code to <strong style={{ color: '#f5f5f5' }}>{email}</strong>. Enter it below.
              </p>
              {devCode && (
                <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#FFD700' }}>
                  Dev mode — your code is <strong style={{ fontFamily: 'monospace', letterSpacing: '0.15em' }}>{devCode}</strong>
                </div>
              )}
              <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input inputMode="numeric" autoComplete="one-time-code" className="input-dark" placeholder="12345678" value={code}
                  onChange={e => setCode(e.target.value)} required
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3em', fontFamily: 'monospace' }} />
                <button type="submit" disabled={loading} className="btn-gold py-4">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Verify and sign in <ArrowRight size={16} /></>}
                </button>
              </form>
              <button onClick={() => { setMode('code-request'); setCode(''); setError('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.875rem', marginTop: 20, cursor: 'pointer', width: '100%' }}>
                Use a different email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
