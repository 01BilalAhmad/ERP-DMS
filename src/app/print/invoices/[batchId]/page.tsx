import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import '@/app/print/print.css'
import { PrintButton } from '@/components/erp/print-button'

export default async function BulkInvoicesPage({ params }: { params: Promise<{ batchId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  const { batchId } = await params

  const batch = await db.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      company: true,
      orders: {
        where: { status: { not: 'CANCELLED' }, invoice: { isNot: null } },
        include: {
          shop: true,
          booker: true,
          items: { include: { product: true } },
          invoice: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!batch) return <div>Batch not found</div>

  return (
    <>
      <div className="no-print">
        <PrintButton label="🖨️ Print All / Save PDF" />
        <span style={{ marginLeft: 12, fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
          Batch {batch.batchNo} — {batch.orders.length} invoices
        </span>
      </div>
      {batch.orders.map((order, idx) => {
        const invoice = order.invoice
        if (!invoice) return null
        const shop = order.shop
        const company = batch.company
        const grossExcl = invoice.subtotal - invoice.totalDiscount

        const promotions: { name: string; amount: number }[] = []
        let totalPromo = 0
        for (const it of order.items) {
          if (it.discountPct > 0) {
            const disc = (it.quantity * it.unitPrice * it.discountPct) / 100
            promotions.push({ name: `${it.product.code}_${it.discountPct}%_Ret`, amount: disc })
            totalPromo += disc
          }
        }

        return (
          <div key={order.id} className="doc" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
            {/* Header */}
            <div className="doc-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="doc-title">{company.name.toUpperCase()}</div>
                  <div style={{ fontSize: '9px', marginTop: 2 }}>{company.address}</div>
                  <div style={{ fontSize: '8px', marginTop: 2, color: '#444' }}>
                    NTN: {company.ntn || '—'} · STRN: {company.strn || '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="doc-title" style={{ fontSize: '11px' }}>CASH MEMO / INVOICE</div>
                  <div style={{ fontSize: '9px', marginTop: 2 }}>Invoice No: <strong>{invoice.invoiceNo}</strong></div>
                  <div style={{ fontSize: '9px' }}>Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
            </div>

            {/* Party */}
            <div className="doc-party">
              <div>
                <span><strong>M/S:</strong> {shop.name} [{shop.code}]</span>
                <span><strong>Owner:</strong> {shop.ownerName || '—'}</span>
                <span><strong>Address:</strong> {shop.address || '—'}</span>
              </div>
              <div>
                <span><strong>Tax Type:</strong> {shop.taxType}</span>
                <span><strong>NTN:</strong> {shop.ntn || 'N/A'}</span>
                <span><strong>Route:</strong> {shop.visitDay || '—'}</span>
              </div>
              <div>
                <span><strong>Order:</strong> {order.orderNo}</span>
                <span><strong>Booker:</strong> {order.booker?.name || '—'}</span>
                <span><strong>Load Form:</strong> {batch.batchNo}</span>
              </div>
            </div>

            {/* Items */}
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>Code</th>
                  <th style={{ width: '30%' }}>Product</th>
                  <th className="num" style={{ width: '7%' }}>Qty</th>
                  <th className="num" style={{ width: '9%' }}>Price</th>
                  <th className="num" style={{ width: '9%' }}>Excl Value</th>
                  <th className="num" style={{ width: '6%' }}>GST%</th>
                  <th className="num" style={{ width: '9%' }}>GST Amt</th>
                  <th className="num" style={{ width: '9%' }}>Gross</th>
                  <th className="num" style={{ width: '7%' }}>Disc</th>
                  <th className="num" style={{ width: '8%' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => {
                  const lineGross = it.quantity * it.unitPrice
                  const disc = (lineGross * it.discountPct) / 100
                  const excl = lineGross - disc
                  return (
                    <tr key={it.id}>
                      <td className="center" style={{ fontFamily: 'monospace', fontSize: '8px' }}>{it.product.code}</td>
                      <td>{it.product.name}<div style={{ fontSize: '7px', color: '#888' }}>{it.product.packSize}</div></td>
                      <td className="num">{it.quantity} {it.product.unit}</td>
                      <td className="num">{it.unitPrice.toFixed(2)}</td>
                      <td className="num">{excl.toFixed(2)}</td>
                      <td className="num">{it.taxRate}%</td>
                      <td className="num">{it.taxAmount.toFixed(2)}</td>
                      <td className="num">{(excl + it.taxAmount).toFixed(2)}</td>
                      <td className="num">{disc.toFixed(2)}</td>
                      <td className="num">{(excl + it.taxAmount).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right' }}>TOTAL</td>
                  <td className="num">{order.items.reduce((s, it) => s + it.quantity, 0).toFixed(0)}</td>
                  <td className="num">—</td>
                  <td className="num">{grossExcl.toFixed(2)}</td>
                  <td className="num">—</td>
                  <td className="num">{invoice.salesTax.toFixed(2)}</td>
                  <td className="num">{(grossExcl + invoice.salesTax).toFixed(2)}</td>
                  <td className="num">{invoice.totalDiscount.toFixed(2)}</td>
                  <td className="num">{invoice.grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Summary */}
            <div className="doc-summary">
              <div className="doc-promotions">
                <h4>Promotions ({promotions.length})</h4>
                <ul>
                  {promotions.length === 0 && <li><span>No promotions</span></li>}
                  {promotions.map((p, i) => (
                    <li key={i}><span>({String.fromCharCode(97 + i)}) {p.name}</span><span>{p.amount.toFixed(2)}</span></li>
                  ))}
                  <li style={{ borderTop: '1px solid #999', marginTop: 4, paddingTop: 4, fontWeight: 'bold' }}>
                    <span>Total Discount</span><span>{totalPromo.toFixed(2)}</span>
                  </li>
                </ul>
              </div>
              <div className="doc-totals">
                <div className="row"><span>Gross Excl GST:</span><strong>{grossExcl.toFixed(2)}</strong></div>
                <div className="row"><span>GST ({company.salesTaxRate}%):</span><strong>{invoice.salesTax.toFixed(2)}</strong></div>
                {invoice.furtherTax > 0 && <div className="row"><span>Further Tax:</span><strong>{invoice.furtherTax.toFixed(2)}</strong></div>}
                <div className="row"><span>With GST:</span><strong>{(grossExcl + invoice.salesTax + invoice.furtherTax).toFixed(2)}</strong></div>
                <div className="row"><span>Advance Tax:</span><strong>{invoice.withholdingTax.toFixed(2)}</strong></div>
                <div className="row"><span>Total Discount:</span><strong>{invoice.totalDiscount.toFixed(2)}</strong></div>
                <div className="row grand"><span>NET INVOICE:</span><strong>{invoice.grandTotal.toFixed(2)}</strong></div>
                {invoice.previousBalance > 0 && (
                  <div className="row" style={{ marginTop: 4, paddingTop: 4, borderTop: '1px dashed #999', color: '#b45309' }}>
                    <span>Previous Balance:</span><strong>{invoice.previousBalance.toFixed(2)}</strong>
                  </div>
                )}
                {invoice.totalPayable > invoice.grandTotal && (
                  <div className="row" style={{ marginTop: 4, paddingTop: 4, borderTop: '2px solid #000', fontSize: '11px' }}>
                    <span>TOTAL PAYABLE:</span><strong>{invoice.totalPayable.toFixed(2)}</strong>
                  </div>
                )}
                <div className="row" style={{ fontSize: '8px', marginTop: 4, color: '#666' }}><span>Paid:</span><span>{invoice.paidAmount.toFixed(2)}</span></div>
                <div className="row" style={{ fontSize: '8px', color: invoice.balance > 0 ? '#c00' : '#070' }}><span>Balance:</span><strong>{invoice.balance.toFixed(2)}</strong></div>
              </div>
            </div>

            <div className="doc-load-ref">
              <strong>Load Form #:</strong> {batch.batchNo} &nbsp;|&nbsp; <strong>Deliveryman:</strong> {order.booker?.name || '—'}
            </div>

            <div className="doc-signatures">
              <div className="doc-sign"><div className="doc-sign-line">Checked By</div></div>
              <div className="doc-sign"><div className="doc-sign-line">Order Booker</div></div>
              <div className="doc-sign"><div className="doc-sign-line">Delivered By</div></div>
              <div className="doc-sign"><div className="doc-sign-line">Shop Keeper</div></div>
            </div>

            <div className="doc-footer">
              {company.name} · Tax Invoice · {new Date().toLocaleString('en-PK')}
            </div>
          </div>
        )
      })}
    </>
  )
}
