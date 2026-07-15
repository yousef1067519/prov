'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const DEV = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyType, setVerifyType] = useState<'email' | 'signup'>('email')
  const [devCode, setDevCode] = useState('')

  // Dev bypass: skip auth entirely so you can test the product.
  function devEnter() {
    router.push('/dashboard')
    router.refresh()
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    // Code is generated server-side and delivered via Resend (reliable; no magic-link loop).
    const res = await fetch('/api/auth/send-code', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const d = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(d.error || 'Could not send the code. Try again.'); return }
    setVerifyType(d.type === 'signup' ? 'signup' : 'email')
    if (d.devCode) setDevCode(d.devCode)
    setStep('code')
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
    // Honor ?redirect= (e.g. returning to checkout, or a protected page the proxy sent
    // them from). Only allow same-origin relative paths — never an open redirect.
    let dest = '/dashboard'
    try {
      const r = new URLSearchParams(window.location.search).get('redirect')
      if (r && r.startsWith('/') && !r.startsWith('//')) dest = r
    } catch { /* default */ }
    // Full-page navigation (not router.push): the just-set Supabase auth cookie needs to
    // reach the server, or the destination renders before the session exists and bounces
    // back to /login — the "have to press verify twice" bug. A hard load guarantees the
    // server sees the session on the first try. Keep the button spinning through it.
    window.location.assign(dest)
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
          ) : step === 'email' ? (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in</h1>
              <p style={{ color: '#888', marginBottom: 32 }}>We&apos;ll email you an 8-digit code.</p>
              <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input type="email" className="input-dark" placeholder="your@agency.com" value={email} onChange={e => setEmail(e.target.value)} required />
                <button type="submit" disabled={loading} className="btn-gold py-4">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send code <ArrowRight size={16} /></>}
                </button>
              </form>
              <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 24 }}>
                No account?{' '}
                <Link href="/demo" style={{ color: '#FFD700', textDecoration: 'underline' }}>Request a demo</Link>
              </p>
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
              <button onClick={() => { setStep('email'); setCode(''); setError('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '0.875rem', marginTop: 20, cursor: 'pointer', width: '100%' }}>
                Use a different email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
