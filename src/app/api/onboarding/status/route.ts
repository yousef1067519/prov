import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// GET — workspace setup progress for the dashboard's "Get set up" checklist.
// Each flag is derived from real data (not a stored boolean), so it stays true
// for every member of the workspace and can't drift out of sync.
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = { branding: false, google: false, clients: false, contacts: false, team: false, sequences: false }

  try {
    const { data: p } = await ctx.sb.from('profiles')
      .select('agency_name, company_name').eq('id', ctx.userId).maybeSingle()
    status.branding = Boolean(p?.agency_name && p?.company_name)
  } catch { /* leave false */ }

  try {
    const { count } = await ctx.sb.from('google_tokens')
      .select('*', { count: 'exact', head: true }).eq('user_id', ctx.userId)
    status.google = (count ?? 0) > 0
  } catch { /* leave false */ }

  if (ctx.workspaceId) {
    const wsCount = async (table: string) => {
      try {
        const { count } = await ctx.sb.from(table)
          .select('*', { count: 'exact', head: true }).eq('workspace_id', ctx.workspaceId)
        return (count ?? 0) > 0
      } catch { return false }
    }
    status.clients = await wsCount('clients')
    status.contacts = await wsCount('contacts')
    status.sequences = await wsCount('outreach_sequences')
  }

  try {
    const { count } = await ctx.sb.from('team_members')
      .select('*', { count: 'exact', head: true }).eq('owner_id', ctx.userId).neq('status', 'removed')
    status.team = (count ?? 0) > 0
  } catch { /* leave false */ }

  return NextResponse.json({ status })
}
