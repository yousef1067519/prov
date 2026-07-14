'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { SkipForward } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const
const TIMINGS = {
  desktop: { disintegrate: 1800, solution: 2700, settle: 3600, done: 5000 },
  tablet: { disintegrate: 1600, solution: 2400, settle: 3200, done: 4500 },
  mobile: { disintegrate: 1400, solution: 2100, settle: 2800, done: 4000 },
}
type Phase = 'chaos' | 'disintegrate' | 'solution' | 'settle' | 'done'
type Device = 'desktop' | 'tablet' | 'mobile'

const INFLUENCER_MSGS = [
  "Can't I just go to the sponsor directly, without you?",
  "What's the budget for this campaign?",
  "My rate is higher than that.",
  "I only work with premium brands.",
  "Can you send me more details?",
]
const SPONSOR_MSGS = [
  "Sorry we don't think we can agree to this deal.",
  "Your influencer rate is too high.",
  "We need someone with more followers.",
  "Our budget is lower.",
  "Send us more options.",
]

interface CardData { id: number; label: 'Influencer' | 'Sponsor'; msg: string; left: number; top: number; rot: number }
function getDevice(w: number): Device { return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop' }
const CARD_COUNT: Record<Device, number> = { desktop: 34, tablet: 24, mobile: 14 }

function makeCards(count: number): CardData[] {
  const out: CardData[] = []
  for (let i = 0; i < count; i++) {
    const inf = Math.random() > 0.45
    const pool = inf ? INFLUENCER_MSGS : SPONSOR_MSGS
    out.push({ id: i, label: inf ? 'Influencer' : 'Sponsor', msg: pool[Math.floor(Math.random() * pool.length)], left: 4 + Math.random() * 92, top: 5 + Math.random() * 88, rot: (Math.random() - 0.5) * 5 })
  }
  return out
}

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

function EmailCard({ card, vanish, index }: { card: CardData; vanish: boolean; index: number }) {
  return (
    <motion.div aria-hidden
      initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%', rotate: card.rot }}
      animate={vanish ? { opacity: 0, scale: 0.9, x: '-50%', y: '-50%', rotate: card.rot } : { opacity: 1, scale: 1, x: '-50%', y: '-50%', rotate: card.rot }}
      transition={vanish ? { duration: 0.8, ease: EASE } : { type: 'spring', stiffness: 320, damping: 22, delay: index * 0.05 }}
      style={{ position: 'absolute', left: `${card.left}%`, top: `${card.top}%`, zIndex: index + 1, width: 'min(320px, 80vw)', background: '#fff', border: '1px solid #e6e6e6', borderRadius: 12, padding: '12px 14px', boxShadow: '0 6px 22px rgba(0,0,0,0.18)', willChange: 'transform, opacity' }}>
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

/** Plays once over its parent, then fades the stage out to reveal what's underneath. */
export default function ProvIntroOverlay() {
  const reduce = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [device, setDevice] = useState<Device>('desktop')
  const [phase, setPhase] = useState<Phase>('chaos')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    setMounted(true)
    const d = getDevice(window.innerWidth)
    setDevice(d)
    if (reduce) { setPhase('done'); return }
    const t = TIMINGS[d]
    timers.current.push(setTimeout(() => setPhase('disintegrate'), t.disintegrate))
    timers.current.push(setTimeout(() => setPhase('solution'), t.solution))
    timers.current.push(setTimeout(() => setPhase('settle'), t.settle))
    timers.current.push(setTimeout(() => setPhase('done'), t.done))
    return () => { timers.current.forEach(clearTimeout); timers.current = [] }
  }, [reduce])

  function skip() { timers.current.forEach(clearTimeout); timers.current = []; setPhase('done') }

  const cards = useMemo(() => makeCards(CARD_COUNT[device]), [device])
  const showCards = mounted && !reduce && (phase === 'chaos' || phase === 'disintegrate')
  const done = phase === 'done'
  const stageGone = reduce || done
  const logoCorner = reduce || phase === 'settle' || phase === 'done'
  const logoBig = phase === 'solution'
  const logoAnim = logoCorner
    ? { opacity: done && reduce ? 0 : 1, x: 22, y: 22, scale: 0.38 }
    : logoBig
    ? { opacity: 1, x: 'calc(50vw - 150px)', y: 'calc(50vh - 58px)', scale: 1 }
    : { opacity: 0, x: 'calc(50vw - 150px)', y: 'calc(50vh - 58px)', scale: 1 }

  return (
    <div aria-hidden={done} style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: stageGone ? 'none' : 'auto', overflow: 'hidden' }}>
      {/* Fading dark stage — hides the hero beneath until the reveal */}
      <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', opacity: stageGone ? 0 : 1, transition: 'opacity 0.8s ease', pointerEvents: stageGone ? 'none' : 'auto' }}>
        <div className="grid-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

        {!reduce && (
          <button onClick={skip} style={{ position: 'absolute', top: 20, right: 20, zIndex: 60, display: phase === 'done' || phase === 'settle' ? 'none' : 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#777', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            <SkipForward size={13} /> Skip
          </button>
        )}

        <AnimatePresence>
          {showCards && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              {cards.map((c, i) => <EmailCard key={c.id} card={c} vanish={phase === 'disintegrate'} index={i} />)}
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={phase === 'chaos' ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: EASE }}
                style={{ position: 'absolute', inset: 0, zIndex: 25, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px', fontSize: 'clamp(1.75rem, 4.5vw, 3.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.03em', textWrap: 'balance', textShadow: '0 4px 30px rgba(0,0,0,0.85)' }}>
                Your team spends 60+ hours on emails<br />influencers and sponsors ignore
              </motion.h2>
            </div>
          )}
        </AnimatePresence>

        <motion.p aria-hidden initial={false} animate={logoBig ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} transition={{ duration: 0.5, ease: EASE }}
          style={{ position: 'absolute', top: 'calc(50vh + 78px)', left: 0, right: 0, zIndex: 45, textAlign: 'center', color: '#9a9a9a', fontSize: '1.0625rem', pointerEvents: 'none' }}>
          We are the solution.
        </motion.p>
      </div>

      {/* The single logo — does the journey and stays top-left over the hero */}
      {!reduce && (
        <motion.div initial={false} animate={logoAnim}
          transition={logoBig ? { duration: 0.8, ease: EASE } : phase === 'settle' ? { duration: 1.4, ease: EASE } : { duration: 0.5, ease: EASE }}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 50, transformOrigin: 'top left', willChange: 'transform, opacity' }}>
          <Image src="/logo.png" alt="Prov" width={300} height={116} style={{ objectFit: 'contain' }} priority />
        </motion.div>
      )}
    </div>
  )
}
