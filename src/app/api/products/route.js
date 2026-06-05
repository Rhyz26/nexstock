import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/apiHelper'

export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { error, session } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const lowStock = searchParams.get('lowStock') === 'true'

  const where = {
    businessId: session.user.businessId,
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
    ...(category && { category }),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: 'asc' },
  })

  const result = lowStock
    ? products.filter(p => p.stock <= p.lowStockAt)
    : products

  return ok(result)
}

export async function POST(req) {
  const { error, session } = await requireAuth()
  if (error) return error

  const data = await req.json()

  if (!data.name || !data.name.trim()) {
    return err('Product name is required')
  }

  if (!data.sellingPrice) {
    return err('Selling price is required')
  }

  // Check for duplicate name — case insensitive
  const existing = await prisma.product.findFirst({
    where: {
      businessId: session.user.businessId,
      name: { equals: data.name.trim(), mode: 'insensitive' },
    },
  })

  if (existing) {
    return err(`A product named "${existing.name}" already exists in your inventory`, 409)
  }

  const product = await prisma.product.create({
    data: {
      name: data.name.trim(),
      sku: data.sku?.trim() || null,
      category: data.category || null,
      buyingPrice: parseFloat(data.buyingPrice) || 0,
      sellingPrice: parseFloat(data.sellingPrice),
      stock: parseInt(data.stock) || 0,
      lowStockAt: parseInt(data.lowStockAt) || 5,
      unit: data.unit || 'pcs',
      businessId: session.user.businessId,
    },
  })

  if (data.stock > 0) {
    await prisma.stockLog.create({
      data: {
        productId: product.id,
        type: 'ADD',
        quantity: product.stock,
        note: 'Initial stock',
      },
    })
  }

  return ok(product, 201)
}