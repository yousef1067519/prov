// §8.6 invoice money math. ALL money is INTEGER CENTS end to end.
// Tax is basis points (825 = 8.25%) and is rounded HALF-UP exactly ONCE,
// on the invoice subtotal — never per line, never through floats.

export interface InvoiceLineItem {
  description: string
  qty: number        // integer
  unit_cents: number // integer cents
}

export interface InvoiceTotals {
  subtotal_cents: number
  tax_cents: number
  total_cents: number
}

export const INVOICE_TERMS = ['due_on_receipt', 'net_15', 'net_30', 'net_45'] as const
export type InvoiceTerms = (typeof INVOICE_TERMS)[number]
export const TERMS_DAYS: Record<InvoiceTerms, number> = {
  due_on_receipt: 0, net_15: 15, net_30: 30, net_45: 45,
}
export const TERMS_LABEL: Record<InvoiceTerms, string> = {
  due_on_receipt: 'Due on receipt', net_15: 'Net 15', net_30: 'Net 30', net_45: 'Net 45',
}

export const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'void'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

const toInt = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

/** Coerce untrusted JSON into clean integer-cent line items. */
export function sanitizeLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(r => {
      const o = (r ?? {}) as Record<string, unknown>
      return {
        description: String(o.description ?? '').slice(0, 500),
        qty: Math.max(0, toInt(o.qty ?? 1)),
        unit_cents: Math.max(0, toInt(o.unit_cents)),
      }
    })
    .filter(li => li.description.trim().length > 0 || li.unit_cents > 0)
}

/** Amount of one line, integer cents. */
export function lineAmountCents(li: InvoiceLineItem): number {
  return toInt(li.qty) * toInt(li.unit_cents)
}

/**
 * Exact totals. Tax = round-half-up(subtotal × tax_bps / 10000) computed
 * once via BigInt so no float ever touches a total.
 */
export function computeTotals(items: InvoiceLineItem[], taxBps: number): InvoiceTotals {
  const subtotal = items.reduce((s, li) => s + lineAmountCents(li), 0)
  const bps = Math.min(10000, Math.max(0, toInt(taxBps)))
  const tax = Number((BigInt(subtotal) * BigInt(bps) + BigInt(5000)) / BigInt(10000)) // half-up
  return { subtotal_cents: subtotal, tax_cents: tax, total_cents: subtotal + tax }
}

/** INV-00042 */
export function formatInvoiceNumber(n: number | null | undefined): string {
  return `INV-${String(Math.max(0, toInt(n ?? 0))).padStart(5, '0')}`
}

/** Due date (yyyy-mm-dd) from an issue date + terms. */
export function dueDateFor(issueDate: string, terms: InvoiceTerms): string {
  const d = new Date(`${issueDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + (TERMS_DAYS[terms] ?? 30))
  return d.toISOString().slice(0, 10)
}

/** Display formatting only — never used for arithmetic. */
export function formatCents(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
