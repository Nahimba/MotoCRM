/**
 * Escape a value for CSV (quote if contains comma, newline, or quote).
 */
function escapeCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Turn an array of objects into a CSV string. Uses object keys as header row.
 */
export function toCsvRows<T extends Record<string, unknown>>(
  rows: T[],
  columns?: (keyof T)[]
): string {
  if (rows.length === 0) return ""
  const keys = (columns ?? (Object.keys(rows[0]) as (keyof T)[])) as string[]
  const header = keys.map(escapeCsvCell).join(",")
  const data = rows.map((row) =>
    keys.map((k) => escapeCsvCell((row as Record<string, unknown>)[k])).join(",")
  )
  return [header, ...data].join("\r\n")
}

/**
 * Trigger browser download of a string as a file.
 */
export function downloadFile(content: string, filename: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
