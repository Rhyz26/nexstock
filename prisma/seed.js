const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('password123', 10)

  const business = await prisma.business.create({
    data: {
      name: 'Kampala General Store',
      email: 'demo@nexstock.co.ug',
      phone: '+256700000000',
      address: 'Kampala Road, Kampala',
      currency: 'UGX',
      taxRate: 18,
      plan: 'GROWTH',
    },
  })

  await prisma.user.create({
    data: {
      name: 'Demo Owner',
      email: 'demo@nexstock.co.ug',
      password: hashed,
      role: 'OWNER',
      businessId: business.id,
    },
  })

  const products = [
    { name: 'Sugar 1kg', category: 'Groceries', buyingPrice: 3500, sellingPrice: 4000, stock: 50 },
    { name: 'Cooking Oil 1L', category: 'Groceries', buyingPrice: 6000, sellingPrice: 7000, stock: 30 },
    { name: 'Maize Flour 2kg', category: 'Groceries', buyingPrice: 5000, sellingPrice: 6000, stock: 40 },
    { name: 'Soap Bar', category: 'Toiletries', buyingPrice: 1500, sellingPrice: 2000, stock: 100 },
    { name: 'Airtime MTN 1000', category: 'Airtime', buyingPrice: 950, sellingPrice: 1000, stock: 200 },
  ]

  for (const p of products) {
    await prisma.product.create({ data: { ...p, businessId: business.id } })
  }

  const customer = await prisma.customer.create({
    data: { name: 'John Mukasa', phone: '+256701234567', businessId: business.id },
  })

  console.log('Seed complete. Login: demo@nexstock.co.ug / password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
