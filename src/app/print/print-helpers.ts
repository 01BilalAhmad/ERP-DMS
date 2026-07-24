/**
 * Pure formatting helpers shared between print pages.
 * IMPORTANT: This file must NOT have 'use client' — these helpers are called
 * from Server Components during SSR. Client components live in print-utils.tsx.
 */

/**
 * Number formatter for invoices — matches reference PDF style (e.g. "2,208.87").
 */
export function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return '-'
  return n.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtInt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '-'
  return Math.round(n).toLocaleString('en-PK')
}

/**
 * Convert a quantity in a given product unit into carton / box / unit columns.
 * Strategy (mirrors reference PDF):
 *   - If product.unit is CTN: whole qty is cartons, boxes/units = 0
 *   - If product.unit is BOX: whole qty is boxes
 *   - If product.unit is PCS: whole qty is units (or broken into cartons via piecesPerPack)
 *
 * Returns { cartons, boxes, units } all integers (display only).
 */
export function qtyBreakdown(
  qty: number,
  unit: string | undefined,
  piecesPerPack: number | undefined
): { cartons: number; boxes: number; units: number } {
  const p = piecesPerPack && piecesPerPack > 0 ? piecesPerPack : 1
  const u = (unit || 'PCS').toUpperCase()
  if (u === 'CTN') {
    return { cartons: Math.floor(qty), boxes: 0, units: 0 }
  }
  if (u === 'BOX') {
    return { cartons: 0, boxes: Math.floor(qty), units: 0 }
  }
  // PCS — try to break into cartons if packSize known
  if (p > 1) {
    const cartons = Math.floor(qty / p)
    const remainder = qty - cartons * p
    return { cartons, boxes: 0, units: Math.floor(remainder) }
  }
  return { cartons: 0, boxes: 0, units: Math.floor(qty) }
}

/**
 * Format a date like the reference: "25 July 2026".
 */
export function fmtDateLong(d: Date | string | undefined | null): string {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return '-'
  const day = dt.getDate()
  const month = dt.toLocaleString('en-PK', { month: 'long' })
  const year = dt.getFullYear()
  return `${day} ${month} ${year}`
}

export function fmtDay(d: Date | string | undefined | null): string {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('en-PK', { weekday: 'long' })
}

export function fmtDateTime(d: Date | string | undefined | null): string {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return '-'
  return dt.toLocaleString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function fmtDate(d: Date | string | undefined | null): string {
  if (!d) return '-'
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return '-'
  return dt.toISOString().slice(0, 10)
}
