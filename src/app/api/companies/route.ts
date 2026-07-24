import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  // Booker only sees assigned companies
  if (user.role === 'ORDER_BOOKER' && user.booker) {
    const ids = user.booker.companyMaps.map((m) => m.companyId)
    const list = await db.company.findMany({ where: { id: { in: ids } }, orderBy: { name: 'asc' } })
    return ok(list)
  }
  const list = await db.company.findMany({ orderBy: { name: 'asc' } })
  return ok(list)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!['SUPER_ADMIN', 'COMPANY_MANAGER'].includes(user.role)) return bad('Forbidden', 403)

  const body = await req.json()
  const { code, name, address, phone, ntn, strn, taxType, salesTaxRate, filerTaxRate, nonFilerTaxRate, furtherTaxRate, defaultCurrency } = body
  if (!code || !name) return bad('code and name required')

  try {
    const comp = await db.company.create({
      data: {
        code: code.toUpperCase(),
        name,
        address,
        phone,
        ntn,
        strn,
        taxType: taxType || 'FILER',
        salesTaxRate: Number(salesTaxRate ?? 17),
        filerTaxRate: Number(filerTaxRate ?? 4.5),
        nonFilerTaxRate: Number(nonFilerTaxRate ?? 8),
        furtherTaxRate: Number(furtherTaxRate ?? 3),
        defaultCurrency: defaultCurrency || 'PKR',
        status: 'ACTIVE',
      },
    })

    // Auto-create warehouse section
    const wh = await db.warehouse.findFirst()
    if (wh) {
      await db.warehouseSection.create({
        data: {
          warehouseId: wh.id,
          companyId: comp.id,
          name: `${comp.name} Section`,
          code: comp.code,
          status: 'ACTIVE',
        },
      })
    }
    return ok(comp, 201)
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return bad('Company code already exists')
    }
    return bad(e.message || 'Failed to create company', 500)
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (!['SUPER_ADMIN', 'COMPANY_MANAGER'].includes(user.role)) return bad('Forbidden', 403)

  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return bad('id required')
  const comp = await db.company.update({ where: { id }, data: { ...rest, salesTaxRate: Number(rest.salesTaxRate), filerTaxRate: Number(rest.filerTaxRate), nonFilerTaxRate: Number(rest.nonFilerTaxRate), furtherTaxRate: Number(rest.furtherTaxRate) } })
  return ok(comp)
}
