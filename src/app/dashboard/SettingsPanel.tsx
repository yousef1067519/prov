'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardShell from './DashboardShell'
import { BRANDING_KEY, type Branding } from './BrandingSettings'
import {
  User, Briefcase, CreditCard, Mail, Plug, Shield, Bell, Database,
  Upload, Image as ImageIcon, Check, Loader2, Download, ExternalLink, AlertTriangle, Palette,
} from 'lucide-react'
import { WhiteLabelTab } from './WhiteLabelTab'

type Tab = 'account' | 'branding' | 'whitelabel' | 'billing' | 'email' | 'integrations' | 'security' | 'notifications' | 'privacy'

const TABS: { id: Tab; label: string; Icon: typeof User }[] = [
  { id: 'account', label: 'Account', Icon: User },
  { id: 'branding', label: 'Branding', Icon: Briefcase },
  { id: 'whitelabel', label: 'White Labeling', Icon: Palette },
  { id: 'billing', label: 'Billing', Icon: CreditCard },
  { id: 'email', label: 'Email Preferences', Icon: Mail },
  { id: 'integrations', label: 'Integrations', Icon: Plug },
  { id: 'security', label: 'Security', Icon: Shield },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', Icon: Database },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} role="switch" aria-checked={on}
      style={{ width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: on ? '#FFD700' : '#2a2a2a', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: on ? '#0a0a0a' : '#777', transition: 'left 0.2s' }} />
    </button>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: 14, padding: 24, marginBottom: 16 }}>{children}</div>
}
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', fontWeight: 600, color: '#cfcfcf', marginBottom: 8 }}>
        {label}
        {optional && <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#888', background: 'rgba(255,255,255,0.05)', border: '1px solid #222', borderRadius: 999, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optional</span>}
      </label>
      {children}
    </div>
  )
}
function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid #161616' }}>
      <div>
        <p style={{ color: '#e8e8e8', fontWeight: 600, fontSize: '0.9375rem' }}>{title}</p>
        {desc && <p style={{ color: '#666', fontSize: '0.8125rem', marginTop: 2 }}>{desc}</p>}
      </div>
      {children}
    </div>
  )
}
function SaveBtn({ saving, saved, label = 'Save changes' }: { saving: boolean; saved: boolean; label?: string }) {
  return (
    <button type="submit" disabled={saving} className="btn-gold" style={{ padding: '11px 24px' }}>
      {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Saved</> : label}
    </button>
  )
}

const local = {
  get<T>(k: string, fb: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

export default function SettingsPanel({ email, accessType, daysLeft }: { email: string; accessType: string; daysLeft: number | null }) {
  const [tab, setTab] = useState<Tab>('account')
  useEffect(() => { if (new URLSearchParams(window.location.search).get('google')) setTab('integrations') }, [])
  return (
    <DashboardShell active="settings" email={email} accessType={accessType} daysLeft={daysLeft}>
      <div style={{ padding: '28px 28px', maxWidth: 1080, margin: '0 auto' }}>
        <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.625rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', marginBottom: 20 }}>Settings</h1>
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]" style={{ gap: 24, alignItems: 'flex-start' }}>
          {/* tab nav */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 72 }}>
            {TABS.map(t => {
              const on = tab === t.id
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.875rem', fontWeight: on ? 700 : 500, color: on ? '#FFD700' : '#9a9a9a', background: on ? 'rgba(255,215,0,0.1)' : 'transparent' }}>
                  <t.Icon size={16} /> {t.label}
                </button>
              )
            })}
          </nav>

          {/* content */}
          <div>
            {tab === 'account' && <AccountTab email={email} />}
            {tab === 'branding' && <BrandingTab />}
            {tab === 'whitelabel' && <WhiteLabelTab />}
            {tab === 'billing' && <BillingTab accessType={accessType} daysLeft={daysLeft} />}
            {tab === 'email' && <EmailPrefsTab />}
            {tab === 'integrations' && <IntegrationsTab />}
            {tab === 'security' && <SecurityTab />}
            {tab === 'notifications' && <NotificationsTab />}
            {tab === 'privacy' && <PrivacyTab />}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

/* ── Account ── */
function AccountTab({ email }: { email: string }) {
  const [form, setForm] = useState({ full_name: '', phone: '', bio: '' })
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false)
  useEffect(() => { setForm(local.get('prov_account', { full_name: '', phone: '', bio: '' })) }, [])
  function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false)
    local.set('prov_account', form)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) }, 300)
  }
  return (
    <form onSubmit={save}>
      <Card>
        <Field label="Full name"><input className="input-dark" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Yousef A" /></Field>
        <Field label="Email"><input className="input-dark" value={email} disabled style={{ opacity: 0.6 }} /></Field>
        <Field label="Phone"><input className="input-dark" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 123-4567" /></Field>
        <Field label="Bio"><textarea className="input-dark" rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="A short description of you or your agency." style={{ resize: 'vertical' }} /></Field>
        <SaveBtn saving={saving} saved={saved} />
      </Card>
    </form>
  )
}

