import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/purchase-invoices?companyId=xxx
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined

  const where: any = {}
  if (companyId) where.companyId = companyId

  const list = await db.purchaseInvoice.findMany({
    where,
    include: {
      company: { select: { code: true, name: true } },
      items: { include: { product: { select: { code: true, name: true, unit: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(list)
}

// POST /api/purchase-invoices — create purchase invoice + auto-add stock
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)

  const body = await req.json()
  const { companyId, supplierName, supplierNtn, invoiceDate, items, taxAmount, otherCharges, notes } = body
  if (!companyId || !supplierName || !items?.length) return bad('companyId, supplierName, items required')

  const count = await db.purchaseInvoice.count()
  const invoiceNo = `PINV-${String(count + 1).padStart(6, '0')}`

  const subtotal = items.reduce((s: number, it: any) => s + it.quantity * it.unitPrice, 0)
  const grandTotal = subtotal + Number(taxAmount || 0) + Number(otherCharges || 0)

  // Create purchase invoice + add stock + stock movements in transaction
  const purchaseInvoice = await db.$transaction(async (tx) => {
    const pi = await tx.purchaseInvoice.create({
      data: {
        invoiceNo,
        companyId,
        supplierName,
        supplierNtn,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        subtotal,
        taxAmount: Number(taxAmount || 0),
        otherCharges: Number(otherCharges || 0),
        grandTotal,
        notes,
        status: 'POSTED',
        createdById: user.id,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate || 0),
            lineTotal: Number(it.quantity) * Number(it.unitPrice),
          })),
        },
      },
      include: { items: true },
    })

    // Add stock for each item
    const section = await tx.warehouseSection.findFirst({ where: { companyId } })
    if (!section) throw new Error('No warehouse section for this company')

    for (const item of pi.items) {
      const existing = await tx.stock.findFirst({ where: { sectionId: section.id, productId: item.productId } })
      if (existing) {
        await tx.stock.update({ where: { id: existing.id }, data: { quantity: existing.quantity + item.quantity } })
      } else {
        await tx.stock.create({ data: { sectionId: section.id, productId: item.productId, quantity: item.quantity, batchNo: `PINV-${invoiceNo}` } })
      }
      await tx.stockMovement.create({
        data: {
          sectionId: section.id,
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          balance: (existing?.quantity || 0) + item.quantity,
          reference: pi.invoiceNo,
          notes: `Purchase from ${supplierName}`,
        },
      })
    }

    return pi
  })

  return ok(purchaseInvoice, 201)
}
