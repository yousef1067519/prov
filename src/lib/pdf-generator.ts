import { jsPDF } from 'jspdf'

export interface ReportData {
  campaign: { id: string; name: string; niche: string; status: string; created_at: string }
  creatorsContacted: number
  influencersConfirmed: number
  sponsorsMatched: number
  emails: { sent: number; opened: number; clicked: number; openRate: number; clickRate: number }
  replies: { count: number; conversion: number }
  deals: { count: number; revenue: number }
  roi: number
  charts: {
    openByType: { label: string; sent: number; opened: number }[]
    replyOverTime: { label: string; value: number }[]
    revenueBySponsor: { label: string; value: number }[]
    funnel: { label: string; value: number }[]
  }
  topInfluencers: { name: string; metric: string }[]
  topSponsors: { name: string; deals: number }[]
}

export interface ReportBranding {
  agency_name?: string
  company_name?: string
  company_email?: string
  company_website?: string
  company_logo_url?: string
  brand_name?: string        // white-label override of "Prov"
  primary_hex?: [number, number, number]
}

// Prov palette (RGB)
const BG: [number, number, number] = [10, 10, 10]
const CARD: [number, number, number] = [20, 20, 22]
const GOLD: [number, number, number] = [255, 215, 0]
const AMBER: [number, number, number] = [202, 138, 4]
const GREEN: [number, number, number] = [0, 208, 132]
const PURPLE: [number, number, number] = [102, 126, 234]
const BLUE: [number, number, number] = [56, 189, 248]
const TEXT: [number, number, number] = [240, 240, 240]
const MUTED: [number, number, number] = [140, 140, 140]
const W = 210, H = 297, M = 16

const money = (n: number) => '$' + Math.round(n).toLocaleString()

