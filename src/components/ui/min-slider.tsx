'use client'

interface Props {
  label: string
  value: number
  onChange: (n: number) => void
  max?: number          // slider ceiling (number input can exceed it)
  step?: number
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export default function MinSlider({ label, value, onChange, max = 1_000_000, step = 10_000 }: Props) {
  const pct = Math.min(100, (Math.min(value, max) / max) * 100)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#FFD700' }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>min</span>
          <input
            type="number" min={0} value={value}
            onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}
            style={{ width: 96, background: '#1a1a1a', border: '1px solid #333', borderRadius: 7, padding: '5px 8px', color: '#f5f5f5', fontSize: '0.8125rem', textAlign: 'right' }}
          />
        </div>
      </div>
      <input
        type="range" min={0} max={max} step={step} value={Math.min(value, max)}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', height: 6, borderRadius: 999, appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer', background: `linear-gradient(90deg, #CA8A04 0%, #FFD700 ${pct}%, #222 ${pct}%, #222 100%)` }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.6875rem', color: '#555' }}>
        <span>0</span>
        <span style={{ color: '#888' }}>{fmt(value)}{value > max ? ' (typed)' : ''}</span>
        <span>{fmt(max)}+</span>
      </div>
    </div>
  )
}
