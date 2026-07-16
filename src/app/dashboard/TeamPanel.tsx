'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, UserPlus, Loader2, Trash2, Activity, Clock, ShieldCheck } from 'lucide-react'
import DashboardShell from './DashboardShell'
import TeamAssignments from './TeamAssignments'

type Role = 'Admin' | 'Manager' | 'Team Member'
interface Member { id: string; member_email: string; role: Role; status: 'pending' | 'active' | 'removed'; created_at: string }
interface ActivityRow { id: string; actor_email: string | null; action: string; resource_type: string | null; meta: Record<string, unknown>; created_at: string }

// §8.9 enterprise RBAC (workspace_members): five roles + per-client grants.
type WsRole = 'owner' | 'admin' | 'account_manager' | 'analyst' | 'client_viewer'
interface WsMember { id: string; user_id: string | null; invited_email: string | null; role: WsRole; status: string; client_ids: string[] }
interface WsClient { id: string; name: string }
const WS_ROLES: WsRole[] = ['owner', 'admin', 'account_manager', 'analyst', 'client_viewer']
const WS_ROLE_LABEL: Record<WsRole, string> = {
  owner: 'Owner', admin: 'Admin', account_manager: 'Account manager',
  analyst: 'Analyst', client_viewer: 'Client viewer',
}

const ROLES: Role[] = ['Admin', 'Manager', 'Team Member']
const ROLE_DESC: Record<Role, string> = {
  Admin: 'Full access — manage team, settings, all campaigns',
  Manager: 'Create/edit campaigns, add notes, view activity',
  'Team Member': 'View assigned campaigns, add notes',
}
const ACTION_LABEL: Record<string, string> = {
  invited_member: 'invited', updated_member: 'updated', removed_member: 'removed',
}

const input: React.CSSProperties = { background: '#0d0d0d', border: '1px solid #222', borderRadius: 8, color: '#e8e8e8', fontSize: '0.875rem', padding: '9px 11px', outline: 'none' }