export async function generateCampaignReport(data: ReportData, branding: ReportBranding = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const accent = branding.primary_hex ?? GOLD
  let y = 0

  const fillPage = () => { doc.setFillColor(...BG); doc.rect(0, 0, W, H, 'F') }
  fillPage()

  // ── Header band ──
  doc.setFillColor(...CARD); doc.rect(0, 0, W, 38, 'F')
  doc.setFillColor(...accent); doc.rect(0, 38, W, 1, 'F')

  if (branding.company_logo_url?.startsWith('data:image')) {
    try {
      const fmt = branding.company_logo_url.includes('png') ? 'PNG' : 'JPEG'
      doc.addImage(branding.company_logo_url, fmt, M, 9, 20, 20)
    } catch { /* ignore bad logo */ }
  }
  const brandName = branding.brand_name || branding.company_name || branding.agency_name || 'Prov'
  doc.setTextColor(...TEXT); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(brandName, branding.company_logo_url ? M + 25 : M, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text('Campaign Performance Report', branding.company_logo_url ? M + 25 : M, 25)
  doc.setTextColor(...accent); doc.setFontSize(8)
  doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), W - M, 18, { align: 'right' })

  y = 50

  // ── Campaign title ──
  doc.setTextColor(...TEXT); doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
  doc.text(data.campaign.name, M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  const started = data.campaign.created_at ? new Date(data.campaign.created_at).toLocaleDateString() : '—'
  doc.text(`${data.campaign.niche || 'General'}  ·  Started ${started}  ·  ${String(data.campaign.status).toUpperCase()}`, M, y + 6)
  y += 16

  // ── KPI cards (2 rows x 4) ──
  const kpis: { label: string; value: string; color: [number, number, number] }[] = [
    { label: 'Creators Contacted', value: String(data.creatorsContacted), color: PURPLE },
    { label: 'Influencers Confirmed', value: String(data.influencersConfirmed), color: GREEN },
    { label: 'Sponsors Matched', value: String(data.sponsorsMatched), color: BLUE },
    { label: 'Emails Sent', value: String(data.emails.sent), color: accent },
    { label: 'Open Rate', value: data.emails.openRate + '%', color: BLUE },
    { label: 'Replies', value: `${data.replies.count} (${data.replies.conversion}%)`, color: PURPLE },
    { label: 'Deals Closed', value: String(data.deals.count), color: GREEN },
    { label: 'Revenue', value: money(data.deals.revenue), color: GREEN },
  ]
  const cardW = (W - M * 2 - 3 * 4) / 4
  kpis.forEach((k, i) => {
    const col = i % 4, row = Math.floor(i / 4)
    const x = M + col * (cardW + 4)
    const cy = y + row * 22
    doc.setFillColor(...CARD); doc.roundedRect(x, cy, cardW, 19, 2, 2, 'F')
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
    doc.text(k.label.toUpperCase(), x + 3, cy + 6)
    doc.setTextColor(...k.color); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text(k.value, x + 3, cy + 14)
  })
  y += 22 * 2 + 6

  // ── ROI banner ──
  doc.setFillColor(...CARD); doc.roundedRect(M, y, W - M * 2, 16, 2, 2, 'F')
  doc.setFillColor(...accent); doc.rect(M, y, 1.5, 16, 'F')
  doc.setTextColor(...MUTED); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text('ESTIMATED ROI', M + 6, y + 6)
  doc.setTextColor(...(data.roi >= 0 ? GREEN : [248, 113, 113] as [number, number, number]))
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(`${data.roi >= 0 ? '+' : ''}${data.roi}%`, M + 6, y + 13)
  doc.setTextColor(...MUTED); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
  doc.text(`${money(data.deals.revenue)} revenue from ${data.emails.sent} outreach emails`, W - M - 4, y + 10, { align: 'right' })
  y += 24

  // ── Charts row 1: open rates (bar) + funnel ──
  const halfW = (W - M * 2 - 6) / 2
  drawBarChart(doc, M, y, halfW, 'Email Open Rates', data.charts.openByType.map(o => ({
    label: o.label, value: o.sent ? Math.round((o.opened / o.sent) * 100) : 0, raw: `${o.opened}/${o.sent}`,
  })), accent)
  drawFunnel(doc, M + halfW + 6, y, halfW, 'Deal Pipeline', data.charts.funnel)
  y += 58

  // ── Charts row 2: reply over time (line) + revenue by sponsor (pie) ──
  drawLineChart(doc, M, y, halfW, 'Replies Over Time', data.charts.replyOverTime, BLUE)
  drawPie(doc, M + halfW + 6, y, halfW, 'Revenue by Sponsor', data.charts.revenueBySponsor)
  y += 60

  // ── Top performers (new page if tight) ──
  if (y > 235) { doc.addPage(); fillPage(); y = M }
  drawList(doc, M, y, halfW, 'Top Influencers', data.topInfluencers.map(t => [t.name, t.metric]), GREEN)
  drawList(doc, M + halfW + 6, y, halfW, 'Top Sponsors', data.topSponsors.map(t => [t.name, `${t.deals} deal${t.deals === 1 ? '' : 's'}`]), accent)

  // ── Footer ──
  doc.setFillColor(...CARD); doc.rect(0, H - 16, W, 16, 'F')
  doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
  const sig = [branding.agency_name, branding.company_name, branding.company_email].filter(Boolean).join('  ·  ')
  doc.text(sig || `Generated by ${brandName}`, M, H - 7)
  doc.text(branding.company_website || '', W - M, H - 7, { align: 'right' })

  const safe = data.campaign.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const date = new Date().toISOString().slice(0, 10)
  const filename = `campaign-${safe}-${date}.pdf`
  doc.save(filename)
  // Also return the bytes (base64, no data-URI prefix) so callers can persist to Storage.
  const base64 = (doc.output('datauristring') as string).split(',')[1] ?? ''
  return { filename, base64 }
}

// ── Chart primitives (native vector) ──
function chartCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string) {
  doc.setFillColor(...CARD); doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setTextColor(...TEXT); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5)
  doc.text(title, x + 5, y + 8)
}

function drawBarChart(doc: jsPDF, x: number, y: number, w: number, title: string, bars: { label: string; value: number; raw?: string }[], color: [number, number, number]) {
  const h = 52; chartCard(doc, x, y, w, h, title)
  const base = y + h - 10, top = y + 16, maxH = base - top
  const max = Math.max(100, ...bars.map(b => b.value))
  const bw = Math.min(18, (w - 14) / Math.max(1, bars.length) - 8)
  bars.forEach((b, i) => {
    const bx = x + 10 + i * ((w - 20) / Math.max(1, bars.length))
    const bh = (b.value / max) * maxH
    doc.setFillColor(...color); doc.roundedRect(bx, base - bh, bw, bh, 1, 1, 'F')
    doc.setTextColor(...TEXT); doc.setFontSize(7); doc.setFont('helvetica', 'bold')
    doc.text(`${b.value}%`, bx + bw / 2, base - bh - 2, { align: 'center' })
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
    doc.text(b.label, bx + bw / 2, base + 5, { align: 'center' })
  })
}

