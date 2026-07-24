import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/batches/[id]/manifest — dispatch manifest grouped by shop with route sequence
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await params

  const batch = await db.orderBatch.findUnique({
    where: { id },
    include: {
      company: true,
      booker: true,
      orders: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          shop: true,
          booker: true,
          items: {
            include: {
              product: { select: { id: true, code: true, name: true, unit: true, packSize: true, tradePrice: true } },
            },
          },
        },
      },
    },
  })
  if (!batch) return bad('Batch not found', 404)

  // Group by shop, build per-shop load slip
  const shopMap: Record<string, {
    shop: any
    booker: any
    orderNo: string
    orderId: string
    items: { product: any; qty: number; unitPrice: number }[]
    grandTotal: number
    shopClass: string
    taxType: string
    routeDay: string | null
  }> = {}

  for (const order of batch.orders) {
    const sid = order.shopId
    shopMap[sid] = {
      shop: order.shop,
      booker: order.booker,
      orderNo: order.orderNo,
      orderId: order.id,
      items: order.items.map((it) => ({
        product: it.product,
        qty: it.quantity,
        unitPrice: it.unitPrice,
      })),
      grandTotal: order.grandTotal,
      shopClass: order.shop.shopClass,
      taxType: order.shop.taxType,
      routeDay: order.shop.visitDay,
    }
  }

  // Sort shops by class (A first) then by name for route sequence
  const shops = Object.values(shopMap).sort((a, b) => {
    const classOrder = { A: 0, B: 1, C: 2 }
    const ca = classOrder[a.shopClass as 'A' | 'B' | 'C'] ?? 3
    const cb = classOrder[b.shopClass as 'A' | 'B' | 'C'] ?? 3
    if (ca !== cb) return ca - cb
    return a.shop.name.localeCompare(b.shop.name)
  })

  // Assign route sequence numbers
  const stops = shops.map((s, i) => ({ ...s, sequence: i + 1 }))

  return ok({
    batch: {
      id: batch.id,
      batchNo: batch.batchNo,
      company: batch.company,
      booker: batch.booker,
      status: batch.status,
      batchDate: batch.batchDate,
      totalOrders: batch.orders.length,
      totalShops: stops.length,
      totalValue: batch.orders.reduce((s, o) => s + o.grandTotal, 0),
    },
    stops,
  })
}
