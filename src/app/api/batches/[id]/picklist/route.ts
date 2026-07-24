import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/batches/[id]/picklist — consolidated product-wise pick list for warehouse
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
          shop: { select: { id: true, name: true, code: true } },
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

  // Consolidate: group all order items by product
  const productMap: Record<string, {
    product: any
    totalQty: number
    orderCount: number
    shops: { shop: any; qty: number }[]
    lineValue: number
  }> = {}

  for (const order of batch.orders) {
    for (const item of order.items) {
      const pid = item.productId
      if (!productMap[pid]) {
        productMap[pid] = {
          product: item.product,
          totalQty: 0,
          orderCount: 0,
          shops: [],
          lineValue: 0,
        }
      }
      productMap[pid].totalQty += item.quantity
      productMap[pid].orderCount += 1
      productMap[pid].shops.push({ shop: order.shop, qty: item.quantity })
      productMap[pid].lineValue += item.quantity * item.product.tradePrice
    }
  }

  // Get current available stock for each product in the company's section
  const section = await db.warehouseSection.findFirst({ where: { companyId: batch.companyId } })
  const stockMap: Record<string, number> = {}
  if (section) {
    const stocks = await db.stock.findMany({ where: { sectionId: section.id } })
    for (const s of stocks) stockMap[s.productId] = (stockMap[s.productId] || 0) + s.quantity
  }

  const pickList = Object.values(productMap)
    .sort((a, b) => a.product.name.localeCompare(b.product.name))
    .map((p) => ({
      ...p,
      availableStock: stockMap[p.product.id] || 0,
      shortage: (stockMap[p.product.id] || 0) < p.totalQty,
      shortageQty: Math.max(0, p.totalQty - (stockMap[p.product.id] || 0)),
    }))

  return ok({
    batch: {
      id: batch.id,
      batchNo: batch.batchNo,
      company: batch.company,
      booker: batch.booker,
      status: batch.status,
      batchDate: batch.batchDate,
      totalOrders: batch.orders.length,
      totalShops: new Set(batch.orders.map((o) => o.shop.id)).size,
      totalProducts: pickList.length,
      totalUnits: pickList.reduce((s, p) => s + p.totalQty, 0),
      totalValue: pickList.reduce((s, p) => s + p.lineValue, 0),
    },
    section: section ? { id: section.id, name: section.name, code: section.code } : null,
    pickList,
  })
}
