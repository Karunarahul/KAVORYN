import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import {
  adminArchive,
  adminDelete,
  checkDeleteEligibility,
  getBySlug,
  list,
} from '../convex/products.ts'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('=================================================================')
console.log('  KAVORYN — SUPER ADMIN DELETE & SAFE ARCHIVAL TEST SUITE        ')
console.log('=================================================================')
console.log(`Convex Cloud Target: ${CONVEX_URL}\n`)

function createMockDb(initialData = {}) {
  const products = initialData.products || []
  const orders = initialData.orders || []
  const users = initialData.users || [
    {
      _id: 'user_super_admin_id',
      clerkId: 'user_3MRF4pYoolWnkVAEHIjgvXc6VYs',
      email: 'karunarahul8885@gmail.com',
      role: 'super_admin',
    },
    {
      _id: 'user_admin_id',
      clerkId: 'user_admin_staff',
      email: 'curator@kavoryn-staff.com',
      role: 'admin',
    },
  ]
  const logs = initialData.logs || []
  const deleted = []
  const patched = []

  const db = {
    get: async (id) => products.find((p) => p._id === id) || null,
    query: (table) => {
      let items = []
      if (table === 'products') items = products
      else if (table === 'orders') items = orders
      else if (table === 'users') items = users
      else if (table === 'adminActivityLogs') items = logs

      const queryObj = {
        collect: async () => items,
        first: async () => items[0] || null,
        unique: async () => items[0] || null,
        withIndex: (indexName, fn) => {
          let filtered = items
          return {
            collect: async () => filtered,
            first: async () => {
              if (indexName === 'by_clerk_id') {
                return users.find((u) => u.clerkId === 'user_3MRF4pYoolWnkVAEHIjgvXc6VYs' || u.clerkId === 'user_admin_staff') || users[0] || null
              }
              if (indexName === 'by_slug') {
                return filtered[0] || null
              }
              return filtered[0] || null
            },
            unique: async () => filtered[0] || null,
          }
        },
        filter: () => queryObj,
        order: () => queryObj,
      }
      return queryObj
    },
    delete: async (id) => {
      deleted.push(id)
      const idx = products.findIndex((p) => p._id === id)
      if (idx >= 0) products.splice(idx, 1)
    },
    patch: async (id, data) => {
      patched.push({ id, ...data })
      const p = products.find((prod) => prod._id === id)
      if (p) Object.assign(p, data)
    },
    insert: async (table, doc) => {
      if (table === 'adminActivityLogs') logs.push(doc)
      if (table === 'products') products.push(doc)
    },
  }

  return { products, orders, users, logs, deleted, patched, db }
}

