import { Check, X } from 'lucide-react'

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams
  const ok = state === 'done'
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', background: '#111', border: '1px solid #1c1c1c', borderRadius: 18, padding: '40px 32px' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: ok ? 'rgba(0,208,132,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${ok ? 'rgba(0,208,132,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
          {ok ? <Check size={24} style={{ color: '#00D084' }} /> : <X size={24} style={{ color: '#f87171' }} />}
        </div>
        <h1 style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.25rem', marginBottom: 8 }}>
          {ok ? 'You’ve been unsubscribed' : 'Unable to unsubscribe'}
        </h1>
        <p style={{ color: '#888', fontSize: '0.9375rem', lineHeight: 1.6 }}>
          {ok
            ? 'You won’t receive any further outreach from this sender. It may take a moment to take effect.'
            : 'This link is invalid or expired. If you keep receiving emails, reply directly asking to be removed.'}
        </p>
      </div>
    </div>
  )
}
