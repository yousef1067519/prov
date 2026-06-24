'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Loader2, SkipForward } from 'lucide-react'

/* ── animation constants ─────────────────────────────────────── */
const EASE = [0.16, 1, 0.3, 1] as const
const EASE_INOUT = [0.77, 0, 0.175, 1] as const

// Phase boundaries (ms from mount).
const TIMINGS = {
  desktop: { disintegrate: 2000, solution: 3000, settle: 4000, revealed: 5500 },
  tablet: { disintegrate: 1800, solution: 2700, settle: 3600, revealed: 5000 },
  mobile: { disintegrate: 1500, solution: 2300, settle: 3100, revealed: 4400 },
}

type Phase = 'chaos' | 'disintegrate' | 'solution' | 'settle' | 'revealed'
type Device = 'desktop' | 'tablet' | 'mobile'

const INFLUENCER_MSGS = [
  "Can't I just go to the sponsor directly, without you?",
  "Sorry but I'm having trouble understanding the deal.",
  "What's the budget for this campaign?",
  "Can you send me more details?",
  "I need to think about it.",
  "Do you have other brands?",
  "My rate is higher than that.",
  "When do you need this?",
  "I only work with premium brands.",
  "Can I see examples of your other campaigns?",
]
const SPONSOR_MSGS = [
  "Sorry we don't think we can agree to this deal.",
  "Your influencer rate is too high.",
  "We need someone with more followers.",
  "Can you negotiate on price?",
  "Let me check with my team.",
  "We're looking for a different niche.",
  "What's your engagement rate?",
  "Do you have Asian market creators?",
  "Our budget is lower.",
  "Send us more options.",
]

interface CardData {
  id: number
  label: 'Influencer' | 'Sponsor'
  msg: string
  left: number
  top: number
  rot: number
}

function getDevice(w: number): Device {
  if (w < 768) return 'mobile'
  if (w < 1100) return 'tablet'
  return 'desktop'
}
const CARD_COUNT: Record<Device, number> = { desktop: 38, tablet: 26, mobile: 16 }

function makeCards(count: number): CardData[] {
  const out: CardData[] = []
  for (let i = 0; i < count; i++) {
    const influencer = Math.random() > 0.45
    const pool = influencer ? INFLUENCER_MSGS : SPONSOR_MSGS
    out.push({
      id: i,
      label: influencer ? 'Influencer' : 'Sponsor',
      msg: pool[Math.floor(Math.random() * pool.length)],
      left: 4 + Math.random() * 92,
      top: 5 + Math.random() * 88,
      rot: (Math.random() - 0.5) * 5,
    })
  }
  return out
}

/* ── Gmail mark (approximation of the multicolor M envelope) ──── */
function GmailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M6 40h7V25L4 18.2V37a3 3 0 0 0 2 3z" />
      <path fill="#34A853" d="M35 40h7a3 3 0 0 0 3-3V18.2L36 25v15z" />
      <path fill="#FBBC04" d="M36 12.8V25l9-6.8v-4a3.6 3.6 0 0 0-5.8-2.9L36 12.8z" />
      <path fill="#EA4335" d="M13 25V12.8l11 8.3 11-8.3V25l-11 8.3L13 25z" />
      <path fill="#C5221F" d="M3 14.2v4L13 25V12.8L8.8 9.9A3.6 3.6 0 0 0 3 14.2z" />
    </svg>
  )
}

