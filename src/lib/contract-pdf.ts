import { jsPDF } from 'jspdf'

// §8.5 contract PDF: print-grade white document — serif body, numbered
// clauses, agency-branded header, signature blocks. A generated contract
// should read like a law firm drafted it, not like an app export.

export interface ContractPdfInput {
  title: string
  body: string            // markdown-ish: "## 1. Heading" + paragraphs
  agencyName?: string
  brandName?: string      // counterparty (client/brand)
  creatorName?: string
  version?: number
  effectiveDate?: string
}

const LEGAL_NOTE = 'This template is a starting point and not legal advice. Have high-value agreements reviewed by counsel.'

const M = 20            // page margin (mm)
const W = 210 - M * 2   // usable width on A4

export function generateContractPdf(input: ContractPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const footer = () => {
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(130)
      doc.text(LEGAL_NOTE, 105, 289, { align: 'center' })
      doc.text(`Page ${i} of ${pages}`, 210 - M, 283, { align: 'right' })
      if (input.version) doc.text(`v${input.version}`, M, 283)
    }
  }
  const ensure = (needed: number) => {
    if (y + needed > 275) { doc.addPage(); y = M }
  }

  // Header band: agency name + document title.
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(255, 215, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text((input.agencyName ?? 'Agency').toUpperCase(), M, 13)
  doc.setTextColor(235); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  doc.text(input.title, M, 21)
  doc.setTextColor(150); doc.setFontSize(8)
  doc.text(`Effective date: ${input.effectiveDate ?? new Date().toISOString().slice(0, 10)}`, 210 - M, 21, { align: 'right' })
  y = 40

  // Body: split on clause headings.
  doc.setTextColor(20)
  const blocks = input.body.split(/\n(?=## )/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const heading = lines[0].startsWith('## ') ? lines[0].slice(3).trim() : null
    const text = (heading ? lines.slice(1) : lines).join('\n').trim()

    if (heading) {
      ensure(18)
      doc.setFont('times', 'bold'); doc.setFontSize(12)
      doc.text(heading, M, y)
      doc.setDrawColor(200); doc.setLineWidth(0.2)
      doc.line(M, y + 1.5, M + W, y + 1.5)
      y += 8
    }
    if (text) {
      doc.setFont('times', 'normal'); doc.setFontSize(10.5)
      for (const para of text.split(/\n\n+/)) {
        const wrapped = doc.splitTextToSize(para.replace(/\n/g, ' '), W)
        ensure(wrapped.length * 4.8 + 4)
        doc.text(wrapped, M, y)
        y += wrapped.length * 4.8 + 4
      }
    }
  }

  // Signature blocks.
  ensure(60)
  y += 8
  doc.setFont('times', 'bold'); doc.setFontSize(11)
  doc.text('IN WITNESS WHEREOF, the parties have executed this Agreement.', M, y)
  y += 14
  const sig = (x: number, label: string, name: string) => {
    doc.setDrawColor(60); doc.setLineWidth(0.3)
    doc.line(x, y + 14, x + 74, y + 14)
    doc.setFont('times', 'normal'); doc.setFontSize(9.5); doc.setTextColor(20)
    doc.text(label, x, y)
    doc.text(`Name: ${name}`, x, y + 20)
    doc.text('Title:', x, y + 26)
    doc.text('Date:', x, y + 32)
  }
  sig(M, 'BRAND / AGENCY', input.brandName ?? input.agencyName ?? '')
  sig(M + 86, 'CREATOR', input.creatorName ?? '')
  y += 40

  footer()
  return doc
}
