import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await params

  const batch = await db.orderBatch.findUnique({
    where: { id },
    include: {
      company: true,
      booker: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      orders: {
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
  if (!batch) return bad('Batch not found', 404)
  return ok(batch)
}

// PATCH /api/batches/[id] — bulk status update: APPROVE/PICK/DISPATCH/DELIVER all orders
// On DELIVERED: generate invoices + ledger + stock deduction for ALL orders in batch
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { id } = await params
  const body = await req.json()
  const { status, notes } = body

  const batch = await db.orderBatch.findUnique({
    where: { id },
    include: {
      company: true,
      orders: {
        include: {
          shop: { include: { companyLinks: true } },
          items: true,
          invoice: true,
        },
      },
    },
  })
  if (!batch) return bad('Batch not found', 404)

  const flow = ['OPEN', 'APPROVED', 'PICKED', 'DISPATCHED', 'DELIVERED', 'CLOSED', 'CANCELLED']
  const currentIdx = flow.indexOf(batch.status)
  const newIdx = flow.indexOf(status)
  if (newIdx === -1) return bad(`Invalid status: ${status}`)
  if (status !== 'CANCELLED' && newIdx < currentIdx) {
    return bad(`Cannot move batch status backward from ${batch.status} to ${status}`)
  }

  const now = new Date()
  const updateData: any = { status, notes: notes ?? batch.notes }

  if (status === 'APPROVED') {
    updateData.approvedById = user.id
    updateData.approvedAt = now
  }
  if (status === 'PICKED') updateData.pickedAt = now
  if (status === 'DISPATCHED') updateData.dispatchedAt = now
  if (status === 'DELIVERED') {
    updateData.deliveredAt = now
  }
  if (status === 'CLOSED') updateData.closedAt = now

  // Determine target order status (orders follow batch)
  let orderTargetStatus = status
  if (status === 'CLOSED') orderTargetStatus = 'DELIVERED' // orders already delivered
  if (status === 'OPEN') orderTargetStatus = 'PENDING'

  // Update all non-cancelled orders in the batch
  const activeOrders = batch.orders.filter((o) => o.status !== 'CANCELLED')

  await db.$transaction(async (tx) => {
    // Update batch
    await tx.orderBatch.update({ where: { id }, data: updateData })

    // For DELIVERED: generate invoices + ledger + stock deduction for each order
    if (status === 'DELIVERED') {
      for (const order of activeOrders) {
        if (order.invoice) continue // already invoiced

        const invoiceCount = await tx.invoice.count()
        const invoiceNo = `INV-${String(invoiceCount + 1).padStart(6, '0')}`

        const invoice = await tx.invoice.create({
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

        // Deduct stock
        for (const item of order.items) {
          const section = await tx.warehouseSection.findFirst({ where: { companyId: order.companyId } })
          if (!section) continue
          let remaining = item.quantity
          const stocks = await tx.stock.findMany({
            where: { sectionId: section.id, productId: item.productId, quantity: { gt: 0 } },
            orderBy: { createdAt: 'asc' },
          })
          for (const s of stocks) {
            if (remaining <= 0) break
            const take = Math.min(s.quantity, remaining)
            await tx.stock.update({ where: { id: s.id }, data: { quantity: s.quantity - take } })
            remaining -= take
          }
          const bal = await tx.stock.aggregate({
            where: { sectionId: section.id, productId: item.productId },
            _sum: { quantity: true },
          })
          await tx.stockMovement.create({
            data: {
              sectionId: section.id,
              productId: item.productId,
              type: 'OUT',
              quantity: -item.quantity,
              balance: bal._sum.quantity || 0,
              reference: `${order.orderNo} (batch ${batch.batchNo})`,
              notes: 'Batch delivery',
            },
          })
        }

        // Ledger debit
        const baseTotal = order.grandTotal * order.currencyRate
        const shopLink = order.shop.companyLinks.find((l) => l.companyId === order.companyId)
        const prevBal = shopLink?.outstandingBalance || 0
        const newBalance = prevBal + baseTotal

        await tx.ledger.create({
          data: {
            companyId: order.companyId,
            shopId: order.shopId,
            orderId: order.id,
            invoiceId: invoice.id,
            entryType: 'DEBIT',
            amount: baseTotal,
            balance: newBalance,
            reference: invoice.invoiceNo,
            description: `Invoice ${invoice.invoiceNo} (batch ${batch.batchNo})`,
          },
        })

        if (shopLink) {
          await tx.shopCompanyLink.update({
            where: { id: shopLink.id },
            data: { outstandingBalance: newBalance },
          })
        }

        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'DELIVERED', deliveryDate: now, approvedById: order.approvedById || user.id, approvedAt: order.approvedAt || now },
        })
      }
    } else if (status === 'CANCELLED') {
      // Cancel all orders in batch
      await tx.order.updateMany({
        where: { batchId: id },
        data: { status: 'CANCELLED' },
      })
    } else {
      // Update all active orders' status
      await tx.order.updateMany({
        where: { batchId: id, status: { not: 'CANCELLED' } },
        data: {
          status: orderTargetStatus,
          ...(status === 'APPROVED' ? { approvedById: user.id, approvedAt: now } : {}),
          ...(status === 'DELIVERED' ? { deliveryDate: now } : {}),
        },
      })
    }
  })

  const updated = await db.orderBatch.findUnique({
    where: { id },
    include: { company: true, orders: { select: { id: true, orderNo: true, status: true, grandTotal: true } } },
  })
  return ok(updated)
}
