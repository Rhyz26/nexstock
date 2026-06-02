export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''

  const customers = await prisma.customer.findMany({
    where: {
      businessId: session.user.businessId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    },
    include: { _count: { select: { invoices: true } } },
    orderBy: { name: 'asc' },
  })
  return ok(customers)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()
  if (!data.name) return err('Name required')

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      businessId: session.user.businessId,
    },
  })
  return ok(customer, 201)
}
