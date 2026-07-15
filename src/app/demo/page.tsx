'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

const inputStyle = { marginBottom: 14 }

export default function DemoPage() {
  const [form, setForm] = useState({
    agency_name: '', contact_name: '', email: '',
    team_size: '', clients_count: '', monthly_deals: '', priority_need: '', message: '',
  })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const res = await fetch('/api/demo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).catch(() => null)
    setState(res?.ok ? 'done' : 'error')
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <Nav />
      <main style={{ minHeight: '80vh', padding: '140px 24px 100px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <span className="badge-gold" style={{ marginBottom: 20, display: 'inline-flex' }}>Enterprise</span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14 }}>
            See Prov on your agency&apos;s real workflow
          </h1>
          <p style={{ color: '#888', fontSize: '1.05rem', marginBottom: 40, lineHeight: 1.6 }}>
            30-minute walkthrough with our team: institutional memory across every deal,
            2–3× more creator relationships per account manager, and the compliance &amp;
            audit trail your finance team will ask about. Pilots are provisioned within
            two business days of a qualified demo.
          </p>

          {state === 'done' ? (
            <div className="card-gold-border" style={{ padding: 32 }}>
              <h2 style={{ color: '#FFD700', fontSize: '1.3rem', marginBottom: 8 }}>Request received</h2>
              <p style={{ color: '#aaa', marginBottom: process.env.NEXT_PUBLIC_DEMO_BOOKING_URL ? 20 : 0 }}>
                We&apos;ll reach out at <strong style={{ color: '#f5f5f5' }}>{form.email}</strong> within one business day to schedule your walkthrough.
              </p>
              {process.env.NEXT_PUBLIC_DEMO_BOOKING_URL && (
                <a href={process.env.NEXT_PUBLIC_DEMO_BOOKING_URL} target="_blank" rel="noopener noreferrer"
                  className="btn-gold" style={{ display: 'inline-flex' }}>
                  Or book a time now
                </a>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="card-dark" style={{ padding: 32 }}>
              <input required className="input-dark" style={inputStyle} placeholder="Agency name *" value={form.agency_name} onChange={set('agency_name')} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <input required className="input-dark" style={inputStyle} placeholder="Your name *" value={form.contact_name} onChange={set('contact_name')} />
                <input required type="email" className="input-dark" style={inputStyle} placeholder="Work email *" value={form.email} onChange={set('email')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <select className="input-dark" style={inputStyle} value={form.team_size} onChange={set('team_size')}>
                  <option value="">Team size</option>
                  <option>1–4</option><option>5–14</option><option>15–49</option><option>50+</option>
                </select>
                <select className="input-dark" style={inputStyle} value={form.clients_count} onChange={set('clients_count')}>
                  <option value="">Clients/brands</option>
                  <option>1–3</option><option>4–10</option><option>11–25</option><option>25+</option>
                </select>
                <select className="input-dark" style={inputStyle} value={form.monthly_deals} onChange={set('monthly_deals')}>
                  <option value="">Deals / month</option>
                  <option>&lt;10</option><option>10–50</option><option>50–200</option><option>200+</option>
                </select>
              </div>
              <label style={{ display: 'block', color: '#888', fontSize: '0.8125rem', marginBottom: 8 }}>
                What do you need most right now?
              </label>
              <select className="input-dark" style={inputStyle} value={form.priority_need} onChange={set('priority_need')}>
                <option value="">Select what matters most (optional)</option>
                <option value="discovery">Finding &amp; vetting creators</option>
                <option value="outreach">Outreach that doesn&apos;t rely on one person&apos;s inbox</option>
                <option value="pipeline">Keeping deals organized (not losing track in a CRM/sheet)</option>
                <option value="contracts">Contracts &amp; getting agreements signed faster</option>
                <option value="invoicing">Invoicing &amp; getting paid on time</option>
                <option value="compliance">FTC disclosure &amp; compliance risk</option>
                <option value="memory">Not losing deal history when someone leaves</option>
                <option value="reporting">Client-ready reporting</option>
                <option value="other">Something else</option>
              </select>
              <textarea className="input-dark" rows={4} style={inputStyle} placeholder="What does your current workflow look like? (spreadsheets, inboxes, tools…)" value={form.message} onChange={set('message')} />
              <button type="submit" className="btn-gold" disabled={state === 'sending'} style={{ width: '100%' }}>
                {state === 'sending' ? 'Sending…' : 'Request a demo'}
              </button>
              {state === 'error' && <p style={{ color: '#f87171', marginTop: 12, fontSize: 14 }}>Something went wrong — email us directly and we&apos;ll set it up.</p>}
              <p style={{ color: '#555', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
                Transparent pricing, in writing, before you commit — and it never increases on you.
              </p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
