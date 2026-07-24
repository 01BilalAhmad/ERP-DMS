import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    include: {
      company: true,
      shop: { include: { companyLinks: true } },
      booker: true,
      items: { include: { product: true } },
      invoice: true,
      ledger: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })
  if (!order) return bad('Order not found', 404)
  return ok(order)
}

// Status update: PENDING -> APPROVED -> PICKED -> DISPATCHED -> DELIVERED -> CANCELLED
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await params
  const body = await req.json()
  const { status, notes } = body

  const order = await db.order.findUnique({
    where: { id },
    include: { company: true, shop: { include: { companyLinks: true } }, items: true },
  })
  if (!order) return bad('Order not found', 404)

  const flow = ['DRAFT', 'PENDING', 'APPROVED', 'PICKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED']
  const currentIdx = flow.indexOf(order.status)
  const newIdx = flow.indexOf(status)
  if (newIdx === -1) return bad(`Invalid status: ${status}`)

  // Cancellation allowed
  if (status !== 'CANCELLED' && newIdx < currentIdx) {
    return bad(`Cannot move status backward from ${order.status} to ${status}`)
  }

  const updateData: any = { status, notes: notes ?? order.notes }
  if (status === 'APPROVED') {
    updateData.approvedById = user.id
    updateData.approvedAt = new Date()
  }
  if (status === 'DELIVERED') {
    updateData.deliveryDate = new Date()
  }

  const updated = await db.order.update({ where: { id }, data: updateData })

  // On DELIVERED: generate invoice + post ledger debit + deduct stock + update outstanding
  if (status === 'DELIVERED' && !order.invoice) {
    const invoiceCount = await db.invoice.count()
    const invoiceNo = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        orderId: order.id,
        companyId: order.companyId,
        shopId: order.shopId,
        currency: order.currency,
        currencyRate: order.currencyRate,
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        salesTax: order.salesTax,
        furtherTax: order.furtherTax,
        withholdingTax: order.withholdingTax,
        grandTotal: order.grandTotal,
        previousBalance: order.previousBalance,
        totalPayable: order.totalPayable,
        balance: order.totalPayable,
        status: 'UNPAID',
      },
    })

    // Deduct stock + movements
    for (const item of order.items) {
      const section = await db.warehouseSection.findFirst({ where: { companyId: order.companyId } })
      if (!section) continue
      let remaining = item.quantity
      const stocks = await db.stock.findMany({
        where: { sectionId: section.id, productId: item.productId, quantity: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      })
      for (const s of stocks) {
        if (remaining <= 0) break
        const take = Math.min(s.quantity, remaining)
        await db.stock.update({ where: { id: s.id }, data: { quantity: s.quantity - take } })
        remaining -= take
      }
      const bal = await db.stock.aggregate({
        where: { sectionId: section.id, productId: item.productId },
        _sum: { quantity: true },
      })
      await db.stockMovement.create({
        data: {
          sectionId: section.id,
          productId: item.productId,
          type: 'OUT',
          quantity: -item.quantity,
          balance: bal._sum.quantity || 0,
          reference: order.orderNo,
          notes: `Order delivered`,
        },
      })
    }

    // Ledger debit (in base currency = company default currency)
    const baseTotal = order.grandTotal * order.currencyRate
    const shopLink = order.shop.companyLinks.find((l) => l.companyId === order.companyId)
    const prevBal = shopLink?.outstandingBalance || 0
    const newBalance = prevBal + baseTotal

    await db.ledger.create({
      data: {
        companyId: order.companyId,
        shopId: order.shopId,
        orderId: order.id,
        invoiceId: invoice.id,
        entryType: 'DEBIT',
        amount: baseTotal,
        balance: newBalance,
        reference: invoice.invoiceNo,
        description: `Invoice ${invoice.invoiceNo} for order ${order.orderNo}`,
      },
    })

    // Update shop outstanding
    if (shopLink) {
      await db.shopCompanyLink.update({
        where: { id: shopLink.id },
        data: { outstandingBalance: newBalance },
      })
    }
  }

  return ok(updated)
}