export default function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([])
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('Team Member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const [wsMembers, setWsMembers] = useState<WsMember[]>([])
  const [wsClients, setWsClients] = useState<WsClient[]>([])
  const [myWsRole, setMyWsRole] = useState<string | null>(null)
  const [canManage, setCanManage] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, a] = await Promise.all([fetch('/api/team/members'), fetch('/api/team/activity')])
      const md = await m.json(); const ad = await a.json()
      setMembers(md.members ?? []); setActivity(ad.activity ?? []); setCanManage(!!md.canManage)
    } catch {}
    try {
      const d = await (await fetch('/api/team/roles')).json()
      setWsMembers(d.members ?? []); setWsClients(d.clients ?? []); setMyWsRole(d.myRole ?? null)
    } catch { /* 0020 not applied yet */ }
  }, [])
  useEffect(() => { load() }, [load])

  async function invite() {
    setError(''); setInviting(true)
    try {
      const res = await fetch('/api/team/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Invite failed')
      setEmail(''); setRole('Team Member'); load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Invite failed') }
    setInviting(false)
  }

  async function changeRole(id: string, newRole: Role) {
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role: newRole } : m))
    await fetch(`/api/team/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }) })
    load()
  }
  async function remove(id: string) {
    if (!confirm('Remove this member from your team?')) return
    setMembers(ms => ms.filter(m => m.id !== id))
    await fetch(`/api/team/members/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <DashboardShell active="team">
      <div style={{ padding: '24px 28px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={22} style={{ color: '#FFD700' }} />
          <h1 style={{ color: '#f5f5f5', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>Team</h1>
        </div>
        <p style={{ color: '#666', marginTop: 4, marginBottom: 24 }}>Invite teammates, set their roles, and track activity across your workspace.</p>

        {/* Invite — managers only */}
        {canManage && (
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 14, padding: '18px 20px', marginBottom: 22 }}>
          <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={16} style={{ color: '#FFD700' }} /> Invite a member</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && invite()} placeholder="teammate@email.com" style={{ ...input, flex: '1 1 240px' }} />
            <select value={role} onChange={e => setRole(e.target.value as Role)} style={input}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={invite} disabled={inviting || !email.trim()} className="btn-gold" style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {inviting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Invite
            </button>
          </div>
          <p style={{ color: '#666', fontSize: '0.75rem', marginTop: 8 }}>{ROLE_DESC[role]}</p>
          {error && <p style={{ color: '#f87171', fontSize: '0.8125rem', marginTop: 8 }}>{error}</p>}
        </div>
        )}

        {/* Members */}
        <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>Members</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
          {members.length === 0 && <p style={{ color: '#555', fontSize: '0.875rem', padding: '20px 0', textAlign: 'center' }}>No team members yet. Invite someone above.</p>}
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg,#FFD700,#CA8A04)', display: 'grid', placeItems: 'center', fontWeight: 800, color: '#0a0a0a', flexShrink: 0 }}>{m.member_email.charAt(0).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#e8e8e8', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_email}</p>
                  {m.status === 'pending' && <span style={{ fontSize: '0.7rem', color: '#ffca28', background: 'rgba(255,193,7,.12)', padding: '1px 7px', borderRadius: 5 }}>Pending</span>}
                  {m.status === 'active' && <span style={{ fontSize: '0.7rem', color: '#5dd47a', display: 'inline-flex', alignItems: 'center', gap: 3 }}><ShieldCheck size={11} /> Active</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {canManage ? (
                  <>
                    <select value={m.role} onChange={e => changeRole(m.id, e.target.value as Role)} style={{ ...input, padding: '6px 9px' }}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button onClick={() => remove(m.id)} title="Remove" style={{ display: 'flex', padding: '7px 9px', borderRadius: 8, background: 'rgba(255,92,92,.08)', border: '1px solid rgba(255,92,92,.25)', color: '#ff7a7a', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </>
                ) : (
                  <span style={{ color: '#888', fontSize: '0.8rem', border: '1px solid #222', borderRadius: 7, padding: '5px 11px' }}>{m.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise roles & client access (workspace_members, 0020) */}
        {wsMembers.length > 0 && (
          <>
            <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>Roles &amp; client access</h2>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: 12 }}>
              Enforced at the database layer. Client viewers only ever see the clients checked below —
              every change here lands in the audit trail.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30 }}>
              {wsMembers.map(m => {
                const label = m.invited_email ?? m.user_id ?? 'member'
                const canEdit = canManage // server-verified owner/admin; fails closed otherwise
                return (
                  <div key={m.id} style={{ background: '#0e0e0e', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ color: '#e8e8e8', fontSize: '0.875rem' }}>{label}</span>
                      <select
                        value={m.role} disabled={!canEdit}
                        onChange={async e => {
                          await fetch('/api/team/roles', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: m.id, role: e.target.value }) })
                          load()
                        }}
                        style={{ ...input, padding: '6px 9px' }}
                      >
                        {WS_ROLES.map(r => <option key={r} value={r}>{WS_ROLE_LABEL[r]}</option>)}
                      </select>
                    </div>
                    {m.role === 'client_viewer' && wsClients.length > 0 && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                        {wsClients.map(c => (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#999', fontSize: '0.78rem', cursor: canEdit ? 'pointer' : 'default' }}>
                            <input
                              type="checkbox" disabled={!canEdit}
                              checked={m.client_ids.includes(c.id)}
                              onChange={async e => {
                                await fetch('/api/team/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: m.id, client_id: c.id, grant: e.target.checked }) })
                                load()
                              }}
                            />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Activity */}
        {/* Assignments: manager assigns work, members see it on their dashboard */}
        <TeamAssignments memberEmails={members.filter(m => m.status !== 'removed').map(m => m.member_email)} />

        <h2 style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} style={{ color: '#FFD700' }} /> Activity</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activity.length === 0 && <p style={{ color: '#555', fontSize: '0.875rem', padding: '16px 0', textAlign: 'center' }}>No activity yet.</p>}
          {activity.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,.02)', border: '1px solid #161616', borderRadius: 9 }}>
              <span style={{ color: '#bbb', fontSize: '0.82rem' }}>
                <span style={{ color: '#FFD700' }}>{ACTION_LABEL[a.action] ?? a.action.replace(/_/g, ' ')}</span>
                {a.actor_email ? ` · ${a.actor_email}` : ''}
                {a.meta?.role ? ` (${String(a.meta.role)})` : ''}
              </span>
              <span style={{ color: '#555', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><Clock size={11} /> {new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