/* ── realistic notification card ─────────────────────────────── */
function EmailCard({ card, vanish, index }: { card: CardData; vanish: boolean; index: number }) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%', rotate: card.rot }}
      animate={
        vanish
          ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%', rotate: card.rot }
          : { opacity: 1, scale: 1, x: '-50%', y: '-50%', rotate: card.rot }
      }
      transition={
        vanish
          ? { duration: 0.8, ease: EASE }
          : { type: 'spring', stiffness: 320, damping: 22, delay: index * 0.06 }
      }
      style={{
        position: 'absolute', left: `${card.left}%`, top: `${card.top}%`, zIndex: index + 1,
        width: 'min(320px, 80vw)', background: '#ffffff', border: '1px solid #e6e6e6',
        borderRadius: 12, padding: '12px 14px', boxShadow: '0 6px 22px rgba(0,0,0,0.18)',
        willChange: 'transform, opacity',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <GmailIcon />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#202124' }}>{card.label}</span>
            <span style={{ fontSize: 11, color: '#9aa0a6', flexShrink: 0 }}>now</span>
          </div>
          <p style={{ fontSize: 13, color: '#3c4043', lineHeight: 1.4, marginTop: 2 }}>{card.msg}</p>
        </div>
      </div>
    </motion.div>
  )
}

/* ── lead form ───────────────────────────────────────────────── */
function LeadForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Enter a valid email address.'); return }
    setError(''); setLoading(true)
    router.push(`/trial?email=${encodeURIComponent(email)}`)
  }

  return (
    <form onSubmit={submit} style={{ width: '100%', maxWidth: 460 }}>
      <label htmlFor="prov-lead" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: 10 }}>
        Get 1 month free
      </label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input id="prov-lead" type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@youragency.com" className="input-dark" style={{ flex: '1 1 220px' }} aria-invalid={!!error} />
        <button type="submit" disabled={loading} className="btn-gold" style={{ padding: '0 24px', whiteSpace: 'nowrap' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Start free <ArrowRight size={17} /></>}
        </button>
      </div>
      {error
        ? <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{error}</p>
        : <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 8 }}>No credit card required. Instant access.</p>}
    </form>
  )
}

