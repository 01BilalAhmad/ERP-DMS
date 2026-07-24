import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const userId = (session.user as any).id as string
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { booker: { include: { companyMaps: true } } },
  })
  return user
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(msg = 'Forbidden') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export function hasRole(user: any, roles: string[]) {
  return roles.includes(user?.role)
}

// Booker can only access companies assigned to them
export function bookerCompanyIds(user: any): string[] {
  if (!user?.booker) return []
  return user.booker.companyMaps.map((m: any) => m.companyId)
}
