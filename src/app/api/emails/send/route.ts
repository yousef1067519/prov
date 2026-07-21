import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { getGoogleAccess, sendGmail } from '@/lib/google'
import { apiCtx, serviceClient } from '@/lib/apiUser'
import { unsubscribeFooter } from '@/lib/unsubscribe'
import { creditStatus } from '@/lib/credits'

import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campaign_id, emails, sequence_id } = body
  // emails: Array<{ to, subject, body, recipient_type: 'creator'|'sponsor',
  //   follow_ups?: Array<{ subject, body, days }> }>  — follow-ups are queued in
  //   scheduled_emails and sent by /api/cron/followups unless the recipient replies.

  if (!emails?.length) {
    return NextResponse.json({ error: 'No emails to send' }, { status: 400 })
  }

  // Workspace identity (for suppression scoping + reliable tracking writes).
  const ctx = await apiCtx()
  const sb = ctx?.sb ?? serviceClient()
  const ownerId = ctx?.userId ?? null
  const origin = req.nextUrl.origin

  // Resolve a REAL campaigns row id — emails_sent.campaign_id is a NOT NULL FK,
  // and the client may pass a local-only id (e.g. "local-…"). Without this,
  // tracking inserts fail silently and Reply Radar never sees the send.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  // §8.4: optional approved-sequence stamp — spread into inserts only when
  // present, so pre-0023 databases (no sequence_id column) are unaffected.
  const seqId: string | null = UUID_RE.test(String(sequence_id ?? '')) ? sequence_id : null
  const seqStamp = seqId ? { sequence_id: seqId } : {}
  let trackCampaignId: string | null = null
  if (ownerId) {
    if (UUID_RE.test(String(campaign_id))) {
      const { data } = await sb.from('campaigns').select('id').eq('id', campaign_id).maybeSingle()
      if (data) trackCampaignId = data.id
    }
    if (!trackCampaignId) {
      const { data } = await sb.from('campaigns').insert({
        user_id: ownerId,
        name: `Outreach ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        status: 'active',
      }).select('id').single()
      trackCampaignId = data?.id ?? null
    }
  }

  // Two layers of send gating:
  //  1. PLAN CREDITS (trial/starter/premium only) — the monetization lever.
  //     Growth/Enterprise/legacy tiers are uncapped here.
  //  2. Flat deliverability throttle (everyone) — 500 per rolling 4h protects
  //     the sender's domain reputation; not a monetization lever.
  const THROTTLE_PER_WINDOW = 500
  const WINDOW_HOURS = 4
  let creditsLeft = Infinity
  if (ownerId) {
    const { data: profile } = await sb.from('profiles')
      .select('access_type').eq('id', ownerId).maybeSingle()
    const credits = await creditStatus(sb, ownerId, profile?.access_type)
    if (credits.cap !== null && credits.left <= 0) {
      const isTrial = credits.window === 'lifetime'
      return NextResponse.json({
        error: 'credits',
        message: isTrial
          ? 'Your free trial credits are used up — pick a plan to keep sending. Everything you built is saved.'
          : `You've used all ${credits.cap} sends on the ${credits.planLabel} plan this month. Upgrade for more, or credits refill as sends age past 30 days.`,
        plan: credits.planLabel,
        upgradeUrl: '/plans',
      }, { status: 402 })
    }

    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString()
    const { count } = await sb.from('emails_sent')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ownerId).gte('created_at', since)
    const throttleLeft = Math.max(0, THROTTLE_PER_WINDOW - (count ?? 0))
    if (throttleLeft <= 0) {
      return NextResponse.json({
        error: 'throttle',
        message: `Send window full (${THROTTLE_PER_WINDOW} per ${WINDOW_HOURS} hours — this protects your domain reputation). It refills as earlier sends age out.`,
      }, { status: 429 })
    }
    creditsLeft = Math.min(throttleLeft, credits.left)
  }

  // CAN-SPAM: never send to recipients who have opted out of this workspace.
  let suppressed = new Set<string>()
  if (ownerId) {
    try {
      const { data } = await sb.from('email_suppressions').select('email').eq('owner_id', ownerId)
      suppressed = new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()))
    } catch { /* table may not exist yet — don't block sending */ }
  }

  // Prefer sending from the user's connected Gmail; fall back to Resend, then simulate.
  const gmail = await getGoogleAccess().catch(() => null)
  const transport: 'gmail' | 'resend' | 'simulated' = gmail ? 'gmail' : process.env.RESEND_API_KEY ? 'resend' : 'simulated'
  let refreshedCookie = gmail?.refreshedCookie

  const results = []
  for (const email of emails) {
    if (suppressed.has(String(email.to).toLowerCase())) {
      results.push({ email: email.to, status: 'skipped', reason: 'unsubscribed' })
      continue
    }
    if (creditsLeft <= 0) {
      results.push({ email: email.to, status: 'blocked', reason: 'throttled' })
      continue
    }
    const tracking_id = randomUUID()
    const fullBody = email.body + '\n' + unsubscribeFooter(origin, tracking_id)
    try {
      if (transport === 'gmail') {
        const acc = await getGoogleAccess()
        if (!acc) throw new Error('Gmail disconnected')
        if (acc.refreshedCookie) refreshedCookie = acc.refreshedCookie
        await sendGmail(acc.token, email.to, email.subject, fullBody)
      } else if (transport === 'resend') {
        await sendEmail({ to: email.to, subject: email.subject, body: fullBody })
      }
      // transport === 'simulated' → no-op (dev without any email transport)

      // Track the send — non-fatal, but log failures (a lost row here means
      // Reply Radar can never match this recipient's reply).
      let id: string | undefined
      if (ownerId && trackCampaignId) {
        const { data, error } = await sb.from('emails_sent').insert({
          user_id: ownerId,
          campaign_id: trackCampaignId,
          recipient_email: email.to,
          recipient_name: email.recipient_name ?? null,
          recipient_type: email.recipient_type ?? 'creator',
          subject: email.subject,
          body: fullBody,
          status: 'sent',
          tracking_id,
          ...seqStamp,
        }).select().single()
        id = data?.id
        if (error) console.error('emails_sent tracking insert failed:', error.message)
      }

      // Queue automatic follow-ups (skipped later if the recipient replies).
      if (Array.isArray(email.follow_ups) && email.follow_ups.length) {
        try {
          await sb.from('scheduled_emails').insert(
            email.follow_ups.slice(0, 3).map((f: { subject: string; body: string; days: number }) => ({
              owner_id: ownerId,
              campaign_id: trackCampaignId,
              recipient_email: email.to,
              recipient_name: email.recipient_name ?? null,
              recipient_type: email.recipient_type ?? 'creator',
              subject: f.subject,
              body: f.body,
              send_at: new Date(Date.now() + Math.max(1, Number(f.days) || 3) * 864e5).toISOString(),
              ...seqStamp,
            })),
          )
        } catch { /* table not migrated yet — first email still sent */ }
      }

      // Lock this creator against other workspaces for the cooldown window —
      // the creators table is shared, so without this two customers could
      // both cold-email the same person the same week. Awaited (not fire-and-
      // forget) because serverless functions can freeze right after the response.
      if (ownerId && (email.recipient_type ?? 'creator') === 'creator') {
        try {
          await sb.from('creators')
            .update({ last_contacted_at: new Date().toISOString(), contacted_by: ownerId })
            .ilike('email', email.to)
        } catch { /* non-fatal — send already succeeded */ }
      }

      creditsLeft--
      results.push({ email: email.to, status: 'sent', id })
    } catch (err) {
      results.push({ email: email.to, status: 'error', error: String(err) })
    }
  }

  const sent = results.filter(r => r.status === 'sent').length
  const skipped = results.filter(r => r.status === 'skipped').length
  const blocked = results.filter(r => r.status === 'blocked').length
  const res = NextResponse.json({ results, transport, sent, skipped, blocked })
  if (refreshedCookie) {
    res.cookies.set('prov_google_tokens', refreshedCookie, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
  }
  return res
}
