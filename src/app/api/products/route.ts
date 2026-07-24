import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

// GET /api/products?companyId=xxx&q=biscuit
export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const q = searchParams.get('q') || ''
  const categoryId = searchParams.get('categoryId') || undefined

  const where: any = { status: 'ACTIVE' }
  if (companyId) where.companyId = companyId
  if (categoryId) where.categoryId = categoryId
  if (q) {
    where.OR = [{ name: { contains: q } }, { code: { contains: q } }]
  }

  const products = await db.product.findMany({
    where,
    include: {
      category: true,
      company: { select: { id: true, code: true, name: true } },
      stocks: { include: { section: true } },
      schemes: { where: { status: 'ACTIVE' } },
    },
    orderBy: { name: 'asc' },
    take: 500,
  })

  // Compute available stock per product (sum across batches)
  const withStock = products.map((p) => {
    const available = p.stocks.reduce((s, st) => s + st.quantity, 0)
    return { ...p, availableStock: available }
  })
  return ok(withStock)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)

  const body = await req.json()
  const {
    companyId, categoryId, code, name, description, packSize, unit, piecesPerPack,
    tradePrice, retailerPrice, costPrice, taxRate, openingStock,
  } = body
  if (!companyId || !code || !name || tradePrice == null) return bad('companyId, code, name, tradePrice required')

  const product = await db.product.create({
    data: {
      companyId,
      categoryId: categoryId || null,
      code: code.toUpperCase(),
      name,
      description,
      packSize,
      unit: unit || 'CTN',
      piecesPerPack: Number(piecesPerPack || 1),
      tradePrice: Number(tradePrice),
      retailerPrice: retailerPrice ? Number(retailerPrice) : null,
      costPrice: Number(costPrice || 0),
      taxRate: Number(taxRate ?? 17),
      status: 'ACTIVE',
    },
  })

  // Opening stock
  if (openingStock && Number(openingStock) > 0) {
    const section = await db.warehouseSection.findFirst({ where: { companyId } })
    if (section) {
      await db.stock.create({
        data: {
          sectionId: section.id,
          productId: product.id,
          quantity: Number(openingStock),
          batchNo: `OPEN-${Date.now()}`,
        },
      })
      await db.stockMovement.create({
        data: {
          sectionId: section.id,
          productId: product.id,
          type: 'OPENING',
          quantity: Number(openingStock),
          balance: Number(openingStock),
          reference: 'Opening balance',
          notes: 'Initial stock',
        },
      })
    }
  }

  return ok(product, 201)
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)
  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return bad('id required')
  const p = await db.product.update({
    where: { id },
    data: {
      ...rest,
      piecesPerPack: rest.piecesPerPack != null ? Number(rest.piecesPerPack) : undefined,
      tradePrice: rest.tradePrice != null ? Number(rest.tradePrice) : undefined,
      retailerPrice: rest.retailerPrice != null ? Number(rest.retailerPrice) : undefined,
      costPrice: rest.costPrice != null ? Number(rest.costPrice) : undefined,
      taxRate: rest.taxRate != null ? Number(rest.taxRate) : undefined,
    },
  })
  return ok(p)
}
