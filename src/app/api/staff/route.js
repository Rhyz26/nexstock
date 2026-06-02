import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'
import bcrypt from 'bcryptjs'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const staff = await prisma.user.findMany({
    where: { businessId: session.user.businessId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return ok(staff)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error

  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return err('Insufficient permissions', 403)
  }

  const data = await req.json()
  if (!data.name || !data.email || !data.password) return err('Name, email, password required')

  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) return err('Email already in use')

  const hashed = await bcrypt.hash(data.password, 10)
  const staff = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role || 'CASHIER',
      businessId: session.user.businessId,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
  return ok(staff, 201)
}