/* ── Branding ── */
const B_EMPTY: Branding = { agency_name: '', agency_title: '', company_name: '', company_email: '', company_website: '', company_phone: '', company_logo_url: '' }
function BrandingTab() {
  const [form, setForm] = useState<Branding>(B_EMPTY)
  const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false); const [err, setErr] = useState('')
  useEffect(() => {
    try { const l = localStorage.getItem(BRANDING_KEY); if (l) setForm({ ...B_EMPTY, ...JSON.parse(l) }) } catch {}
    fetch('/api/profile').then(r => r.json()).then(d => { if (d.profile) setForm(p => ({ ...p, ...Object.fromEntries(Object.entries(d.profile).filter(([, v]) => v)) })) }).catch(() => {})
  }, [])
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(''); const f = e.target.files?.[0]; if (!f) return
    if (!f.type.startsWith('image/')) { setErr('Choose an image.'); return }
    if (f.size > 1.5 * 1024 * 1024) { setErr('Under 1.5 MB please.'); return }
    const r = new FileReader(); r.onload = () => setForm(p => ({ ...p, company_logo_url: String(r.result) })); r.readAsDataURL(f)
  }
  function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false)
    local.set(BRANDING_KEY, form)
    fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).catch(() => {})
      .finally(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000) })
  }
  const sig = `Best,\n${form.agency_name || 'Your Name'}\n${(form.agency_title || 'Title')} | ${(form.company_name || 'Company')}\n${form.company_email || 'you@company.com'}`
  return (
    <form onSubmit={save}>
      <Card>
        <Field label="Company logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <label style={{ width: 96, height: 96, borderRadius: 14, cursor: 'pointer', overflow: 'hidden', background: '#0d0d0d', border: form.company_logo_url ? '1px solid #1f1f1f' : '1.5px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.company_logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.company_logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                : <ImageIcon size={22} style={{ color: '#555' }} />}
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
            </label>
            <label className="btn-outline-gold" style={{ padding: '9px 16px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <Upload size={15} /> {form.company_logo_url ? 'Replace' : 'Upload'}
              <input type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
            </label>
            {form.company_logo_url && <button type="button" onClick={() => setForm({ ...form, company_logo_url: '' })} style={{ background: 'none', border: 'none', color: '#777', fontSize: '0.8125rem', cursor: 'pointer' }}>Remove</button>}
          </div>
          {err && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{err}</p>}
        </Field>
        {([['agency_name', 'Your full name', false], ['agency_title', 'Your title', false], ['company_name', 'Company name', false], ['company_email', 'Company email', false], ['company_website', 'Website', true], ['company_phone', 'Phone', true]] as const).map(([k, label, optional]) => (
          <Field key={k} label={label} optional={optional}><input className="input-dark" value={form[k]} placeholder={optional ? 'Optional' : undefined} onChange={e => setForm({ ...form, [k]: e.target.value })} /></Field>
        ))}
        <SaveBtn saving={saving} saved={saved} label="Save branding" />
      </Card>
      <Card>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 12 }}>Signature preview</p>
        <pre style={{ color: '#cfcfcf', fontSize: '0.875rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{sig}</pre>
      </Card>
    </form>
  )
}

/* ── Billing ── */
function BillingTab({ accessType, daysLeft }: { accessType: string; daysLeft: number | null }) {
  const [invoices, setInvoices] = useState<{ number?: string; brand_name?: string; amount: number; status: string }[]>([])
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalErr, setPortalErr] = useState('')
  useEffect(() => { fetch('/api/invoices').then(r => r.json()).then(d => setInvoices(d.invoices ?? [])).catch(() => {}) }, [])

  async function manageSubscription() {
    setPortalErr(''); setPortalBusy(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setPortalErr(data.error || 'Could not open billing portal.')
    } catch {
      setPortalErr('Could not reach billing. Try again.')
    }
    setPortalBusy(false)
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: '#666', fontSize: '0.8125rem' }}>Current plan</p>
            <p style={{ color: '#f5f5f5', fontWeight: 800, fontSize: '1.375rem', fontFamily: 'var(--font-display)' }}>Agency · $299/mo</p>
            <p style={{ color: accessType === 'trial' ? '#FFD700' : '#00D084', fontSize: '0.875rem', marginTop: 4 }}>
              {accessType === 'trial' ? `Trial — ${daysLeft ?? 0} days left` : accessType === 'lifetime' ? 'Active' : 'No active subscription'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={manageSubscription} disabled={portalBusy} className="btn-gold" style={{ padding: '10px 18px', fontSize: '0.875rem' }}>
              {portalBusy ? <Loader2 size={15} className="animate-spin" /> : <>Manage / cancel subscription <ExternalLink size={14} /></>}
            </button>
          </div>
        </div>
        {portalErr && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 12 }}>{portalErr}</p>}
        <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 12 }}>
          Opens Stripe&apos;s secure billing portal where you can cancel anytime, update your card, or download receipts.
          {' '}New here? <a href="/buy" style={{ color: '#FFD700' }}>Start a subscription</a>.
        </p>
      </Card>
      <Card>
        <p style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 12 }}>Invoice history</p>
        {invoices.length === 0 ? <p style={{ color: '#555', fontSize: '0.875rem' }}>No invoices yet.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {invoices.map((inv, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #161616', fontSize: '0.875rem' }}>
                <span style={{ color: '#d0d0d0', fontFamily: 'monospace' }}>{inv.number ?? '—'}</span>
                <span style={{ color: '#888' }}>{inv.brand_name}</span>
                <span style={{ color: '#d0d0d0', fontWeight: 700 }}>${Number(inv.amount).toLocaleString()}</span>
                <span style={{ color: inv.status === 'paid' ? '#00D084' : '#888', textTransform: 'capitalize' }}>{inv.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

/* ── Email preferences ── */
function EmailPrefsTab() {
  const [p, setP] = useState({ campaigns: true, replies: true, weekly: false, deals: true, digest: 'Weekly' })
  const [saved, setSaved] = useState(false)
  useEffect(() => { setP(local.get('prov_email_prefs', p)) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  function set<K extends keyof typeof p>(k: K, v: typeof p[K]) { const next = { ...p, [k]: v }; setP(next); local.set('prov_email_prefs', next); setSaved(true); setTimeout(() => setSaved(false), 1200) }
  return (
    <Card>
      {saved && <p style={{ color: '#00D084', fontSize: '0.8125rem', marginBottom: 8 }}>Saved.</p>}
      <Row title="Campaign notifications" desc="When a campaign sends or completes."><Toggle on={p.campaigns} onChange={v => set('campaigns', v)} /></Row>
      <Row title="Reply notifications" desc="When a creator or sponsor replies."><Toggle on={p.replies} onChange={v => set('replies', v)} /></Row>
      <Row title="Weekly report" desc="A summary of your week every Monday."><Toggle on={p.weekly} onChange={v => set('weekly', v)} /></Row>
      <Row title="Deal closed alerts" desc="When a deal is marked won."><Toggle on={p.deals} onChange={v => set('deals', v)} /></Row>
      <Row title="Digest frequency">
        <select className="input-dark" value={p.digest} onChange={e => set('digest', e.target.value)} style={{ width: 140 }}>
          {['Daily', 'Weekly', 'Monthly'].map(o => <option key={o}>{o}</option>)}
        </select>
      </Row>
    </Card>
  )
}

/* ── Integrations ── */
function WebhookIntegration({ service, hint }: { service: 'Slack' | 'Zapier'; hint: string }) {
  const KEY = `prov_webhook_${service.toLowerCase()}`
  const [url, setUrl] = useState('')
  const [connected, setConnected] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  useEffect(() => { const v = local.get<string>(KEY, ''); if (v) { setUrl(v); setConnected(true) } }, [KEY])

  function connect() {
    setErr(''); if (!url.trim()) { setErr('Paste your webhook URL.'); return }
    local.set(KEY, url.trim()); setConnected(true); setEditing(false)
  }
  function disconnect() { local.set(KEY, ''); setUrl(''); setConnected(false); setMsg(''); setErr('') }
  async function test() {
    setBusy(true); setMsg(''); setErr('')
    try {
      const res = await fetch('/api/integrations/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, service }) })
      const data = await res.json()
      if (data.ok) setMsg(`Test sent — check your ${service}.`)
      else setErr(data.error || 'Test failed.')
    } catch { setErr('Could not send test.') }
    setBusy(false)
  }

  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid #161616' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ color: '#e8e8e8', fontWeight: 600, fontSize: '0.9375rem' }}>{service}</p>
          <p style={{ color: connected ? '#00D084' : '#666', fontSize: '0.8125rem', marginTop: 2 }}>{connected ? 'Connected' : hint}</p>
        </div>
        {connected && !editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={test} disabled={busy} className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : 'Send test'}</button>
            <button onClick={disconnect} style={{ background: 'none', border: '1px solid #222', borderRadius: 8, color: '#888', padding: '7px 14px', fontSize: '0.8125rem', cursor: 'pointer' }}>Disconnect</button>
          </div>
        ) : null}
      </div>
      {(!connected || editing) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <input className="input-dark" value={url} onChange={e => setUrl(e.target.value)} placeholder={service === 'Slack' ? 'https://hooks.slack.com/services/…' : 'https://hooks.zapier.com/hooks/catch/…'} style={{ flex: '1 1 280px' }} />
          <button onClick={connect} className="btn-gold" style={{ padding: '0 18px', fontSize: '0.875rem' }}>Connect</button>
        </div>
      )}
      {msg && <p style={{ color: '#00D084', fontSize: '0.8125rem', marginTop: 8 }}>{msg}</p>}
      {err && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{err}</p>}
    </div>
  )
}

function GoogleRow() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  useEffect(() => {
    const c = document.cookie.split('; ').find(r => r.startsWith('prov_google_email='))
    if (c) setEmail(decodeURIComponent(c.split('=')[1] || ''))
  }, [])
  async function sendTest() {
    setBusy(true); setMsg(''); setErr('')
    try {
      const res = await fetch('/api/integrations/google/send-test', { method: 'POST' })
      const data = await res.json()
      if (data.ok) setMsg(`Test email sent to ${email} — check your inbox.`)
      else setErr(data.error || 'Send failed.')
    } catch { setErr('Could not send.') }
    setBusy(false)
  }
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid #161616' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ color: '#e8e8e8', fontWeight: 600, fontSize: '0.9375rem' }}>Google (Gmail + Calendar)</p>
          <p style={{ color: email ? '#00D084' : '#666', fontSize: '0.8125rem', marginTop: 2 }}>{email ? `Connected as ${email}` : 'Connect to send outreach from your own Gmail.'}</p>
        </div>
        {email
          ? <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={sendTest} disabled={busy} className="btn-outline-gold" style={{ padding: '7px 14px', fontSize: '0.8125rem' }}>{busy ? <Loader2 size={13} className="animate-spin" /> : 'Send test email'}</button>
              <a href="/api/integrations/google/disconnect" style={{ background: 'none', border: '1px solid #222', borderRadius: 8, color: '#888', padding: '7px 14px', fontSize: '0.8125rem', textDecoration: 'none' }}>Disconnect</a>
            </div>
          : <a href="/api/integrations/google" className="btn-gold" style={{ padding: '7px 16px', fontSize: '0.8125rem' }}>Connect</a>}
      </div>
      {msg && <p style={{ color: '#00D084', fontSize: '0.8125rem', marginTop: 8 }}>{msg}</p>}
      {err && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{err}</p>}
    </div>
  )
}

function IntegrationsTab() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const g = new URLSearchParams(window.location.search).get('google')
    if (g === 'connected') setNotice('Google connected.')
    else if (g === 'error') setNotice('Google connection failed. Try again.')
    else if (g === 'disconnected') setNotice('Google disconnected.')
  }, [])
  return (
    <Card>
      {notice && <p style={{ color: notice.includes('failed') ? '#f87171' : '#00D084', fontSize: '0.8125rem', marginBottom: 12 }}>{notice}</p>}
      <WebhookIntegration service="Slack" hint="Paste a Slack Incoming Webhook URL to get alerts in a channel." />
      <WebhookIntegration service="Zapier" hint="Paste a Zapier Catch Hook URL to connect 6,000+ apps." />
      <GoogleRow />
      <p style={{ color: '#555', fontSize: '0.8125rem', marginTop: 12, lineHeight: 1.6 }}>
        Connecting Google lets Prov send outreach from your own Gmail (better deliverability) and read your calendar.
        Gmail&apos;s send scope is &ldquo;restricted&rdquo; — it works now for you as a test user; public launch needs Google&apos;s security review.
      </p>
    </Card>
  )
}

