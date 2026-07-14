import { jsPDF } from 'jspdf'
import { formatCents, formatInvoiceNumber, TERMS_LABEL, type InvoiceTerms, type InvoiceLineItem, lineAmountCents } from './invoice-money'

// §8.6 finance-grade invoice PDF. White, printable, aligned columns, exact
// cent math — the client sees the AGENCY's brand, never Prov's.

export interface InvoicePdfInput {
  invoice_number: number | null
  brand_name?: string | null       // bill-to
  line_items: InvoiceLineItem[]
  subtotal_cents: number
  tax_bps: number
  tax_cents: number
  total_cents: number
  currency: string
  issue_date: string
  due_date: string
  terms: InvoiceTerms
  late_fee_note?: string | null
  agency?: { name?: string; email?: string; website?: string; address?: string }
  remittance?: Record<string, string>
}

const M = 20
const RIGHT = 210 - M

export function generateInvoicePdf(inv: InvoicePdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const cur = inv.currency || 'USD'
  const money = (c: number) => formatCents(c, cur)
  let y = 24

  // Agency header (their brand, not Prov's).
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17)
  doc.text(inv.agency?.name ?? 'Agency', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110)
  let hy = y
  for (const line of [inv.agency?.address, inv.agency?.email, inv.agency?.website].filter(Boolean) as string[]) {
    hy += 5; doc.text(line, M, hy)
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(17)
  doc.text('INVOICE', RIGHT, y, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(80)
  doc.text(formatInvoiceNumber(inv.invoice_number), RIGHT, y + 7, { align: 'right' })

  y = Math.max(hy, y + 10) + 12
  doc.setDrawColor(220); doc.setLineWidth(0.3); doc.line(M, y, RIGHT, y)
  y += 10

  // Bill-to + dates.
  doc.setFontSize(8.5); doc.setTextColor(140); doc.text('BILL TO', M, y)
  doc.setFontSize(11); doc.setTextColor(17); doc.setFont('helvetica', 'bold')
  doc.text(inv.brand_name ?? '—', M, y + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(80)
  const meta: Array<[string, string]> = [
    ['Issue date', inv.issue_date],
    ['Due date', inv.due_date],
    ['Terms', TERMS_LABEL[inv.terms] ?? inv.terms],
  ]
  meta.forEach(([k, v], i) => {
    doc.setTextColor(140); doc.text(k, RIGHT - 52, y + i * 6)
    doc.setTextColor(17); doc.text(v, RIGHT, y + i * 6, { align: 'right' })
  })
  y += 24

  // Line items table.
  const cols = { desc: M, qty: 132, unit: 156, amt: RIGHT }
  doc.setFillColor(245, 245, 245); doc.rect(M, y - 5, RIGHT - M, 8, 'F')
  doc.setFontSize(8.5); doc.setTextColor(90); doc.setFont('helvetica', 'bold')
  doc.text('DESCRIPTION', cols.desc + 2, y)
  doc.text('QTY', cols.qty, y, { align: 'right' })
  doc.text('UNIT', cols.unit, y, { align: 'right' })
  doc.text('AMOUNT', cols.amt - 2, y, { align: 'right' })
  y += 8
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
  for (const li of inv.line_items) {
    const wrapped = doc.splitTextToSize(li.description, 100)
    if (y + wrapped.length * 5 > 250) { doc.addPage(); y = M }
    doc.setTextColor(30); doc.text(wrapped, cols.desc + 2, y)
    doc.text(String(li.qty), cols.qty, y, { align: 'right' })
    doc.text(money(li.unit_cents), cols.unit, y, { align: 'right' })
    doc.text(money(lineAmountCents(li)), cols.amt - 2, y, { align: 'right' })
    y += wrapped.length * 5 + 3
    doc.setDrawColor(238); doc.setLineWidth(0.2); doc.line(M, y - 2, RIGHT, y - 2)
  }

  // Totals block — right-aligned, exact.
  y += 4
  const trow = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 11 : 9.5)
    doc.setTextColor(bold ? 17 : 90); doc.text(label, cols.unit - 20, y, { align: 'right' })
    doc.setTextColor(17); doc.text(val, cols.amt - 2, y, { align: 'right' })
    y += bold ? 8 : 6
  }
  trow('Subtotal', money(inv.subtotal_cents))
  if (inv.tax_bps > 0) trow(`Tax (${(inv.tax_bps / 100).toFixed(2)}%)`, money(inv.tax_cents))
  doc.setDrawColor(17); doc.setLineWidth(0.4); doc.line(cols.unit - 40, y - 3, RIGHT, y - 3)
  y += 3
  trow('Total due', money(inv.total_cents), true)

  // Remittance + late-fee note.
  y += 8
  const rem = Object.entries(inv.remittance ?? {}).filter(([, v]) => v)
  if (rem.length) {
    doc.setFontSize(8.5); doc.setTextColor(140); doc.text('REMIT TO', M, y); y += 5
    doc.setFontSize(9); doc.setTextColor(60)
    for (const [k, v] of rem) { doc.text(`${k}: ${v}`, M, y); y += 4.5 }
    y += 4
  }
  if (inv.late_fee_note) {
    doc.setFontSize(8); doc.setTextColor(120)
    doc.text(doc.splitTextToSize(`Late payments: ${inv.late_fee_note}`, RIGHT - M), M, y)
  }
  return doc
}
