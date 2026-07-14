'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, Mail, Clock, TrendingUp } from 'lucide-react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

// Stated assumptions so the math is honest, not fake-precise
const AVG_DEAL_VALUE = 2500     // typical IMA deal
const CLOSURE_MULTIPLIER = 3    // Prov lifts deal closure ~3x
const PROV_MONTHLY = 299

function fmtMoney(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

function Slider({ label, value, onChange, max, unit, Icon }: {
  label: string; value: number; onChange: (v: number) => void; max: number; unit: string; Icon: typeof Search
}) {
  const pct = (value / max) * 100
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#cfcfcf', fontSize: '0.9375rem', fontWeight: 500 }}>
          <Icon size={16} strokeWidth={1.75} style={{ color: '#FFD700' }} /> {label}
        </span>
        <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1.0625rem' }}>
          {value}<span style={{ color: '#666', fontWeight: 400, fontSize: '0.875rem' }}> {unit}</span>
        </span>
      </label>
      <input
        type="range" min={0} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        style={{
          width: '100%', height: 6, borderRadius: 999, appearance: 'none', WebkitAppearance: 'none',
          background: `linear-gradient(90deg, #CA8A04 0%, #FFD700 ${pct}%, #222 ${pct}%, #222 100%)`,
          outline: 'none', cursor: 'pointer',
        }}
      />
    </div>
  )
}

function Result({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}
      style={{ textAlign: 'left' }}
    >
      <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: accent, fontFamily: 'var(--font-display)', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ color: '#777', fontSize: '0.875rem', marginTop: 6 }}>{label}</div>
    </motion.div>
  )
}

export default function RoiCalculatorSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const [research, setResearch] = useState(18)
  const [outreach, setOutreach] = useState(16)
  const [deals, setDeals] = useState(4)

  const r = useMemo(() => {
    const hoursPerWeek = Math.round(research * 0.85 + outreach * 0.9)
    const hoursPerYear = hoursPerWeek * 52
    const weeksBack = Math.round(hoursPerYear / 40)
    const extraDeals = deals * (CLOSURE_MULTIPLIER - 1)
    const revPerMonth = extraDeals * AVG_DEAL_VALUE
    const revPerYear = revPerMonth * 12
    const roi = revPerYear > 0 ? Math.round(revPerYear / (PROV_MONTHLY * 12)) : 0
    return { hoursPerWeek, hoursPerYear, weeksBack, revPerMonth, revPerYear, roi }
  }, [research, outreach, deals])

  return (
    <section id="calculator" className="section" ref={ref} style={{ background: '#080808' }}>
      <div className="divider-gold" style={{ marginBottom: 100 }} />
      <div className="container" style={{ maxWidth: 980 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE_OUT }} className="text-center mb-16"
        >
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: '-0.025em', textWrap: 'balance' }}>
            See exactly how much time<br />Prov gives you back
          </h2>
          <p style={{ color: '#777', fontSize: '1.125rem', maxWidth: 520, margin: '0 auto', textWrap: 'pretty' }}>
            Move the sliders to match your week. The math updates live.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0, background: '#0f0f0f', border: '1px solid #1c1c1c', borderRadius: 24, overflow: 'hidden' }}
        >
          {/* Inputs */}
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: 28, borderRight: '1px solid #1c1c1c' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Your week today</p>
            <Slider label="Creator research" value={research} onChange={setResearch} max={40} unit="hrs/wk" Icon={Search} />
            <Slider label="Email outreach" value={outreach} onChange={setOutreach} max={40} unit="hrs/wk" Icon={Mail} />
            <Slider label="Deals closed" value={deals} onChange={setDeals} max={30} unit="/mo" Icon={TrendingUp} />
          </div>

          {/* Results */}
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: 28, background: 'linear-gradient(135deg, rgba(202,138,4,0.05), transparent)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555' }}>Your week with Prov</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px 20px' }}>
              <Result value={`${r.hoursPerWeek}h`} label="back every week" accent="#FFD700" />
              <Result value={`${r.weeksBack}`} label="full work-weeks/year" accent="#FFD700" />
              <Result value={fmtMoney(r.revPerMonth)} label="extra revenue/month" accent="#00D084" />
              <Result value={`${r.roi}x`} label="return on $299/mo" accent="#00D084" />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#666', fontSize: '0.8125rem' }}>
                <Clock size={14} style={{ color: '#FFD700' }} />
                That is <span style={{ color: '#e8e8e8', fontWeight: 600 }}>{r.hoursPerYear.toLocaleString()} hours</span> off your calendar this year.
              </div>
              <Link href="/demo" className="btn-gold" style={{ width: '100%', fontSize: '1.0625rem', padding: '15px' }}>
                Claim Your Free Month <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </motion.div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: '0.8125rem', marginTop: 20 }}>
          Estimates assume a {AVG_DEAL_VALUE.toLocaleString()} average deal and a {CLOSURE_MULTIPLIER}x closure rate. Your results will vary.
        </p>
      </div>
    </section>
  )
}
