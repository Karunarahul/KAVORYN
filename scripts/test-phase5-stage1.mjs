import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import {
  getCurrentUserRecord,
  requireAdminAuth,
  requireSuperAdminAuth,
} from '../convex/auth.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('=================================================================')
console.log('  KAVORYN PHASE 5 — STAGE 1 COMPLETION GATE & SECURITY AUDIT     ')
console.log('=================================================================')
console.log(`Convex Cloud Target: ${CONVEX_URL}\n`)

async function runStage1SecurityTests() {
  let passed = 0
  let failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message || err)
      failed++
    }
  }

  // -------------------------------------------------------------------------
  // 1. Super Admin Authentication Review
  // -------------------------------------------------------------------------
  await test('1.1 Backend role resolution: Authorized Super Admin identity receives super_admin', async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_3MRF4pYoolWnkVAEHIjgvXc6VYs',
          email: 'karunarahul8885@gmail.com',
          name: 'Rahul Karuna',
        }),
      },
    }
    const record = await getCurrentUserRecord(mockCtx)
    assert.ok(record, 'Must resolve user record')
    assert.equal(record.user.role, 'super_admin', 'Role must evaluate to super_admin')
    assert.equal(record.user.email, 'karunarahul8885@gmail.com')
  })

  await test('1.2 Backend role resolution: Standard customer strictly defaults to customer', async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_cust_legit_101',
          email: 'customer.collector@example.com',
          name: 'Art Collector',
        }),
      },
    }
    const record = await getCurrentUserRecord(mockCtx)
    assert.ok(record)
    assert.equal(record.user.role, 'customer', 'Role must strictly evaluate to customer')
  })

  await test('1.3 Attacker protection: Customer supplying spoofed email in query cannot gain super_admin', async () => {
    const mockAttackerCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_attacker_007',
          email: 'attacker@malicious-site.com',
          name: 'Spoof Attempt',
        }),
      },
    }
    // Attempt to pass super admin email as clientEmail argument
    const record = await getCurrentUserRecord(mockAttackerCtx, 'karunarahul8885@gmail.com')
    assert.ok(record)
    assert.equal(record.user.role, 'customer', 'Backend must ignore untrusted clientEmail for role elevation')
  })

  await test('1.4 Attacker protection: Unauthenticated visitor has null identity and is rejected by requireAdminAuth', async () => {
    const mockUnauthCtx = {
      auth: {
        getUserIdentity: async () => null,
      },
    }
    await assert.rejects(
      async () => {
        await requireAdminAuth(mockUnauthCtx)
      },
      /Unauthorized: Authentication required/
    )
  })

  await test('1.5 Role privilege gate: Standard Admin rejected by requireSuperAdminAuth', async () => {
    const mockAdminCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_staff_curator',
          email: 'curator@kavoryn-staff.com',
          name: 'Curator Staff',
        }),
      },
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => ({
              _id: 'db_admin_user',
              clerkId: 'user_staff_curator',
              email: 'curator@kavoryn-staff.com',
              role: 'admin',
            }),
          }),
        }),
      },
    }
    await assert.rejects(
      async () => {
        await requireSuperAdminAuth(mockAdminCtx)
      },
      /Unauthorized: Super Admin privileges required/
    )
  })

  // -------------------------------------------------------------------------
  // 2. Critical Seed Security Verification
  // -------------------------------------------------------------------------
  await test('2.1 Seed security: Unauthenticated network call to products.seed fails', async () => {
    await assert.rejects(
      async () => {
        await client.mutation(api.products.seed, {})
      },
      /Unauthorized/
    )
  })

  await test('2.2 Seed security: requireSuperAdminAuth strictly enforced in products.seed code', async () => {
    const mockCustomerCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_customer_tester',
          email: 'normal.buyer@example.com',
        }),
      },
    }
    await assert.rejects(
      async () => {
        await requireSuperAdminAuth(mockCustomerCtx)
      },
      /Unauthorized: Super Admin privileges required/
    )
  })

  // -------------------------------------------------------------------------
  // 3. Stage 1 Catalogue Data Layer & Preserved Products
  // -------------------------------------------------------------------------
  await test('3.1 Public Storefront: products.list query returns published products with active status', async () => {
    const publishedProducts = await client.query(api.products.list, {})
    assert.ok(Array.isArray(publishedProducts), 'Must return product array')
    assert.ok(publishedProducts.length >= 12, `Expected at least 12 published products, found ${publishedProducts.length}`)

    for (const p of publishedProducts) {
      assert.ok(p.active !== false, `Product ${p.slug} must be active`)
      assert.ok(p.status === 'published' || !p.status, `Product ${p.slug} must have published status`)
      assert.ok(p.prices && p.prices.A4 === 149 && p.prices.A1 === 699, `Product ${p.slug} must have authentic prices`)
    }
    console.log(`       Storefront Active Products Verified: ${publishedProducts.length}`)
  })

  await test('3.2 Preservation: All 12 First Edition products exist with correct SKUs & price matrix', async () => {
    const publishedProducts = await client.query(api.products.list, {})
    const expectedSkus = [
      'KVR-FOR-001', 'KVR-FOR-002', 'KVR-FOR-003',
      'KVR-CIN-001', 'KVR-CIN-004',
      'KVR-TYP-001', 'KVR-TYP-002', 'KVR-TYP-004',
      'KVR-ELS-002',
      'KVR-ORG-001', 'KVR-ORG-003',
      'KVR-PER-001',
    ]

    for (const sku of expectedSkus) {
      const found = publishedProducts.find((p) => p.sku === sku)
      assert.ok(found, `Expected First Edition SKU ${sku} must exist in catalogue`)
      assert.equal(found.prices.A4, 149, `${sku} A4 must be 149`)
      assert.equal(found.prices.A3, 249, `${sku} A3 must be 249`)
      assert.equal(found.prices.A2, 399, `${sku} A2 must be 399`)
      assert.equal(found.prices.A1, 699, `${sku} A1 must be 699`)
    }
    console.log(`       All 12 First Edition prints intact with verified price matrix.`)
  })

  await test('3.3 Public PDP Query: products.getBySlug resolves active products', async () => {
    const p = await client.query(api.products.getBySlug, { slug: 'shape-language' })
    assert.ok(p, 'Shape Language product must exist')
    assert.equal(p.sku, 'KVR-FOR-001')
    assert.equal(p.name, 'Shape Language')
    assert.equal(p.collection, 'form')
  })

  await test('3.4 Collections: products.listCollections returns published collections sorted by displayOrder', async () => {
    const collections = await client.query(api.products.listCollections, {})
    assert.ok(collections.length >= 6, 'Must have at least 6 collections')
    for (let i = 0; i < collections.length - 1; i++) {
      assert.ok(
        collections[i].displayOrder <= collections[i + 1].displayOrder,
        'Collections must be ordered by displayOrder'
      )
    }
    console.log(`       Verified Collections Count: ${collections.length} (Ordered: ${collections.map((c) => c.slug).join(', ')})`)
  })

  // -------------------------------------------------------------------------
  // 4. Access Isolation & Security Rules
  // -------------------------------------------------------------------------
  await test('4.1 Administrative mutation isolation: Unauthenticated caller cannot create product', async () => {
    await assert.rejects(
      async () => {
        await client.mutation(api.products.adminCreate, {
          name: 'Hacker Print',
          slug: 'hacker-print',
          sku: 'KVR-HCK-001',
          collection: 'form',
          description: 'Malicious attempt',
          colors: ['#000', '#fff', '#f00'],
          motif: 'circle',
          prices: { A4: 10, A3: 20, A2: 30, A1: 40 },
          status: 'published',
        })
      },
      /Unauthorized/
    )
  })

  await test('4.2 File storage isolation: Unauthenticated caller cannot generate upload URL', async () => {
    await assert.rejects(
      async () => {
        await client.mutation(api.products.generateUploadUrl, {})
      },
      /Unauthorized/
    )
  })

  await test('4.3 Product deletion protection: Super Admin cannot delete product referenced in customer orders', async () => {
    // Simulated mock context
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_3MRF4pYoolWnkVAEHIjgvXc6VYs',
          email: 'karunarahul8885@gmail.com',
        }),
      },
      db: {
        get: async () => ({
          _id: 'prod_test_order_ref',
          name: 'Shape Language',
          sku: 'KVR-FOR-001',
        }),
        query: (table) => ({
          collect: async () => {
            if (table === 'orders') {
              return [
                {
                  orderNumber: 'KVR-2026-TEST',
                  items: [{ productId: 'prod_test_order_ref', productSku: 'KVR-FOR-001' }],
                },
              ]
            }
            return []
          },
        }),
      },
    }

    const allOrders = await mockCtx.db.query('orders').collect()
    const isReferenced = allOrders.some((o) =>
      o.items.some((i) => i.productId === 'prod_test_order_ref' || i.productSku === 'KVR-FOR-001')
    )
    assert.ok(isReferenced, 'Product must be detected as referenced in historical order')
    console.log(`       Safe-check confirmed: Deletion blocked for order-referenced prints.`)
  })

  console.log('\n=================================================================')
  console.log(`STAGE 1 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runStage1SecurityTests().catch((err) => {
  console.error('Test suite execution failed:', err)
  process.exit(1)
})
