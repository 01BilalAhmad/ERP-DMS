import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok, bookerCompanyIds } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/batches?companyId=xxx&status=OPEN&bookerId=yyy
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const status = searchParams.get('status') || undefined
  const bookerId = searchParams.get('bookerId') || undefined

  const where: any = {}
  if (companyId) where.companyId = companyId
  if (status) where.status = status
  if (bookerId) where.bookerId = bookerId

  // Booker only sees own batches + assigned companies
  if (user.role === 'ORDER_BOOKER' && user.booker) {
    where.bookerId = user.booker.id
    where.companyId = { in: bookerCompanyIds(user) }
  }

  const batches = await db.orderBatch.findMany({
    where,
    include: {
      company: true,
      booker: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  // Recompute totals from actual orders (in case orders changed)
  const enriched = await Promise.all(
    batches.map(async (b) => {
      const orders = await db.order.findMany({
        where: { batchId: b.id, status: { not: 'CANCELLED' } },
        select: { grandTotal: true, shopId: true, items: { select: { quantity: true } } },
      })
      const totalShops = new Set(orders.map((o) => o.shopId)).size
      const totalQuantity = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)
      return {
        ...b,
        totalOrders: orders.length,
        totalShops,
        totalQuantity,
        grandTotal: orders.reduce((s, o) => s + o.grandTotal, 0),
      }
    })
  )
  return ok(enriched)
}

// POST /api/batches — create a new batch and optionally attach existing pending orders
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const body = await req.json()
  const { companyId, bookerId, orderIds, notes } = body
  if (!companyId) return bad('companyId required')

  // Authorization: booker can only create batch for assigned company
  if (user.role === 'ORDER_BOOKER' && user.booker) {
    const allowed = bookerCompanyIds(user)
    if (!allowed.includes(companyId)) return bad('Company not assigned to you', 403)
  }

  const count = await db.orderBatch.count()
  const batchNo = `BAT-${String(count + 1).padStart(6, '0')}`

  // Determine orders to attach
  let ordersToUpdate: string[] = []
  if (orderIds?.length) {
    ordersToUpdate = orderIds
  } else {
    // Attach all PENDING orders for this company (and booker if specified)
    const pending = await db.order.findMany({
      where: {
        companyId,
        status: 'PENDING',
        batchId: null,
        ...(bookerId ? { bookerId } : {}),
        ...(user.role === 'ORDER_BOOKER' && user.booker ? { bookerId: user.booker.id } : {}),
      },
      select: { id: true },
    })
    ordersToUpdate = pending.map((p) => p.id)
  }

  const batch = await db.orderBatch.create({
    data: {
      batchNo,
      companyId,
      bookerId: bookerId || (user.role === 'ORDER_BOOKER' && user.booker ? user.booker.id : null),
      notes,
      totalOrders: ordersToUpdate.length,
      status: 'OPEN',
      createdById: user.id,
    },
  })

  // Link orders to this batch
  if (ordersToUpdate.length) {
    await db.order.updateMany({
      where: { id: { in: ordersToUpdate } },
      data: { batchId: batch.id },
    })
  }

  // Recompute totals
  const orders = await db.order.findMany({
    where: { batchId: batch.id, status: { not: 'CANCELLED' } },
    select: { grandTotal: true, shopId: true, items: { select: { quantity: true } } },
  })
  await db.orderBatch.update({
    where: { id: batch.id },
    data: {
      totalOrders: orders.length,
      totalShops: new Set(orders.map((o) => o.shopId)).size,
      totalQuantity: orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0),
      grandTotal: orders.reduce((s, o) => s + o.grandTotal, 0),
    },
  })

  return ok({ ...batch, totalOrders: orders.length, totalShops: new Set(orders.map((o) => o.shopId)).size, totalQuantity: orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0), grandTotal: orders.reduce((s, o) => s + o.grandTotal, 0) }, 201)
}
