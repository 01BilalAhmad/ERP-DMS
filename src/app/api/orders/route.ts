import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok, bookerCompanyIds } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { calculateOrderTotals, type CartItem } from '@/lib/erp-types'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const status = searchParams.get('status') || undefined
  const bookerId = searchParams.get('bookerId') || undefined
  const shopId = searchParams.get('shopId') || undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const q = searchParams.get('q') || ''
  const limit = Number(searchParams.get('limit') || 200)

  const where: Prisma.OrderWhereInput = {}
  if (companyId) where.companyId = companyId
  if (status) where.status = status
  if (shopId) where.shopId = shopId
  if (from || to) {
    where.orderDate = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  }
  if (bookerId) where.bookerId = bookerId
  if (q) where.OR = [{ orderNo: { contains: q } }, { shop: { name: { contains: q } } }]

  // Booker only sees their own + assigned companies
  if (user.role === 'ORDER_BOOKER' && user.booker) {
    where.bookerId = user.booker.id
    const ids = bookerCompanyIds(user)
    where.companyId = { in: ids }
  }

  const orders = await db.order.findMany({
    where,
    include: {
      company: true,
      shop: true,
      booker: true,
      items: { include: { product: true } },
      invoice: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return ok(orders)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const body = await req.json()
  const {
    companyId, shopId, items, manualDiscount, currency, currencyRate,
    notes, bookerId,
  } = body as {
    companyId: string
    shopId: string
    items: CartItem[]
    manualDiscount: number
    currency: string
    currencyRate: number
    notes?: string
    bookerId?: string
  }

  if (!companyId || !shopId) return bad('companyId and shopId required')
  if (!items?.length) return bad('At least one item required')

  // Authorization
  if (user.role === 'ORDER_BOOKER' && user.booker) {
    const allowed = bookerCompanyIds(user)
    if (!allowed.includes(companyId)) return bad('Company not assigned to you', 403)
  }

  const company = await db.company.findUnique({ where: { id: companyId } })
  if (!company) return bad('Company not found')

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    include: { companyLinks: { where: { companyId } } },
  })
  if (!shop) return bad('Shop not found')

  const link = shop.companyLinks[0]
  const creditLimit = link?.creditLimit || 0
  const outstandingBalance = link?.outstandingBalance || 0

  const totals = calculateOrderTotals(items, {
    manualDiscount: Number(manualDiscount || 0),
    salesTaxRate: company.salesTaxRate,
    filerTaxRate: company.filerTaxRate,
    nonFilerTaxRate: company.nonFilerTaxRate,
    furtherTaxRate: company.furtherTaxRate,
    shopTaxType: shop.taxType as 'FILER' | 'NON_FILER',
    creditLimit,
    outstandingBalance,
    currencyRate: Number(currencyRate || 1),
  })

  // Stock check (warning only)
  const stockWarnings: string[] = []
  for (const item of items) {
    const product = await db.product.findUnique({
      where: { id: item.productId },
      include: { stocks: { where: { section: { companyId } } } },
    })
    if (product) {
      const available = product.stocks.reduce((s, st) => s + st.quantity, 0)
      if (available < item.quantity) {
        stockWarnings.push(`⚠️ ${product.name}: ordered ${item.quantity} ${product.unit}, only ${available} in stock. Order will still be saved.`)
      }
    }
  }
  totals.warnings.push(...stockWarnings)
  totals.stockShortage = stockWarnings.length > 0

  // Generate order number
  const count = await db.order.count()
  const orderNo = `ORD-${String(count + 1).padStart(6, '0')}`

  const finalBookerId = user.role === 'ORDER_BOOKER' && user.booker ? user.booker.id : bookerId

  try {
    const order = await db.order.create({
      data: {
        orderNo,
        companyId,
        shopId,
        bookerId: finalBookerId || null,
        status: user.role === 'ORDER_BOOKER' ? 'PENDING' : 'PENDING',
        currency: currency || 'PKR',
        currencyRate: Number(currencyRate || 1),
        subtotal: totals.subtotal,
        schemeDiscount: totals.schemeDiscount,
        manualDiscount: totals.manualDiscount,
        totalDiscount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        salesTax: totals.salesTax,
        furtherTax: totals.furtherTax,
        withholdingTax: totals.withholdingTax,
        grandTotal: totals.grandTotal,
        creditLimitExceeded: totals.creditLimitExceeded,
        stockShortage: totals.stockShortage,
        warnings: totals.warnings.length ? JSON.stringify(totals.warnings) : null,
        notes,
        createdById: user.id,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discountPct: Number(it.discountPct || 0),
            discountAmt: (Number(it.quantity) * Number(it.unitPrice) * Number(it.discountPct || 0)) / 100,
            taxRate: Number(it.taxRate),
            taxAmount: (Number(it.quantity) * Number(it.unitPrice) * (1 - Number(it.discountPct || 0) / 100) * Number(it.taxRate)) / 100,
            lineTotal: Number(it.quantity) * Number(it.unitPrice) * (1 - Number(it.discountPct || 0) / 100) * (1 + Number(it.taxRate) / 100),
            schemeApplied: it.schemeApplied || null,
          })),
        },
      },
      include: { items: true, company: true, shop: true },
    })

    return ok({ order, warnings: totals.warnings, totals }, 201)
  } catch (e: any) {
    return bad(e.message || 'Failed to create order', 500)
  }
}