/* ── Security (password change is real) ── */
function SecurityTab() {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  async function change(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setMsg('')
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setErr('Passwords do not match.'); return }
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password: pw })
    setBusy(false)
    if (error) setErr(error.message)
    else { setMsg('Password updated.'); setPw(''); setPw2('') }
  }
  return (
    <>
      <Card>
        <p style={{ color: '#f5f5f5', fontWeight: 700, marginBottom: 14 }}>Change password</p>
        {err && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginBottom: 10 }}>{err}</p>}
        {msg && <p style={{ color: '#00D084', fontSize: '0.8125rem', marginBottom: 10 }}>{msg}</p>}
        <form onSubmit={change}>
          <Field label="New password"><input type="password" className="input-dark" value={pw} onChange={e => setPw(e.target.value)} /></Field>
          <Field label="Confirm new password"><input type="password" className="input-dark" value={pw2} onChange={e => setPw2(e.target.value)} /></Field>
          <button type="submit" disabled={busy} className="btn-gold" style={{ padding: '11px 24px' }}>{busy ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}</button>
        </form>
      </Card>
      <Card>
        <Row title="Two-factor authentication" desc="Add an extra layer of security."><span style={{ color: '#666', fontSize: '0.8125rem' }}>Coming soon</span></Row>
        <Row title="Sign out everywhere" desc="End all other active sessions.">
          <button onClick={() => createClient().auth.signOut()} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>Sign out all</button>
        </Row>
      </Card>
    </>
  )
}

