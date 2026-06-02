import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: true },
      },
    },
  })
  if (!customer) return err('Not found', 404)
  return ok(customer)
}

export async function PUT(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()
  const existing = await prisma.customer.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)
  const customer = await prisma.customer.update({
    where: { id: params.id },
    data: { name: data.name, phone: data.phone, email: data.email, address: data.address },
  })
  return ok(customer)
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error
  const existing = await prisma.customer.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)
  await prisma.customer.delete({ where: { id: params.id } })
  return ok({ success: true })
}
