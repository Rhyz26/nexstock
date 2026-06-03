import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export const dynamic = 'force-dynamic'

export async function GET(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error

  const product = await prisma.product.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
    include: {
      stockLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })

  if (!product) return err('Not found', 404)
  return ok(product)
}

export async function PUT(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error

  const data = await req.json()

  const existing = await prisma.product.findFirst({
    where: { id: params.id, businessId: session.user.businessId },
  })
  if (!existing) return err('Not found', 404)

  const newStock = parseInt(data.stock) ?? existing.stock
  const stockDiff = newStock - existing.stock

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: data.name,
      sku: data.sku || null,
      category: data.category || null,
      buyingPrice: parseFloat(data.buyingPrice) || 0,
      sellingPrice: parseFloat(data.sellingPrice),
      stock: newStock,
      lowStockAt: parseInt(data.lowStockAt) || 5,
      unit: data.unit || 'pcs',
    },
  })

  if (stockDiff !== 0) {
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        type: stockDiff > 0 ? 'ADD' : 'REMOVE',
        quantity: Math.abs(stockDiff),
        note: data.stockNote || 'Manual adjustment',
      },
    })
  }

  return ok(product)
}

export async function DELETE(req, { params }) {
  const { error, session } = await requireAuth()
  if (error) return error

  try {
    const existing = await prisma.product.findFirst({
      where: { id: params.id, businessId: session.user.businessId },
    })

    if (!existing) return err('Product not found', 404)

    // Delete stock logs first to avoid foreign key constraint errors
    await prisma.stockLog.deleteMany({
      where: { productId: params.id },
    })

    // Delete the product
    await prisma.product.delete({
      where: { id: params.id },
    })

    return ok({ success: true })
  } catch (e) {
    console.error('Delete product error:', e)
    return err('Cannot delete product — it may be used in existing invoices', 400)
  }
}