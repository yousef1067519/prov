// Shared CSV helpers for spreadsheet imports (clients, contacts, …). Parses in the
// browser so uploads never hit the server as files — we send clean JSON arrays.

// Minimal RFC-4180-ish parser: handles quoted fields, escaped quotes ("" ), and
// commas/newlines inside quotes. Good enough for spreadsheets exported to CSV.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

/**
 * Map parsed CSV rows to objects using a flexible header→field alias map.
 * `aliases[field] = [possible header names]`. If no header row is recognized,
 * columns fall back to `positional` order. Rows missing `required` are dropped.
 */
export function mapRows<T extends Record<string, string>>(
  rows: string[][],
  aliases: Record<keyof T, string[]>,
  positional: (keyof T)[],
  required: keyof T,
): T[] {
  if (!rows.length) return []
  const lookup: Record<string, keyof T> = {}
  for (const field in aliases) for (const n of aliases[field]) lookup[n.toLowerCase()] = field

  const header = rows[0].map(h => h.trim().toLowerCase())
  const mapped = header.map(h => lookup[h])
  const hasHeader = mapped.some(Boolean)
  const dataRows = hasHeader ? rows.slice(1) : rows
  const cols: (keyof T | undefined)[] = hasHeader ? mapped : positional

  const out: T[] = []
  for (const r of dataRows) {
    const obj = {} as T
    r.forEach((cell, i) => { const f = cols[i]; if (f) (obj as Record<keyof T, string>)[f] = cell.trim() })
    if (obj[required]) out.push(obj)
  }
  return out
}
