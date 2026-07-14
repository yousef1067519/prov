// CAN-SPAM footer for outbound outreach. Uses the per-email tracking_id as the
// opt-out token so no recipient PII appears in the URL.

export function unsubscribeFooter(origin: string, trackingId: string, company?: string): string {
  const url = `${origin}/unsubscribe?t=${trackingId}`
  const addr = process.env.COMPANY_ADDRESS
  return [
    '',
    '—',
    `You received this because ${company || 'we'} reached out about a potential collaboration.`,
    `If you'd prefer not to hear from us, unsubscribe here: ${url}`,
    addr ? addr : '',
  ].filter(Boolean).join('\n')
}
