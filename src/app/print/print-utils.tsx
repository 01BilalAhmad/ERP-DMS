'use client'

import { useEffect } from 'react'

/**
 * Print toolbar — sticky top bar with a "Print" button.
 * Hidden in print output (uses .no-print class).
 */
export function PrintToolbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="print-toolbar no-print">
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{title}</div>
        {subtitle && <div className="meta">{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>
    </div>
  )
}

/**
 * Auto-print on mount. Useful when a user clicks "Print" from a list and
 * wants the print dialog to open immediately on the print page.
 * Disabled by default — pass `enabled` to turn it on.
 */
export function AutoPrint({ enabled = false }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return
    // Small timeout so fonts/layout settle before print dialog opens.
    const t = setTimeout(() => {
      try {
        window.print()
      } catch {
        // ignore
      }
    }, 350)
    return () => clearTimeout(t)
  }, [enabled])
  return null
}
