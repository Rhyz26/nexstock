import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search') || ''

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: session.user.businessId,
      ...(status && { status }),
      ...(search && { number: { contains: search, mode: 'insensitive' } }),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      items: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return ok(invoices)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()

  if (!data.items || data.items.length === 0) return err('At least one item required')

  const business = await prisma.business.findUnique({ where: { id: session.user.businessId } })

  const count = await prisma.invoice.count({ where: { businessId: session.user.businessId } })
  const number = `INV-${String(count + 1).padStart(4, '0')}`

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.price, 0)
  const discount = parseFloat(data.discount) || 0
  const tax = ((subtotal - discount) * (business.taxRate / 100))
  const total = subtotal - discount + tax

  const invoice = await prisma.invoice.create({
    data: {
      number,
      customerId: data.customerId || null,
      businessId: session.user.businessId,
      subtotal,
      discount,
      tax,
      total,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes || null,
      status: 'PENDING',
      items: {
        create: data.items.map(i => ({
          productId: i.productId || null,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          total: i.quantity * i.price,
        })),
      },
    },
    include: { items: true, customer: true },
  })

  for (const item of data.items) {
    if (item.productId) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
      await prisma.stockLog.create({
        data: {
          productId: item.productId,
          type: 'SALE',
          quantity: item.quantity,
          note: `Invoice ${number}`,
        },
      })
    }
  }

  return ok(invoice, 201)
}