/* ── Notifications ── */
function NotificationsTab() {
  const [p, setP] = useState({ inApp: true, email: true, sms: false, sounds: true })
  useEffect(() => { setP(local.get('prov_notifications', p)) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  function set<K extends keyof typeof p>(k: K, v: typeof p[K]) { const next = { ...p, [k]: v }; setP(next); local.set('prov_notifications', next) }
  return (
    <Card>
      <Row title="In-app notifications"><Toggle on={p.inApp} onChange={v => set('inApp', v)} /></Row>
      <Row title="Email notifications"><Toggle on={p.email} onChange={v => set('email', v)} /></Row>
      <Row title="SMS notifications" desc="Requires a verified phone number."><Toggle on={p.sms} onChange={v => set('sms', v)} /></Row>
      <Row title="Notification sounds"><Toggle on={p.sounds} onChange={v => set('sounds', v)} /></Row>
    </Card>
  )
}

/* ── Privacy & data ── */
function PrivacyTab() {
  const [exporting, setExporting] = useState(false)
  async function exportData() {
    setExporting(true)
    const sb = createClient()
    const tables = ['campaigns', 'brands', 'invoices', 'contracts', 'responses', 'emails_sent']
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() }
    for (const t of tables) { const { data } = await sb.from(t).select('*'); out[t] = data ?? [] }
    try { out.branding = JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}') } catch {}
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'prov-data-export.json'; a.click(); URL.revokeObjectURL(url)
    setExporting(false)
  }
  return (
    <>
      <Card>
        <Row title="Export my data" desc="Download all your Prov data as JSON.">
          <button onClick={exportData} disabled={exporting} className="btn-outline-gold" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}>
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <><Download size={14} /> Export</>}
          </button>
        </Row>
        <Row title="Privacy policy"><a href="/privacy" style={{ color: '#FFD700', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>View <ExternalLink size={12} /></a></Row>
        <Row title="Terms of service"><a href="/terms" style={{ color: '#FFD700', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 5 }}>View <ExternalLink size={12} /></a></Row>
      </Card>
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ color: '#f87171', fontWeight: 700 }}>Delete account</p>
            <p style={{ color: '#888', fontSize: '0.8125rem', marginTop: 2 }}>Permanently deletes your account and all data. This cannot be undone.</p>
          </div>
        </div>
        <button onClick={() => alert('Account deletion is a protected action. Please email support@prov.com to confirm — we verify ownership before deleting any data.')}
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '9px 18px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
          Delete my account
        </button>
      </Card>
    </>
  )
}
