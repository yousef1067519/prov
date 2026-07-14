'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}

export default function ComboboxSearch({ label, value, onChange, options, placeholder = 'Search…' }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const ql = q.trim().toLowerCase()
  const filtered = ql ? options.filter(o => o.toLowerCase().includes(ql)).slice(0, 60) : options.slice(0, 60)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {label && <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#FFD700', marginBottom: 6 }}>{label}</label>}
      <button type="button" onClick={() => { setOpen(o => !o); setQ('') }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: '10px 12px', color: value ? '#f5f5f5' : '#4e4e4e', fontSize: '0.9375rem', cursor: 'pointer' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || (label ? `Any ${label.toLowerCase()}` : placeholder)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {value && <X size={14} style={{ color: '#777' }} onClick={e => { e.stopPropagation(); onChange('') }} />}
          <ChevronDown size={15} style={{ color: '#777' }} />
        </span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid #222' }}>
            <Search size={14} style={{ color: '#555' }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: '0.875rem', padding: '11px 0' }} />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0 && <p style={{ color: '#555', fontSize: '0.8125rem', textAlign: 'center', padding: '16px 0' }}>No matches</p>}
            {filtered.map(o => (
              <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: o === value ? 'rgba(255,215,0,0.1)' : 'transparent', border: 'none', borderRadius: 7, padding: '8px 12px', color: o === value ? '#FFD700' : '#cfcfcf', fontSize: '0.875rem', cursor: 'pointer' }}
                onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = o === value ? 'rgba(255,215,0,0.1)' : 'transparent' }}>
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
