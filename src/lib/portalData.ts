export interface Approval {
  id: string
  title: string
  preview?: string
  content_url?: string
  status: 'pending' | 'approved' | 'changes_requested'
  comments?: string
}
export interface PortalMessage { id: string; sender: 'client' | 'agency'; message: string; created_at: string }

export interface PortalPayload {
  campaign: { id: string; name: string; niche: string; status: string; created_at: string }
  client: { name: string; email: string }
  agency: { name: string; logo?: string; brand: string }
  progress: { creatorsSelected: number; influencersConfirmed: number; sponsorsContacted: number; stepLabel: string; stepIndex: number; totalSteps: number }
  metrics: { emailsSent: number; openRate: number; replies: number; dealsClosed: number; revenue: number }
  timeline: { label: string; date: string; done: boolean }[]
  approvals: Approval[]
  messages: PortalMessage[]
  demo: boolean
}

export function newToken(): string {
  return (Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)).toLowerCase()
}

export function demoPayload(token: string): PortalPayload {
  const start = new Date(Date.now() - 24 * 864e5)
  return {
    campaign: { id: token, name: 'Q2 Tech Creator Push', niche: 'Tech', status: 'active', created_at: start.toISOString() },
    client: { name: 'Acme Brands', email: 'marketing@acme.com' },
    agency: { name: 'Your Agency', brand: 'Prov' },
    progress: { creatorsSelected: 60, influencersConfirmed: 8, sponsorsContacted: 24, stepLabel: 'Outreach in progress', stepIndex: 2, totalSteps: 4 },
    metrics: { emailsSent: 84, openRate: 67.8, replies: 19, dealsClosed: 6, revenue: 41500 },
    timeline: [
      { label: 'Campaign kickoff', date: start.toLocaleDateString(), done: true },
      { label: 'Creators shortlisted', date: new Date(start.getTime() + 4 * 864e5).toLocaleDateString(), done: true },
      { label: 'Outreach sent', date: new Date(start.getTime() + 9 * 864e5).toLocaleDateString(), done: true },
      { label: 'Content review', date: new Date(start.getTime() + 20 * 864e5).toLocaleDateString(), done: false },
      { label: 'Go live', date: new Date(start.getTime() + 30 * 864e5).toLocaleDateString(), done: false },
    ],
    approvals: [
      { id: 'a1', title: 'Marques Lee — Integration script', preview: '60-second mid-roll mentioning the spring feature set. Tone: upbeat, factual.', status: 'pending' },
      { id: 'a2', title: 'Ava Tech — Instagram Reel concept', preview: 'Unboxing + 3 quick tips. CTA to link in bio.', status: 'pending' },
      { id: 'a3', title: 'Campaign hashtag set', preview: '#AcmeSpring #BuiltWithAcme', status: 'approved' },
    ],
    messages: [
      { id: 'm1', sender: 'agency', message: 'Welcome to your campaign portal! You can review and approve creator content here. Reach out anytime.', created_at: new Date(start.getTime() + 1 * 864e5).toISOString() },
    ],
    demo: true,
  }
}