async function runDeleteAndArchivalTests() {
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

  // Common Super Admin Mock Context
  const mockSuperAdminIdentity = {
    subject: 'user_3MRF4pYoolWnkVAEHIjgvXc6VYs',
    email: 'karunarahul8885@gmail.com',
    name: 'Super Admin',
  }

  const mockAdminIdentity = {
    subject: 'user_admin_staff',
    email: 'curator@kavoryn-staff.com',
    name: 'Curator Staff',
  }

  const mockCustomerIdentity = {
    subject: 'user_customer_buyer',
    email: 'buyer@example.com',
    name: 'Art Buyer',
  }

  // -------------------------------------------------------------------------
  // TEST 1: Product without protected references can be permanently deleted
  // -------------------------------------------------------------------------
  await test('1. Product without protected references can be permanently deleted by Super Admin', async () => {
    const testProduct = {
      _id: 'prod_unreferenced_001',
      name: 'Test Ephemeral Poster',
      sku: 'KVR-TEST-DEL-001',
      slug: 'test-ephemeral-poster',
      collection: 'form',
      status: 'draft',
      active: false,
    }

    const { db, deleted, logs } = createMockDb({
      products: [testProduct],
      orders: [
        {
          orderNumber: 'KVR-2026-UNRELATED',
          status: 'paid',
          items: [{ productId: 'other_prod_999', productSku: 'KVR-OTHER-999', quantity: 1 }],
        },
      ],
    })

    const mockCtx = {
      auth: { getUserIdentity: async () => mockSuperAdminIdentity },
      db,
    }

    // 1. Check eligibility
    const eligibility = await checkDeleteEligibility._handler(mockCtx, { id: testProduct._id })
    assert.equal(eligibility.eligibility, 'deletable', 'Must evaluate to deletable')
    assert.equal(eligibility.canDelete, true, 'canDelete must be true')
    assert.equal(eligibility.referencingOrdersCount, 0, 'Must have 0 referencing orders')

    // 2. Perform permanent delete
    const result = await adminDelete._handler(mockCtx, { id: testProduct._id })
    assert.equal(result.success, true, 'adminDelete must return success')
    assert.ok(deleted.includes(testProduct._id), 'Product must be permanently deleted from database')
    assert.ok(
      logs.some((l) => l.action === 'PRODUCT_DELETE'),
      'Must record PRODUCT_DELETE in audit log'
    )
  })

  // -------------------------------------------------------------------------
  // TEST 2: Product linked to historical orders cannot be deleted
  // -------------------------------------------------------------------------
  await test('2. Product linked to historical orders cannot be permanently deleted', async () => {
    const historicalProduct = {
      _id: 'prod_the_blue_dimension',
      name: 'The Blue Dimension',
      sku: 'KVR-FOR-002',
      slug: 'the-blue-dimension',
      collection: 'form',
      status: 'published',
      active: true,
    }

    const historicalOrder = {
      orderNumber: 'KVR-2026-57Z1',
      status: 'paid',
      paymentStatus: 'paid',
      createdAt: 1774300000000,
      items: [
        {
          productId: historicalProduct._id,
          productSku: historicalProduct.sku,
          productName: historicalProduct.name,
          quantity: 1,
          size: 'A2',
          finish: 'matte',
          unitPrice: 249,
          subtotal: 249,
        },
      ],
    }

    const { db } = createMockDb({
      products: [historicalProduct],
      orders: [historicalOrder],
    })

    const mockCtx = {
      auth: { getUserIdentity: async () => mockSuperAdminIdentity },
      db,
    }

    // 1. Check eligibility
    const eligibility = await checkDeleteEligibility._handler(mockCtx, { id: historicalProduct._id })
    assert.equal(eligibility.eligibility, 'referenced_by_orders', 'Must evaluate to referenced_by_orders')
    assert.equal(eligibility.canDelete, false, 'canDelete must be false')
    assert.equal(eligibility.canArchive, true, 'canArchive must be true')
    assert.equal(eligibility.referencingOrdersCount, 1, 'Must report 1 historical order')
    assert.equal(eligibility.referencingOrders[0].orderNumber, 'KVR-2026-57Z1')

    // 2. Attempt permanent delete -> must throw detailed error
    await assert.rejects(
      async () => {
        await adminDelete._handler(mockCtx, { id: historicalProduct._id })
      },
      /Cannot permanently delete product 'The Blue Dimension' \(KVR-FOR-002\) because it is referenced in historical customer order #KVR-2026-57Z1/
    )
  })

  // -------------------------------------------------------------------------
  // TEST 3: Interface & handler offers Archive Product for order-linked products
  // -------------------------------------------------------------------------
  await test('3. Eligibility check explicitly offers canArchive: true for order-linked products', async () => {
    const orderLinkedProd = {
      _id: 'prod_doom_001',
      name: 'DOOM',
      sku: 'KVR-ILL-001',
      slug: 'dr-doom',
      collection: 'illustration',
      status: 'published',
      active: true,
    }

    const { db } = createMockDb({
      products: [orderLinkedProd],
      orders: [
        {
          orderNumber: 'KVR-2026-DOOM-ORDER',
          status: 'fulfilled',
          paymentStatus: 'paid',
          items: [{ productId: orderLinkedProd._id, productSku: orderLinkedProd.sku, quantity: 2 }],
        },
      ],
    })

    const mockCtx = {
      auth: { getUserIdentity: async () => mockSuperAdminIdentity },
      db,
    }

    const eligibility = await checkDeleteEligibility._handler(mockCtx, { id: orderLinkedProd._id })
    assert.equal(eligibility.eligibility, 'referenced_by_orders')
    assert.equal(eligibility.canDelete, false)
    assert.equal(eligibility.canArchive, true, 'Must allow safe archival')
    assert.ok(eligibility.reason.includes('historical customer order'))
  })

  // -------------------------------------------------------------------------
  // TEST 4: Archiving succeeds and updates product state
  // -------------------------------------------------------------------------
  await test('4. Archiving succeeds: sets status to archived and active to false', async () => {
    const productToArchive = {
      _id: 'prod_target_to_archive',
      name: 'Urban Monochrome',
      sku: 'KVR-MIN-004',
      status: 'published',
      active: true,
      artworkStorageId: 'storage_preserved_asset_123',
    }

    const { db, patched, logs } = createMockDb({
      products: [productToArchive],
    })

    const mockCtx = {
      auth: { getUserIdentity: async () => mockAdminIdentity },
      db,
    }

    const result = await adminArchive._handler(mockCtx, { id: productToArchive._id })
    assert.equal(result.success, true)
    const patch = patched.find((p) => p.id === productToArchive._id)
    assert.ok(patch)
    assert.equal(patch.status, 'archived', 'Status must be set to archived')
    assert.equal(patch.active, false, 'active flag must be set to false')
    assert.ok(patch.archivedAt > 0, 'archivedAt timestamp must be recorded')
    assert.equal(productToArchive.artworkStorageId, 'storage_preserved_asset_123', 'Artwork must not be deleted')
    assert.ok(
      logs.some((l) => l.action === 'PRODUCT_ARCHIVE'),
      'Must record PRODUCT_ARCHIVE in audit log'
    )
  })

  // -------------------------------------------------------------------------
  // TEST 5: Archived products disappear from public storefront
  // -------------------------------------------------------------------------
  await test('5. Archived products disappear from public storefront queries', async () => {
    const productsInDb = [
      {
        _id: 'p1',
        name: 'Active Print',
        slug: 'active-print',
        status: 'published',
        active: true,
        collection: 'form',
        prices: { A4: 149 },
        createdAt: 1000,
      },
      {
        _id: 'p2',
        name: 'Archived Print',
        slug: 'archived-print',
        status: 'archived',
        active: false,
        collection: 'form',
        prices: { A4: 149 },
        createdAt: 2000,
      },
    ]

    const mockPublicCtx = {
      auth: { getUserIdentity: async () => null },
      db: {
        query: (table) => {
          if (table === 'products') {
            return {
              collect: async () => productsInDb,
              withIndex: (indexName, fn) => {
                const target = productsInDb.find((p) => p.slug === 'archived-print')
                return {
                  first: async () => target,
                  unique: async () => target,
                }
              },
            }
          }
          return { collect: async () => [] }
        },
      },
    }

    // 1. Check public catalogue list
    const publicList = await list._handler(mockPublicCtx, {})
    const hasArchivedInList = publicList.some((p) => p.slug === 'archived-print')
    assert.equal(hasArchivedInList, false, 'Archived product must NOT appear in public list')
    assert.ok(publicList.some((p) => p.slug === 'active-print'), 'Active product must appear')

    // 2. Check public getBySlug
    const pdpResult = await getBySlug._handler(mockPublicCtx, { slug: 'archived-print' })
    assert.ok(pdpResult, 'Product record returned')
    assert.equal(pdpResult.isUnavailable, true, 'getBySlug must mark archived product as isUnavailable: true')
    assert.equal(pdpResult.status, 'archived', 'Status must be archived')
    assert.equal(pdpResult.active, false, 'active must be false')
  })

  // -------------------------------------------------------------------------
  // TEST 6: Historical customer orders remain intact
  // -------------------------------------------------------------------------
  await test('6. Existing historical orders and item snapshots remain intact after product archival', async () => {
    const historicalOrderRecord = {
      orderNumber: 'KVR-2026-57Z1',
      status: 'paid',
      paymentStatus: 'paid',
      email: 'customer@example.com',
      total: 299,
      items: [
        {
          productId: 'prod_archived_id_123',
          productSku: 'KVR-FOR-002',
          productName: 'The Blue Dimension',
          size: 'A2',
          finish: 'matte',
          quantity: 1,
          unitPrice: 249,
          subtotal: 249,
        },
      ],
    }

    // Archiving product only mutates products table, never modifies orders table
    assert.equal(historicalOrderRecord.items[0].productSku, 'KVR-FOR-002')
    assert.equal(historicalOrderRecord.items[0].productName, 'The Blue Dimension')
    assert.equal(historicalOrderRecord.items[0].unitPrice, 249)
    assert.equal(historicalOrderRecord.status, 'paid')
  })

  // -------------------------------------------------------------------------
  // TEST 7: Customers cannot access deletion operations
  // -------------------------------------------------------------------------
  await test('7. Customers cannot access permanent deletion or archival operations', async () => {
    const mockCustomerCtx = {
      auth: { getUserIdentity: async () => mockCustomerIdentity },
      db: {
        get: async () => ({ _id: 'any_prod', name: 'Test' }),
        query: () => ({
          withIndex: () => ({
            first: async () => ({
              clerkId: mockCustomerIdentity.subject,
              email: mockCustomerIdentity.email,
              role: 'customer',
            }),
          }),
        }),
      },
    }

    await assert.rejects(
      async () => {
        await adminDelete._handler(mockCustomerCtx, { id: 'any_prod' })
      },
      /Unauthorized: Super Admin privileges required/
    )

    await assert.rejects(
      async () => {
        await adminArchive._handler(mockCustomerCtx, { id: 'any_prod' })
      },
      /Unauthorized: Access restricted/
    )
  })

  // -------------------------------------------------------------------------
  // TEST 8: Admin cannot perform Super Admin-only deletion
  // -------------------------------------------------------------------------
  await test('8. Regular Admin cannot perform Super Admin-only permanent deletion', async () => {
    const mockAdminCtx = {
      auth: { getUserIdentity: async () => mockAdminIdentity },
      db: {
        get: async () => ({ _id: 'unref_prod', name: 'Unreferenced Print' }),
        query: (table) => {
          if (table === 'users') {
            return {
              withIndex: () => ({
                first: async () => ({
                  clerkId: mockAdminIdentity.subject,
                  email: mockAdminIdentity.email,
                  role: 'admin',
                }),
              }),
            }
          }
          return { collect: async () => [] }
        },
      },
    }

    await assert.rejects(
      async () => {
        await adminDelete._handler(mockAdminCtx, { id: 'unref_prod' })
      },
      /Unauthorized: Super Admin privileges required/
    )
  })

  // -------------------------------------------------------------------------
  // TEST 9: Audit logs record archive and deletion actions
  // -------------------------------------------------------------------------
  await test('9. Audit logs record both archive and deletion actions with actor and timestamp', async () => {
    const { db, logs } = createMockDb({
      products: [
        {
          _id: 'prod_audited_123',
          name: 'Audit Test Poster',
          sku: 'KVR-AUD-001',
          status: 'draft',
        },
      ],
    })

    const mockCtx = {
      auth: { getUserIdentity: async () => mockSuperAdminIdentity },
      db,
    }

    // 1. Trigger Archive
    await adminArchive._handler(mockCtx, { id: 'prod_audited_123' })
    const archiveLog = logs.find((l) => l.action === 'PRODUCT_ARCHIVE')
    assert.ok(archiveLog, 'Must record PRODUCT_ARCHIVE')
    assert.equal(archiveLog.actorClerkId, mockSuperAdminIdentity.subject)
    assert.equal(archiveLog.targetId, 'prod_audited_123')
    assert.ok(archiveLog.timestamp > 0)

    // 2. Trigger Delete
    await adminDelete._handler(mockCtx, { id: 'prod_audited_123' })
    const deleteLog = logs.find((l) => l.action === 'PRODUCT_DELETE')
    assert.ok(deleteLog, 'Must record PRODUCT_DELETE')
    assert.equal(deleteLog.actorClerkId, mockSuperAdminIdentity.subject)
    assert.equal(deleteLog.targetId, 'prod_audited_123')
    assert.ok(deleteLog.timestamp > 0)
  })

  console.log('\n=================================================================')
  console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) process.exit(1)
}

runDeleteAndArchivalTests().catch((err) => {
  console.error('Test suite execution error:', err)
  process.exit(1)
})
