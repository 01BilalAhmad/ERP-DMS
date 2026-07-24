import { NextResponse } from 'next/server'
import { getSessionUser, unauthorized, bad, ok } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const warehouse = await db.warehouse.findFirst({
    include: {
      sections: {
        include: {
          company: true,
          stocks: { include: { product: true } },
          _count: true,
        },
      },
    },
  })
  return ok(warehouse || { sections: [] })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  if (user.role !== 'SUPER_ADMIN') return bad('Forbidden', 403)
  const body = await req.json()
  const { name, address } = body
  if (!name) return bad('name required')
  const wh = await db.warehouse.create({ data: { name, address, status: 'ACTIVE' } })
  return ok(wh, 201)
}
