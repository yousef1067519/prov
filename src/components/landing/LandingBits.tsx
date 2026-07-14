'use client'

// Small reusable landing primitives: SectionLabel, HeroInput, StatCard,
// FAQItem, CtaBand. Quiet and disciplined — the pipeline panel is the star.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CornerDownLeft, Plus, Minus } from 'lucide-react'

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="lp-label" style={{ marginBottom: 18 }}>▸ {children}</div>
}

/* ── Hero input: functional-feeling brief box → routes to /demo ── */
const EXAMPLE_BRIEFS = [
  'describe the campaign you’re staffing…',
  '3 fitness creators for a supplement launch, $15k…',
  'beauty client, five mid-tier IG creators, March window…',
  'gaming brand wants YouTube integrations under $8k…',
]

export function HeroInput() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [ph, setPh] = useState(0)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    const t = setInterval(() => setPh(p => (p + 1) % EXAMPLE_BRIEFS.length), 3400)
    return () => clearInterval(t)
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    // No fake generation — the honest next step is a demo on their real workflow.
    router.push('/demo')
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 560 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '4px 6px 4px 16px',
        background: 'var(--lp-surface-1)',
        border: `1px solid ${focused ? 'rgba(255,215,0,0.5)' : 'var(--lp-hairline)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(255,215,0,0.08)' : 'none',
        transition: 'border-color .2s, box-shadow .2s',
      }}>
        <span className="lp-mono" aria-hidden style={{ color: '#ffd700', fontSize: '0.8rem' }}>▸</span>
        <input
          value={value} onChange={e => setValue(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={EXAMPLE_BRIEFS[ph]}
          aria-label="Describe the campaign you're staffing"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#eee', fontSize: '0.92rem', padding: '12px 0', minWidth: 0 }}
        />
        <span className="lp-mono" aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#555', fontSize: '0.66rem', whiteSpace: 'nowrap' }}>
          <CornerDownLeft size={11} /> enter
        </span>
        <button type="submit" className="btn-gold" style={{ padding: '10px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          See it run
        </button>
      </div>
      <p className="lp-mono" style={{ marginTop: 10, fontSize: '0.68rem', color: '#55555c' }}>
        routes to a demo on your real workflow — no self-serve signup, no card
      </p>
    </form>
  )
}

/* ── Stat card with count-up on scroll (numbers are product facts) ── */
export function StatCard({ value, suffix, label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [n, setN] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 900)
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])

  return (
    <div ref={ref} className="lp-card" style={{ padding: '26px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', fontWeight: 700, color: '#ffd700', lineHeight: 1 }}>
        {n}{suffix ?? ''}
      </div>
      <div style={{ color: '#8a8a92', fontSize: '0.85rem', marginTop: 10, lineHeight: 1.5 }}>{label}</div>
    </div>
  )
}

/* ── FAQ accordion with + expanders ── */
export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--lp-hairline)' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'none', border: 'none', cursor: 'pointer', padding: '20px 4px', textAlign: 'left' }}>
        <span style={{ color: '#e8e8e8', fontSize: '1rem', fontWeight: 600 }}>{q}</span>
        <span aria-hidden style={{ color: '#ffd700', flexShrink: 0, display: 'flex' }}>
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <div style={{
        display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows .25s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          <p style={{ color: '#8a8a92', fontSize: '0.92rem', lineHeight: 1.7, padding: '0 4px 20px', maxWidth: 640 }}>{a}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Closing CTA band ── */
export function CtaBand() {
  return (
    <section style={{ padding: '90px 24px' }}>
      <div className="lp-card" style={{
        maxWidth: 880, margin: '0 auto', padding: '56px 40px', textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,215,0,0.015) 60%)',
        border: '1px solid rgba(255,215,0,0.2)',
      }}>
        <div className="lp-label" style={{ marginBottom: 14 }}>▸ next step</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: 12 }}>
          Watch a real deal run through Prov.
        </h2>
        <p style={{ color: '#8a8a92', fontSize: '1rem', marginBottom: 28 }}>
          30 minutes, your clients, your workflow. Workspace provisioned within two business days.
        </p>
        <Link href="/demo" className="btn-gold" style={{ padding: '14px 30px', fontSize: '1rem' }}>
          Request a demo <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  )
}
