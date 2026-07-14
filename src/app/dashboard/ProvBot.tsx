'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, X, Loader2, LifeBuoy, Eraser } from 'lucide-react'

interface Msg { role: 'user' | 'assistant'; content: string; escalated?: boolean }

const THREAD_KEY = 'provbot:thread'
const SUGGESTIONS = [
  'How do I find creators?',
  'What does AI Discovery do?',
  'Help me draft a follow-up email',
  'How do contracts work?',
]

const GOLD = '#FFD700'

export default function ProvBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Restore conversation across navigations (the shell remounts per page).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(THREAD_KEY)
      if (raw) setMessages(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(THREAD_KEY, JSON.stringify(messages.slice(-50))) } catch { /* ignore */ }
  }, [messages])

  // Auto-scroll to the newest message + focus the input when opened.
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 250) }, [open])

  // Open from the sidebar trigger (and toggle from the floating launcher).
  useEffect(() => {
    const openFn = () => setOpen(true)
    const toggleFn = () => setOpen(o => !o)
    window.addEventListener('provbot:open', openFn)
    window.addEventListener('provbot:toggle', toggleFn)
    return () => { window.removeEventListener('provbot:open', openFn); window.removeEventListener('provbot:toggle', toggleFn) }
  }, [])

  const send = useCallback(async (text: string) => {
    const message = text.trim()
    if (!message || sending) return
    setInput('')
    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
    setMessages(m => [...m, { role: 'user', content: message }])
    setSending(true)
    try {
      const res = await fetch('/api/provbot/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message, history }),
      })
      const data = await res.json()
      const reply = typeof data?.reply === 'string'
        ? data.reply
        : "Sorry — I couldn't process that just now. Please try again."
      setMessages(m => [...m, { role: 'assistant', content: reply, escalated: !!data?.escalated }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Network error — please try again.' }])
    } finally {
      setSending(false)
    }
  }, [messages, sending])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      <style>{`
        @keyframes pbDot { 0%,80%,100% { opacity:.25; transform:translateY(0) } 40% { opacity:1; transform:translateY(-3px) } }
        @keyframes pbIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .pb-msg { animation: pbIn .18s ease both }
        .pb-launch:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(255,215,0,.28) }
        .pb-chip:hover { background: rgba(255,215,0,.10); border-color: rgba(255,215,0,.4); color:#f0f0f0 }
        .pb-send:hover:not(:disabled) { background:#ffdf33 }
      `}</style>

      {/* Floating launcher (bottom-right, inline-positioned so it's always visible) */}
      {!open && (
        <button onClick={() => setOpen(true)} className="pb-launch"
          style={{
            position: 'fixed', bottom: 22, right: 22, left: 'auto', zIndex: 45, display: 'flex', alignItems: 'center', gap: 9,
            padding: '11px 18px', borderRadius: 999, border: '1px solid rgba(255,215,0,.35)',
            background: 'linear-gradient(180deg,#15151c,#0e0e14)', color: GOLD, cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 700, boxShadow: '0 8px 22px rgba(0,0,0,.5)',
            transition: 'transform .15s, box-shadow .15s',
          }}>
          <Sparkles size={17} /> ProvBot
        </button>
      )}

      {/* Backdrop */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)' }} />}

      {/* Left-docked chat drawer */}
      <aside
        className="w-full sm:w-[384px]"
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 49,
          display: 'flex', flexDirection: 'column',
          background: '#0c0c12', borderRight: '1px solid rgba(255,215,0,.14)',
          boxShadow: open ? '0 0 60px rgba(0,0,0,.6)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-104%)',
          transition: 'transform .26s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: '1px solid #1a1a22' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(255,215,0,.12)', color: GOLD }}>
            <Sparkles size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#f3f3f3', fontSize: '0.95rem' }}>ProvBot</div>
            <div style={{ fontSize: '0.72rem', color: '#6a6a76' }}>Your Prov assistant</div>
          </div>
          {messages.length > 0 && (
            <button title="Clear chat" onClick={() => setMessages([])}
              style={{ background: 'none', border: 'none', color: '#5a5a66', cursor: 'pointer', padding: 6 }}>
              <Eraser size={16} />
            </button>
          )}
          <button title="Close" onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#8a8a96', cursor: 'pointer', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ margin: 'auto 0', textAlign: 'center', padding: '8px 6px' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: 'rgba(255,215,0,.1)', color: GOLD }}>
                <Sparkles size={22} />
              </div>
              <p style={{ color: '#cfcfd6', fontWeight: 700, marginBottom: 6 }}>How can I help?</p>
              <p style={{ color: '#6a6a76', fontSize: '0.82rem', marginBottom: 18, lineHeight: 1.5 }}>
                Ask about features, navigation, or let me help draft a message.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className="pb-chip" onClick={() => send(s)}
                    style={{ textAlign: 'left', padding: '10px 13px', borderRadius: 10, fontSize: '0.83rem',
                      background: 'rgba(255,255,255,.03)', border: '1px solid #20202a', color: '#aeaeb8',
                      cursor: 'pointer', transition: 'all .14s' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="pb-msg" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '86%', padding: '10px 13px', borderRadius: 13, fontSize: '0.86rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                ...(m.role === 'user'
                  ? { background: 'rgba(255,215,0,.13)', color: '#f4eccb', borderTopRightRadius: 4 }
                  : { background: '#15151d', color: '#dcdce2', border: '1px solid #20202a', borderTopLeftRadius: 4 }),
              }}>
                {m.content}
                {m.escalated && (
                  <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: GOLD, background: 'rgba(255,215,0,.1)', padding: '3px 8px', borderRadius: 6 }}>
                    <LifeBuoy size={12} /> Forwarded to support
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="pb-msg" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 4, padding: '12px 14px', background: '#15151d', border: '1px solid #20202a', borderRadius: 13, borderTopLeftRadius: 4 }}>
                {[0, 1, 2].map(d => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: 999, background: '#6a6a76', animation: `pbDot 1.2s ${d * 0.15}s infinite ease-in-out` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div style={{ padding: '12px 14px 16px', borderTop: '1px solid #1a1a22' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#15151d', border: '1px solid #24242e', borderRadius: 12, padding: '6px 6px 6px 12px' }}>
            <textarea ref={inputRef} value={input} rows={1}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }}
              onKeyDown={onKeyDown}
              placeholder="Message ProvBot…"
              style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#ececf0', fontSize: '0.86rem', lineHeight: 1.5, maxHeight: 120, fontFamily: 'inherit', padding: '5px 0' }} />
            <button className="pb-send" onClick={() => send(input)} disabled={sending || !input.trim()}
              style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: 'none', display: 'grid', placeItems: 'center',
                background: input.trim() && !sending ? GOLD : '#2a2a34', color: input.trim() && !sending ? '#0a0a0a' : '#666',
                cursor: input.trim() && !sending ? 'pointer' : 'default', transition: 'background .14s' }}>
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p style={{ fontSize: '0.66rem', color: '#4a4a55', textAlign: 'center', marginTop: 8 }}>
            ProvBot can make mistakes. Press Enter to send · Shift+Enter for a new line.
          </p>
        </div>
      </aside>
    </>
  )
}