/* ── main component ──────────────────────────────────────────── */
export default function ProvAnimatedHero() {
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [device, setDevice] = useState<Device>('desktop')
  const [phase, setPhase] = useState<Phase>('chaos')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    setMounted(true)
    const d = getDevice(window.innerWidth)
    setDevice(d)
    if (reduce) { setPhase('revealed'); return }
    const t = TIMINGS[d]
    timers.current.push(setTimeout(() => setPhase('disintegrate'), t.disintegrate))
    timers.current.push(setTimeout(() => setPhase('solution'), t.solution))
    timers.current.push(setTimeout(() => setPhase('settle'), t.settle))
    timers.current.push(setTimeout(() => setPhase('revealed'), t.revealed))
    return () => { timers.current.forEach(clearTimeout); timers.current = [] }
  }, [reduce])

  function skip() {
    timers.current.forEach(clearTimeout); timers.current = []
    setPhase('revealed')
  }

  const cards = useMemo(() => makeCards(CARD_COUNT[device]), [device])
  const showCards = mounted && !reduce && (phase === 'chaos' || phase === 'disintegrate')
  const showSkip = mounted && !reduce && phase !== 'revealed' && phase !== 'settle'
  const revealed = phase === 'revealed'

  // Single-logo journey: hidden (center) → big center → small top-left → stays.
  const logoCorner = reduce || phase === 'settle' || phase === 'revealed'
  const logoBig = phase === 'solution'
  const logoAnim = logoCorner
    ? { opacity: 1, x: 22, y: 22, scale: 0.38 }
    : logoBig
    ? { opacity: 1, x: 'calc(50vw - 150px)', y: 'calc(50vh - 58px)', scale: 1 }
    : { opacity: 0, x: 'calc(50vw - 150px)', y: 'calc(50vh - 58px)', scale: 1 }

  const reveal = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { opacity: 1, y: 0 } }
      : { initial: { opacity: 0, y: 30 }, animate: revealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }, transition: { duration: 0.7, delay, ease: EASE } }

  return (
    <section aria-label="Hero" style={{ position: 'relative', minHeight: '100dvh', background: '#0a0a0a', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingTop: 120, paddingBottom: 140, boxSizing: 'border-box' }}>
      <div className="grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', width: 880, height: 480, background: 'radial-gradient(ellipse, rgba(202,138,4,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Log in (always available on the home screen) */}
      <Link href="/login"
        style={{ position: 'absolute', top: 20, right: 20, zIndex: 60, fontSize: 13, fontWeight: 600, color: '#cfcfcf', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '8px 16px', textDecoration: 'none', backdropFilter: 'blur(8px)' }}>
        Log in
      </Link>

      {/* Skip control (sits left of Log in during the animation) */}
      {showSkip && (
        <button onClick={skip}
          style={{ position: 'absolute', top: 20, right: 104, zIndex: 60, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#777', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
          <SkipForward size={13} /> Skip
        </button>
      )}

      {/* PHASE 1 + 2: notification chaos then disintegrate */}
      <AnimatePresence>
        {showCards && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            {cards.map((c, i) => <EmailCard key={c.id} card={c} vanish={phase === 'disintegrate'} index={i} />)}

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={phase === 'chaos' ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: EASE }}
              style={{ position: 'absolute', inset: 0, zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.03em', textWrap: 'balance', textShadow: '0 4px 30px rgba(0,0,0,0.85)' }}
            >
              Your team spends 60+ hours on emails<br />influencers and sponsors ignore
            </motion.h2>
          </div>
        )}
      </AnimatePresence>

      {/* PHASE 3 caption under the big logo */}
      <motion.p
        aria-hidden
        initial={false}
        animate={logoBig ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ position: 'absolute', top: 'calc(50vh + 78px)', left: 0, right: 0, zIndex: 45, textAlign: 'center', color: '#9a9a9a', fontSize: '1.0625rem', letterSpacing: '0.01em', pointerEvents: 'none' }}
      >
        We are the solution.
      </motion.p>

      {/* THE single logo — does the whole journey */}
      <motion.div
        initial={false}
        animate={logoAnim}
        transition={
          logoBig ? { duration: 0.8, ease: EASE }
          : phase === 'settle' ? { duration: 1.4, ease: EASE_INOUT }
          : { duration: 0.5, ease: EASE }
        }
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 50, transformOrigin: 'top left', willChange: 'transform, opacity' }}
      >
        <Image src="/logo.png" alt="Prov" width={300} height={116} style={{ objectFit: 'contain' }} priority />
      </motion.div>

      {/* PHASE 5: hero reveal */}
      <div className="container" style={{ position: 'relative', zIndex: 20, textAlign: 'center', maxWidth: 820 }}>
        <motion.h1 {...reveal(0)} style={{ fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.035em', color: '#fff', margin: '0 auto 22px', maxWidth: 820, textWrap: 'balance' }}>
          Agency Founder, Stop Working Like a <span className="gold-text">Data Clerk.</span>
        </motion.h1>

        <motion.p {...reveal(0.3)} style={{ fontSize: 'clamp(1.0625rem, 2.2vw, 1.3rem)', color: '#e8e8e8', maxWidth: 560, margin: '0 auto 14px', lineHeight: 1.55, textWrap: 'pretty' }}>
          Your time belongs on closing deals. Let Prov handle the boring stuff.
        </motion.p>

        <motion.p {...reveal(0.45)} style={{ fontSize: '1.0625rem', color: '#8a8a8a', maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6, textWrap: 'pretty' }}>
          Get 40+ hours back per week. Automate creator research, sponsor matching, email outreach, and deal tracking.
        </motion.p>

        <motion.div {...(reduce ? { initial: false, animate: { opacity: 1, scale: 1 } } : { initial: { opacity: 0, scale: 0.95 }, animate: revealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }, transition: { duration: 0.6, delay: 0.6, ease: EASE } })}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <LeadForm />
        </motion.div>

        <motion.div {...reveal(0.75)} style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
          <a href="/trial" className="btn-gold" style={{ fontSize: '1.0625rem', padding: '15px 30px' }}>
            Take Your Time Back <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="btn-outline-gold" style={{ fontSize: '1.0625rem', padding: '15px 26px' }}>
            See how it works
          </a>
        </motion.div>

        <motion.p {...reveal(0.9)} style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem' }}>
          47 agency founders reclaimed 40+ hours a week.
        </motion.p>
      </div>
    </section>
  )
}
