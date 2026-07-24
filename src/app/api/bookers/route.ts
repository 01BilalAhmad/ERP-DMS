import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const list = await db.orderBooker.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true, role: true } },
      companyMaps: { include: { company: true } },
      _count: { select: { orders: true, shopAssign: true } },
    },
    orderBy: { employeeCode: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'SUPER_ADMIN') return bad('Forbidden', 403)

  const body = await req.json()
  const { name, email, phone, password, companyIds, employeeCode } = body
  if (!name || !email || !password) return bad('name, email, password required')
  if (!companyIds?.length) return bad('At least one company required')

  const count = await db.orderBooker.count()
  const code = employeeCode || `OB-${String(count + 1).padStart(3, '0')}`

  try {
    const u = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: await hashPassword(password),
        role: 'ORDER_BOOKER',
        phone,
        status: 'ACTIVE',
        booker: {
          create: {
            employeeCode: code,
            name,
            phone,
            companyMaps: { create: companyIds.map((cid: string) => ({ companyId: cid })) },
          },
        },
      },
      include: { booker: { include: { companyMaps: true } } },
    })
    return ok(u, 201)
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return bad('Email or employee code already exists')
    }
    return bad(e.message || 'Failed', 500)
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'SUPER_ADMIN') return bad('Forbidden', 403)
  const body = await req.json()
  const { id, name, phone, email, companyIds, status } = body
  if (!id) return bad('id required')

  const booker = await db.orderBooker.update({ where: { id }, data: { name, phone, status } })
  if (email) {
    await db.user.update({ where: { id: booker.userId }, data: { email: email.toLowerCase(), name, phone } })
  }
  if (companyIds) {
    await db.bookerCompanyMapping.deleteMany({ where: { bookerId: id } })
    if (companyIds.length) {
      await db.bookerCompanyMapping.createMany({
        data: companyIds.map((cid: string) => ({ bookerId: id, companyId: cid })),
      })
    }
  }
  return ok(booker)
}
