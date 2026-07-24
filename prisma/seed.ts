import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

async function main() {
  console.log('🌱 Seeding ERP data...')

  // 1. Currencies
  const pkr = await db.currency.upsert({
    where: { code: 'PKR' },
    update: {},
    create: { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', rate: 1, isDefault: true },
  })
  await db.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: { code: 'USD', name: 'US Dollar', symbol: '$', rate: 278, isDefault: false },
  })
  await db.currency.upsert({
    where: { code: 'AED' },
    update: {},
    create: { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rate: 75, isDefault: false },
  })
  await db.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: { code: 'EUR', name: 'Euro', symbol: '€', rate: 300, isDefault: false },
  })
  console.log('✓ Currencies seeded')

  // 2. Super Admin
  const adminPass = await hashPassword('admin123')
  const admin = await db.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      email: 'admin@erp.local',
      name: 'Super Admin',
      password: adminPass,
      role: 'SUPER_ADMIN',
      phone: '0300-0000000',
      status: 'ACTIVE',
    },
  })
  console.log('✓ Super admin created: admin@erp.local / admin123')

  // 3. Warehouse
  const warehouse = await db.warehouse.upsert({
    where: { id: 'warehouse-main' },
    update: {},
    create: { id: 'warehouse-main', name: 'Main Warehouse', address: 'Central Distribution Hub', status: 'ACTIVE' },
  })
  console.log('✓ Warehouse created')

  // 4. Four Companies (different products, separate tax configs)
  const companies = [
    {
      code: 'COMP-A',
      name: 'Alpha Distributors',
      address: 'Plot 12, Industrial Area, Karachi',
      phone: '021-11111111',
      ntn: '1234567-8',
      strn: '1234567-8-001',
      taxType: 'FILER',
      salesTaxRate: 17,
      filerTaxRate: 4.5,
      nonFilerTaxRate: 8,
      furtherTaxRate: 3,
    },
    {
      code: 'COMP-B',
      name: 'Beta Beverages',
      address: 'Plot 45, Korangi, Karachi',
      phone: '021-22222222',
      ntn: '2345678-9',
      strn: '2345678-9-001',
      taxType: 'FILER',
      salesTaxRate: 17,
      filerTaxRate: 4.5,
      nonFilerTaxRate: 8,
      furtherTaxRate: 3,
    },
    {
      code: 'COMP-C',
      name: 'Gamma Goods Co.',
      address: 'Plot 78, SITE, Karachi',
      phone: '021-33333333',
      ntn: '3456789-0',
      strn: '3456789-0-001',
      taxType: 'FILER',
      salesTaxRate: 17,
      filerTaxRate: 4.5,
      nonFilerTaxRate: 8,
      furtherTaxRate: 3,
    },
    {
      code: 'COMP-D',
      name: 'Delta Distributors',
      address: 'Plot 90, Bin Qasim, Karachi',
      phone: '021-44444444',
      ntn: '4567890-1',
      strn: '4567890-1-001',
      taxType: 'FILER',
      salesTaxRate: 17,
      filerTaxRate: 4.5,
      nonFilerTaxRate: 8,
      furtherTaxRate: 3,
    },
  ]
  for (const c of companies) {
    const comp = await db.company.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, defaultCurrency: 'PKR', status: 'ACTIVE' },
    })
    // Create warehouse section per company
    await db.warehouseSection.upsert({
      where: { id: `section-${comp.code}` },
      update: {},
      create: {
        id: `section-${comp.code}`,
        warehouseId: warehouse.id,
        companyId: comp.id,
        name: `${comp.name} Section`,
        code: comp.code,
        status: 'ACTIVE',
      },
    })
    console.log(`✓ Company ${comp.code} + section created`)
  }

  console.log('\n✅ Seed complete!')
  console.log('Login: admin@erp.local / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
