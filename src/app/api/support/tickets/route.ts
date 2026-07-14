import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createTicketAndEscalate, ESCALATION_REPLY, type Priority } from '@/lib/tickets'

function client(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

async function uid(supabase: ReturnType<typeof client>): Promise<string | null> {
  if (process.env.DEV_BYPASS_AUTH === 'true') return 'dev-user'
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

const PRIORITIES = new Set<Priority>(['low', 'medium', 'high'])

// Create a ticket (and fire the backend-only escalation email).
export async function POST(req: NextRequest) {
  const supabase = client(await cookies())
  const userId = await uid(supabase)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })
  const priority: Priority | undefined = PRIORITIES.has(body?.priority) ? body.priority : undefined

  try {
    const { id } = await createTicketAndEscalate(supabase, userId, message, {
      priority,
      metadata: { source: 'support_form' },
    })
    // Never expose the support inbox or internal details — only the safe message + ticket id.
    return NextResponse.json({ ok: true, ticketId: id, message: ESCALATION_REPLY })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// List the current user's own tickets (RLS-scoped).
export async function GET() {
  const supabase = client(await cookies())
  const userId = await uid(supabase)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, message, status, priority, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ tickets: [], error: error.message })
  return NextResponse.json({ tickets: data ?? [] })
}
