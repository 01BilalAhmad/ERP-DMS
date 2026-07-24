import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import '@/app/print/print.css'
import { PrintButton } from '@/components/erp/print-button'

export default async function SupplierSummaryPage({ params }: { params: Promise<{ batchId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/')
  const { batchId } = await params

  const batch = await db.orderBatch.findUnique({
    where: { id: batchId },
    include: {
      company: true,
      booker: true,
      orders: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          shop: true,
          booker: true,
          items: { include: { product: true } },
          invoice: true,
        },
      },
    },
  })
  if (!batch) return <div>Batch not found</div>

  // Section 1: Consolidate items across all orders by product
  const productMap: Record<string, { product: any; totalQty: number; orderCount: number }> = {}
  for (const order of batch.orders) {
    for (const item of order.items) {
      const pid = item.productId
      if (!productMap[pid]) productMap[pid] = { product: item.product, totalQty: 0, orderCount: 0 }
      productMap[pid].totalQty += item.quantity
      productMap[pid].orderCount += 1
    }
  }
  const products = Object.values(productMap).sort((a, b) => a.product.name.localeCompare(b.product.name))

  // Compute cartons/boxes from packSize (best effort: assume piecesPerPack = 1 carton = 1 unit for now)
  function packBreakdown(product: any, qty: number) {
    const ppp = product.piecesPerPack || 1
    const cartons = Math.floor(qty / ppp)
    const remainder = qty - cartons * ppp
    return { cartons, boxes: 0, units: remainder }
  }

  // Section 2: Store-wise summary
  const stores = batch.orders.map((o, i) => ({
    sno: i + 1,
    invoiceNo: o.invoice?.invoiceNo || o.orderNo,
    storeName: o.shop.name,
    ownerName: o.shop.ownerName || '',
    address: o.shop.address || '',
    orderBooker: o.booker?.name || '—',
    status: o.status,
    issuedUnits: o.items.reduce((s, it) => s + it.quantity, 0),
    freeUnits: 0,
    returnedUnits: 0,
    extraUnits: 0,
    totalIssued: o.items.reduce((s, it) => s + it.quantity, 0),
    salesAmount: o.grandTotal,
  }))

  const totalIssued = stores.reduce((s, x) => s + x.issuedUnits, 0)
  const totalSale = stores.reduce((s, x) => s + x.salesAmount, 0)

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
              <div className="doc-title">{batch.company.name}</div>
              <div style={{ fontSize: '9px', marginTop: 2 }}>{batch.company.address}</div>
              <div style={{ fontSize: '8px', marginTop: 2, color: '#444' }}>
                NTN: {batch.company.ntn || '—'} · STRN: {batch.company.strn || '—'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="doc-title" style={{ fontSize: '12px' }}>LOAD FORM</div>
              <div style={{ fontSize: '9px', marginTop: 2 }}>[ {batch.batchNo} ] — {batch.status}</div>
            </div>
          </div>
          <div className="doc-meta">
            <div>
              <span><strong>Deliveryman:</strong> {batch.booker?.name || '—'} [{batch.booker?.employeeCode || '—'}]</span>
              <span><strong>Order Booker:</strong> {batch.booker?.name || '—'}</span>
            </div>
            <div>
              <span><strong>For Date:</strong> {new Date(batch.batchDate).toLocaleDateString('en-PK')}</span>
              <span><strong>Print Date:</strong> {new Date().toLocaleString('en-PK')}</span>
            </div>
            <div>
              <span><strong>Company:</strong> {batch.company.code}</span>
              <span><strong>Total Orders:</strong> {batch.orders.length}</span>
            </div>
          </div>
        </div>

        {/* Section 1: SKU Issued */}
        <h3 style={{ fontSize: '11px', margin: '6px 0', borderBottom: '1px solid #000', paddingBottom: 2 }}>
          SECTION 1 — SKU-WISE ISSUED SUMMARY (CONSOLIDATED)
        </h3>
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>SKU Code</th>
              <th style={{ width: '32%' }}>Product Name</th>
              <th style={{ width: '8%' }}>Mfg Code</th>
              <th className="num" style={{ width: '10%' }}>Issued Units</th>
              <th className="num" style={{ width: '8%' }}>Box</th>
              <th className="num" style={{ width: '8%' }}>Cartons</th>
              <th className="num" style={{ width: '10%' }}>Returned Units</th>
              <th className="num" style={{ width: '8%' }}>Free Units</th>
              <th className="num" style={{ width: '8%' }}>Sale Units</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const bd = packBreakdown(p.product, p.totalQty)
              return (
                <tr key={p.product.id}>
                  <td className="center" style={{ fontFamily: 'monospace' }}>{p.product.code}</td>
                  <td>{p.product.name}</td>
                  <td className="center" style={{ fontSize: '8px', color: '#666' }}>{p.product.code}-{String(p.product.id).slice(-4)}</td>
                  <td className="num">{p.totalQty.toFixed(0)}</td>
                  <td className="num">{bd.boxes.toFixed(0)}</td>
                  <td className="num">{bd.cartons.toFixed(0)}</td>
                  <td className="num">0</td>
                  <td className="num">0</td>
                  <td className="num">{p.totalQty.toFixed(0)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} style={{ textAlign: 'right' }}>TOTAL</td>
              <td className="num">{products.reduce((s, p) => s + p.totalQty, 0).toFixed(0)}</td>
              <td className="num">—</td>
              <td className="num">—</td>
              <td className="num">0</td>
              <td className="num">0</td>
              <td className="num">{products.reduce((s, p) => s + p.totalQty, 0).toFixed(0)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Section 2: Store-wise */}
        <h3 style={{ fontSize: '11px', margin: '12px 0 6px', borderBottom: '1px solid #000', paddingBottom: 2 }}>
          SECTION 2 — STORE / INVOICE WISE SUMMARY
        </h3>
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: '4%' }}>S.No</th>
              <th style={{ width: '12%' }}>Invoice No.</th>
              <th style={{ width: '30%' }}>Store Name / Owner</th>
              <th style={{ width: '14%' }}>Order Booker</th>
              <th style={{ width: '8%' }}>Status</th>
              <th className="num" style={{ width: '8%' }}>Issued Units</th>
              <th className="num" style={{ width: '8%' }}>Total Issued</th>
              <th className="num" style={{ width: '16%' }}>Sales Amount</th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s) => (
              <tr key={s.sno}>
                <td className="center">{s.sno}</td>
                <td className="center" style={{ fontFamily: 'monospace', fontSize: '8px' }}>{s.invoiceNo}</td>
                <td>
                  <strong>{s.storeName}</strong>
                  {s.ownerName && <span style={{ color: '#555' }}> / {s.ownerName}</span>}
                  {s.address && <div style={{ fontSize: '8px', color: '#777' }}>{s.address}</div>}
                </td>
                <td>{s.orderBooker}</td>
                <td className="center">{s.status}</td>
                <td className="num">{s.issuedUnits.toFixed(0)}</td>
                <td className="num">{s.totalIssued.toFixed(0)}</td>
                <td className="num">{s.salesAmount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} style={{ textAlign: 'right' }}>TOTAL</td>
              <td className="num">{totalIssued.toFixed(0)}</td>
              <td className="num">{totalIssued.toFixed(0)}</td>
              <td className="num">{totalSale.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="doc-signatures">
          <div className="doc-sign">
            <div className="doc-sign-line">Deliveryman Signature</div>
          </div>
          <div className="doc-sign">
            <div className="doc-sign-line">Stock Keeper Signature</div>
          </div>
        </div>

        <div className="doc-footer">
          This is a system-generated Load Form from Distribution ERP · {batch.company.name} · Generated on {new Date().toLocaleString('en-PK')}
        </div>
      </div>
    </>
  )
}
