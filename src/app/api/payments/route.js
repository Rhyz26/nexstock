import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const data = await req.json()

  if (!data.invoiceId || !data.amount) return err('Invoice and amount required')

  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, businessId: session.user.businessId },
    include: { payments: true },
  })
  if (!invoice) return err('Invoice not found', 404)

  const totalPaid = invoice.payments.reduce((s, p) => s + p.amount, 0) + parseFloat(data.amount)

  const newStatus = totalPaid >= invoice.total ? 'PAID' : 'PARTIAL'

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        businessId: session.user.businessId,
        amount: parseFloat(data.amount),
        method: data.method || 'CASH',
        reference: data.reference || null,
      },
    }),
    prisma.invoice.update({ where: { id: data.invoiceId }, data: { status: newStatus } }),
  ])

  return ok(payment, 201)
}

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const payments = await prisma.payment.findMany({
    where: {
      businessId: session.user.businessId,
      ...(from && to && { createdAt: { gte: new Date(from), lte: new Date(to) } }),
    },
    include: { invoice: { select: { number: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok(payments)
}