function drawLineChart(doc: jsPDF, x: number, y: number, w: number, title: string, pts: { label: string; value: number }[], color: [number, number, number]) {
  const h = 54; chartCard(doc, x, y, w, h, title)
  const left = x + 10, right = x + w - 8, base = y + h - 10, top = y + 16
  const max = Math.max(1, ...pts.map(p => p.value))
  const step = (right - left) / Math.max(1, pts.length - 1)
  doc.setDrawColor(...color); doc.setLineWidth(0.6)
  const coords = pts.map((p, i) => ({ px: left + i * step, py: base - (p.value / max) * (base - top), p }))
  for (let i = 1; i < coords.length; i++) doc.line(coords[i - 1].px, coords[i - 1].py, coords[i].px, coords[i].py)
  coords.forEach(c => {
    doc.setFillColor(...color); doc.circle(c.px, c.py, 1.1, 'F')
    doc.setTextColor(...TEXT); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold')
    doc.text(String(c.p.value), c.px, c.py - 2.5, { align: 'center' })
    doc.setTextColor(...MUTED); doc.setFont('helvetica', 'normal')
    doc.text(c.p.label, c.px, base + 5, { align: 'center' })
  })
}

function drawPie(doc: jsPDF, x: number, y: number, w: number, title: string, slices: { label: string; value: number }[]) {
  const h = 54; chartCard(doc, x, y, w, h, title)
  const cx = x + 18, cy = y + 32, r = 13
  const total = slices.reduce((a, s) => a + s.value, 0)
  const colors: [number, number, number][] = [GOLD, GREEN, PURPLE, BLUE, AMBER, [248, 113, 113]]
  if (total <= 0) {
    doc.setTextColor(...MUTED); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('No revenue recorded yet.', x + 5, y + 30)
    return
  }
  let start = -90
  slices.forEach((s, i) => {
    const ang = (s.value / total) * 360
    drawSlice(doc, cx, cy, r, start, start + ang, colors[i % colors.length])
    start += ang
  })
  // legend
  slices.forEach((s, i) => {
    const ly = y + 16 + i * 6.5
    doc.setFillColor(...colors[i % colors.length]); doc.rect(x + 38, ly - 2.5, 3, 3, 'F')
    doc.setTextColor(...TEXT); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal')
    const lbl = s.label.length > 16 ? s.label.slice(0, 15) + '…' : s.label
    doc.text(`${lbl}  ${money(s.value)}`, x + 43, ly)
  })
}

function drawSlice(doc: jsPDF, cx: number, cy: number, r: number, a0: number, a1: number, color: [number, number, number]) {
  doc.setFillColor(...color)
  const steps = Math.max(2, Math.ceil((a1 - a0) / 6))
  const pts: [number, number][] = [[cx, cy]]
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + (a1 - a0) * (i / steps)) * Math.PI) / 180
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  // jsPDF has no polygon fill; approximate via triangles
  for (let i = 1; i < pts.length - 1; i++) {
    doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'F')
  }
}

function drawFunnel(doc: jsPDF, x: number, y: number, w: number, title: string, stages: { label: string; value: number }[]) {
  const h = 52; chartCard(doc, x, y, w, h, title)
  const max = Math.max(1, ...stages.map(s => s.value))
  const colors: [number, number, number][] = [PURPLE, BLUE, GOLD, GREEN]
  stages.forEach((s, i) => {
    const by = y + 16 + i * 8
    const bw = (s.value / max) * (w - 50)
    doc.setFillColor(...colors[i % colors.length]); doc.roundedRect(x + 5, by, Math.max(1, bw), 6, 1, 1, 'F')
    doc.setTextColor(...MUTED); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal')
    doc.text(s.label, x + 5, by - 1)
    doc.setTextColor(...TEXT); doc.setFont('helvetica', 'bold'); doc.setFontSize(7)
    doc.text(String(s.value), x + 8 + Math.max(1, bw) + 2, by + 4.5)
  })
}

function drawList(doc: jsPDF, x: number, y: number, w: number, title: string, rows: [string, string][], color: [number, number, number]) {
  const h = Math.max(26, 14 + rows.length * 7)
  chartCard(doc, x, y, w, h, title)
  if (rows.length === 0) {
    doc.setTextColor(...MUTED); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text('No data yet.', x + 5, y + 16)
    return
  }
  rows.forEach((r, i) => {
    const ry = y + 15 + i * 7
    doc.setTextColor(...TEXT); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5)
    doc.text(`${i + 1}. ${r[0]}`, x + 5, ry)
    doc.setTextColor(...color); doc.setFont('helvetica', 'bold')
    doc.text(r[1], x + w - 5, ry, { align: 'right' })
  })
}
