import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined

  const warehouse = await db.warehouse.findFirst({
    include: {
      sections: {
        where: companyId ? { companyId } : {},
        include: {
          company: true,
          stocks: { include: { product: { select: { id: true, name: true, code: true, unit: true, tradePrice: true } } } },
        },
      },
    },
  })
  if (!warehouse) return ok({ sections: [] })
  return ok(warehouse)
}

// Stock adjustment
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)
  const { sectionId, productId, quantity, type, notes, batchNo } = await req.json()
  if (!sectionId || !productId || quantity == null) return bad('sectionId, productId, quantity required')

  const stock = await db.stock.findFirst({ where: { sectionId, productId } })
  const newQty = (stock?.quantity || 0) + Number(quantity)
  if (newQty < 0) return bad('Insufficient stock for this adjustment')

  if (stock) {
    await db.stock.update({ where: { id: stock.id }, data: { quantity: newQty } })
  } else {
    await db.stock.create({ data: { sectionId, productId, quantity: newQty, batchNo: batchNo || `ADJ-${Date.now()}` } })
  }
  await db.stockMovement.create({
    data: {
      sectionId,
      productId,
      type: type || 'ADJUST',
      quantity: Number(quantity),
      balance: newQty,
      reference: `Manual adjustment`,
      notes,
    },
  })
  return ok({ quantity: newQty })
}
