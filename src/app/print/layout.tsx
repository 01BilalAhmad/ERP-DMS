import type { Metadata } from 'next'
import './print.css'

export const metadata: Metadata = {
  title: 'Print — Distribution ERP',
}

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>{children}</body>
    </html>
  )
}
