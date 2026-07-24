'use client'

export function PrintButton({ label = '🖨️ Print / Save PDF', variant = 'primary' }: { label?: string; variant?: 'primary' | 'secondary' }) {
  return (
    <>
      <button
        onClick={() => window.print()}
        style={{
          margin: '0 4px',
          padding: '6px 14px',
          border: 'none',
          background: variant === 'primary' ? '#10b981' : '#6b7280',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '11px',
          borderRadius: '3px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {label}
      </button>
      <button
        onClick={() => window.close()}
        style={{
          margin: '0 4px',
          padding: '6px 14px',
          border: 'none',
          background: '#6b7280',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '11px',
          borderRadius: '3px',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Close
      </button>
    </>
  )
}
