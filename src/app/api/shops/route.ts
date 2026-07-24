import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') || ''
  const companyLink = searchParams.get('companyId')
  const status = searchParams.get('status') || undefined
  const shopClass = searchParams.get('class') || undefined
  const bookerId = searchParams.get('bookerId') || undefined

  const where: Prisma.ShopWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { phone: { contains: search } },
      { ownerName: { contains: search } },
    ]
  }
  if (status) where.status = status
  if (shopClass) where.shopClass = shopClass
  if (companyLink) {
    where.companyLinks = { some: { companyId: companyLink } }
  }
  // Filter by booker assignment: only shops assigned to this booker (via BookerShopAssignment)
  if (bookerId) {
    where.assignments = { some: { bookerId } }
  }

  const shops = await db.shop.findMany({
    where,
    include: {
      companyLinks: { include: { company: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { code: 'asc' },
    take: 500,
  })
  return ok(shops)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role))
    return bad('Forbidden', 403)

  const body = await req.json()
  const {
    name, ownerName, phone, address, gpsLat, gpsLng,
    shopClass, taxType, ntn, strn, visitDay,
    companyIds, creditLimits, status,
  } = body

  if (!name) return bad('Shop name required')
  if (!companyIds?.length) return bad('At least one company required')

  // Generate shop code
  const count = await db.shop.count()
  const code = `SHOP-${String(count + 1).padStart(4, '0')}`

  try {
    const shop = await db.shop.create({
      data: {
        code,
        name,
        ownerName,
        phone,
        address,
        gpsLat: gpsLat ? Number(gpsLat) : null,
        gpsLng: gpsLng ? Number(gpsLng) : null,
        shopClass: shopClass || 'C',
        taxType: taxType || 'NON_FILER',
        ntn,
        strn,
        visitDay,
        status: status || 'ACTIVE',
        companyLinks: {
          create: companyIds.map((cid: string, i: number) => ({
            companyId: cid,
            creditLimit: Number(creditLimits?.[i] ?? 0),
          })),
        },
      },
      include: { companyLinks: { include: { company: true } } },
    })
    return ok(shop, 201)
  } catch (e: any) {
    return bad(e.message || 'Failed', 500)
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role))
    return bad('Forbidden', 403)

  const body = await req.json()
  const { id, companyLinks, ...rest } = body
  if (!id) return bad('id required')

  const updated = await db.shop.update({
    where: { id },
    data: {
      ...rest,
      gpsLat: rest.gpsLat != null ? Number(rest.gpsLat) : undefined,
      gpsLng: rest.gpsLng != null ? Number(rest.gpsLng) : undefined,
    },
  })

  // Update company links
  if (companyLinks) {
    await db.shopCompanyLink.deleteMany({ where: { shopId: id } })
    if (companyLinks.length) {
      await db.shopCompanyLink.createMany({
        data: companyLinks.map((c: any) => ({ shopId: id, companyId: c.companyId, creditLimit: Number(c.creditLimit || 0) })),
      })
    }
  }
  return ok(updated)
}
