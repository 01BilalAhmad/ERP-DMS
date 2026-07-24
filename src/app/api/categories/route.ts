import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const list = await db.category.findMany({
    where: { companyId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return ok(list)
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (['ORDER_BOOKER', 'WAREHOUSE', 'VIEWER'].includes(user.role)) return bad('Forbidden', 403)
  const { companyId, name, code } = await req.json()
  if (!companyId || !name) return bad('companyId and name required')
  const cat = await db.category.create({ data: { companyId, name, code: code || name.slice(0, 4).toUpperCase(), status: 'ACTIVE' } })
  return ok(cat, 201)
}
