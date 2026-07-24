import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import '@/app/print/print.css'
import { formatCurrency } from '@/lib/erp-types'
import { PrintButton } from '@/components/erp/print-button'

export default async function InvoicePrintPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  const { invoiceId } = await params

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      company: true,
      shop: true,
      order: {
        include: {
          booker: true,
          items: { include: { product: true } },
          batch: true,
        },
      },
    },
  })
  if (!invoice) return <div>Invoice not found</div>

  const order = invoice.order
  const shop = invoice.shop
  const company = invoice.company
  const batch = order.batch

  // Build promotions list from order items' schemeApplied
  const promotions: { name: string; amount: number }[] = []
  let totalPromoAmount = 0
  for (const it of order.items) {
    if (it.discountPct > 0) {
      const lineGross = it.quantity * it.unitPrice
      const disc = (lineGross * it.discountPct) / 100
      promotions.push({
        name: `${it.product.code}_${it.discountPct}%_Ret`,
        amount: disc,
      })
      totalPromoAmount += disc
    }
  }

  const grossExclGST = invoice.subtotal - invoice.totalDiscount
  const totalWithGST = grossExclGST + invoice.salesTax + invoice.furtherTax
  const netInvoice = totalWithGST + invoice.withholdingTax

  return (
    <>
      <div className="no-print">
        <PrintButton />
      </div>
      <div className="doc">
        {/* Header */}
        <div className="doc-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="doc-title">{company.name.toUpperCase()}</div>
              <div style={{ fontSize: '9px', marginTop: 2 }}>{company.address}</div>
              <div style={{ fontSize: '8px', marginTop: 2, color: '#444' }}>
                NTN: {company.ntn || '—'} · STRN: {company.strn || '—'} · Sales Tax #: {company.strn || '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="doc-title" style={{ fontSize: '11px' }}>CASH MEMO / INVOICE</div>
              <div style={{ fontSize: '9px', marginTop: 2 }}>Invoice No: <strong>{invoice.invoiceNo}</strong></div>
              <div style={{ fontSize: '9px' }}>Date/Day: {new Date(invoice.invoiceDate).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Party Info */}
        <div className="doc-party">
          <div>
            <span><strong>M/S:</strong> {shop.name} [{shop.code}]</span>
            <span><strong>Owner:</strong> {shop.ownerName || '—'}</span>
            <span><strong>Address:</strong> {shop.address || '—'}</span>
            <span><strong>Phone:</strong> {shop.phone || '—'}</span>
          </div>
          <div>
            <span><strong>Shop Tax Type:</strong> {shop.taxType}</span>
            <span><strong>Shop NTN:</strong> {shop.ntn || 'Not Available'}</span>
            <span><strong>Shop STRN:</strong> {shop.strn || 'Not Available'}</span>
            <span><strong>Route:</strong> {shop.visitDay || '—'}</span>
          </div>
          <div>
            <span><strong>Order No:</strong> {order.orderNo}</span>
            <span><strong>Booker:</strong> {order.booker?.name || '—'}</span>
            {batch && <span><strong>Load Form:</strong> {batch.batchNo}</span>}
            <span><strong>Status:</strong> {invoice.status}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: '6%' }}>Code</th>
              <th style={{ width: '28%' }}>Product Name</th>
              <th className="num" style={{ width: '7%' }}>Qty</th>
              <th className="num" style={{ width: '9%' }}>Unit Price (Excl)</th>
              <th className="num" style={{ width: '9%' }}>Value Excl</th>
              <th className="num" style={{ width: '6%' }}>GST %</th>
              <th className="num" style={{ width: '9%' }}>GST Amount</th>
              <th className="num" style={{ width: '9%' }}>Gross Value</th>
              <th className="num" style={{ width: '8%' }}>Discount</th>
              <th className="num" style={{ width: '9%' }}>Net Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => {
              const lineGross = it.quantity * it.unitPrice
              const lineDisc = (lineGross * it.discountPct) / 100
              const lineExcl = lineGross - lineDisc
              return (
                <tr key={it.id}>
                  <td className="center" style={{ fontFamily: 'monospace', fontSize: '8px' }}>{it.product.code}</td>
                  <td>
                    {it.product.name}
                    <div style={{ fontSize: '7px', color: '#888' }}>{it.product.packSize}</div>
                  </td>
                  <td className="num">{it.quantity} {it.product.unit}</td>
                  <td className="num">{it.unitPrice.toFixed(2)}</td>
                  <td className="num">{lineExcl.toFixed(2)}</td>
                  <td className="num">{it.taxRate}%</td>
                  <td className="num">{it.taxAmount.toFixed(2)}</td>
                  <td className="num">{(lineExcl + it.taxAmount).toFixed(2)}</td>
                  <td className="num">{lineDisc.toFixed(2)}</td>
                  <td className="num">{(lineExcl + it.taxAmount).toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right' }}>TOTAL ({order.items.length} items)</td>
              <td className="num">{order.items.reduce((s, it) => s + it.quantity, 0).toFixed(0)}</td>
              <td className="num">—</td>
              <td className="num">{(invoice.subtotal - invoice.totalDiscount).toFixed(2)}</td>
              <td className="num">—</td>
              <td className="num">{invoice.salesTax.toFixed(2)}</td>
              <td className="num">{(invoice.subtotal - invoice.totalDiscount + invoice.salesTax).toFixed(2)}</td>
              <td className="num">{invoice.totalDiscount.toFixed(2)}</td>
              <td className="num">{invoice.grandTotal.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Promotions + Summary */}
        <div className="doc-summary">
          <div className="doc-promotions">
            <h4>Promotions Applied ({promotions.length})</h4>
            <ul>
              {promotions.length === 0 && <li><span>No promotions applied</span></li>}
              {promotions.map((p, i) => (
                <li key={i}>
                  <span>({String.fromCharCode(97 + i)}) {p.name}</span>
                  <span>{p.amount.toFixed(2)}</span>
                </li>
              ))}
              <li style={{ borderTop: '1px solid #999', marginTop: 4, paddingTop: 4, fontWeight: 'bold' }}>
                <span>Total Discount</span>
                <span>{totalPromoAmount.toFixed(2)}</span>
              </li>
            </ul>
          </div>
          <div className="doc-totals">
            <div className="row"><span>Gross Amount Excl GST:</span><strong>{(invoice.subtotal - invoice.totalDiscount).toFixed(2)}</strong></div>
            <div className="row"><span>GST ({company.salesTaxRate}%):</span><strong>{invoice.salesTax.toFixed(2)}</strong></div>
            {invoice.furtherTax > 0 && (
              <div className="row"><span>Further Tax (Non-Filer {company.furtherTaxRate}%):</span><strong>{invoice.furtherTax.toFixed(2)}</strong></div>
            )}
            <div className="row"><span>Total Amount With GST:</span><strong>{(invoice.subtotal - invoice.totalDiscount + invoice.salesTax + invoice.furtherTax).toFixed(2)}</strong></div>
            <div className="row"><span>Advance Tax (Withholding):</span><strong>{invoice.withholdingTax.toFixed(2)}</strong></div>
            <div className="row"><span>Total Discount:</span><strong>{invoice.totalDiscount.toFixed(2)}</strong></div>
            <div className="row grand"><span>NET INVOICE:</span><strong>{invoice.grandTotal.toFixed(2)}</strong></div>
            <div className="row" style={{ fontSize: '8px', marginTop: 4, color: '#666' }}>
              <span>Paid:</span><span>{invoice.paidAmount.toFixed(2)}</span>
            </div>
            <div className="row" style={{ fontSize: '8px', color: invoice.balance > 0 ? '#c00' : '#070' }}>
              <span>Balance Due:</span><strong>{invoice.balance.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Load Form Ref */}
        {batch && (
          <div className="doc-load-ref">
            <strong>Load Form #:</strong> {batch.batchNo} &nbsp;|&nbsp;
            <strong>Deliveryman:</strong> {order.booker?.name || '—'}
          </div>
        )}

        {/* Signatures */}
        <div className="doc-signatures">
          <div className="doc-sign"><div className="doc-sign-line">Checked By</div></div>
          <div className="doc-sign"><div className="doc-sign-line">Order Booker</div></div>
          <div className="doc-sign"><div className="doc-sign-line">Delivered By</div></div>
          <div className="doc-sign"><div className="doc-sign-line">Shop Keeper</div></div>
        </div>

        <div className="doc-footer">
          This is a system-generated invoice from {company.name} · Tax-compliant under Sales Tax Act · {new Date().toLocaleString('en-PK')}
        </div>
      </div>
    </>
  )
}
