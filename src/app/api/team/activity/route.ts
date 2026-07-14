import { NextResponse } from 'next/server'
import { apiCtx } from '@/lib/apiUser'

// GET — the owner's team activity feed (most recent first).
export async function GET() {
  const ctx = await apiCtx()
  if (!ctx) return NextResponse.json({ activity: [] })
  const { data } = await ctx.sb
    .from('team_activity_log')
    .select('id, actor_email, action, resource_type, resource_id, meta, created_at')
    .eq('owner_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(100)
  return NextResponse.json({ activity: data ?? [] })
}
