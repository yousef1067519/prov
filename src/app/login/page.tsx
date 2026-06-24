'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        shouldCreateUser: false,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
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
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 12 }}>Magic link sent</h2>
              <p style={{ color: '#888', lineHeight: 1.7 }}>
                Check your inbox for <strong style={{ color: '#f5f5f5' }}>{email}</strong> and click the link to sign in.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f5f5f5', marginBottom: 8 }}>Sign in</h1>
              <p style={{ color: '#888', marginBottom: 32 }}>We&apos;ll email you a magic link.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14 }}>
                    {error}
                  </div>
                )}
                <input
                  type="email"
                  className="input-dark"
                  placeholder="your@agency.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading} className="btn-gold py-4">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Send Magic Link <ArrowRight size={16} /></>}
                </button>
              </form>
              <p style={{ textAlign: 'center', color: '#555', fontSize: '0.9rem', marginTop: 24 }}>
                No account?{' '}
                <Link href="/trial" style={{ color: '#FFD700', textDecoration: 'underline' }}>Start free trial</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
