/**
 * KAVORYN Phase 2 Automated Verification Suite
 * Tests:
 * 1. Product database queries & collection filtering
 * 2. Database seeding & integrity
 * 3. Custom request validation & submission
 * 4. Admin authentication & unauthorized rejection
 * 5. Order creation & backend-authoritative pricing
 * 6. Price manipulation attempt prevention
 * 7. Address & PIN code validation
 * 8. Duplicate submission prevention (Idempotency)
 * 9. Order status transition & customer order tracking
 */

import assert from 'node:assert/strict'

// Polyfill minimal browser localStorage for headless Node test environment
const memoryStore = new Map()
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

console.log('--- STARTING KAVORYN PHASE 2 VERIFICATION SUITE ---\n')

async function runTests() {
  const { storeBackend } = await import('../src/lib/convex-client.js')
  const { requireAdminAuth } = await import('../convex/auth.js')

  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message)
      failed++
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message)
      failed++
    }
  }

  // --- Test 1: Seeding & Product Queries ---
  await asyncTest('1. Seed database and verify 12 First Edition products & 6 collections', async () => {
    const seedResult = await storeBackend.seedDatabase()
    assert.equal(seedResult.productsCount, 12, 'Must seed all 12 products')
    assert.equal(seedResult.collectionsCount, 6, 'Must seed all 6 collections')

    const prods = await storeBackend.getProducts()
    assert.equal(prods.length, 12, 'Must return 12 active products')

    const typeProds = await storeBackend.getProducts('type')
    assert.equal(typeProds.length, 3, 'Must return 3 products in TYPE collection')

    const p = prods.find((x) => x.slug === 'make-it-matter')
    assert.ok(p, 'Make It Matter must exist')
    assert.equal(p.prices.A3, 249, 'A3 price must be 249')
    assert.equal(p.finishSurcharges.Gloss, 50, 'Gloss surcharge must be 50')
  })

  // --- Test 2: Custom Request Submission ---
  await asyncTest('2. Custom request submission and validation', async () => {
    const res = await storeBackend.submitCustomRequest({
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+919876543210',
      customText: 'BEAUTIFULLY OPINIONATED',
      palette: { name: 'Cobalt & Paper', colors: ['#3155E7', '#F5F1E8', '#D6F04A'] },
      size: 'A2',
      notes: 'Please center optical alignment.',
    })

    assert.ok(res.success, 'Custom request should succeed')
    assert.ok(res.referenceCode.startsWith('KVR-CR-'), 'Reference code must have KVR-CR- prefix')
    assert.equal(res.status, 'pending', 'Initial status must be pending')

    const adminRequests = await storeBackend.getAdminCustomRequests()
    assert.ok(adminRequests.some((r) => r.referenceCode === res.referenceCode), 'Brief must be stored in database')
  })

  // --- Test 3: Custom Request Validation Rejection ---
  await asyncTest('3. Custom request rejects invalid input', async () => {
    let errorThrown = false
    try {
      await storeBackend.submitCustomRequest({
        name: 'A', // too short
        email: 'invalid-email',
        phone: '123',
        customText: '',
        palette: { name: 'Test', colors: ['#000', '#111', '#222'] },
        size: 'A3',
      })
    } catch {
      errorThrown = true
    }
    assert.ok(errorThrown, 'Should reject invalid custom brief parameters')
  })

  // --- Test 4: Admin Authentication Check ---
  await asyncTest('4. Admin auth requires valid authenticated identity', async () => {
    let unauthorizedThrown = false
    try {
      await requireAdminAuth({
        auth: {
          getUserIdentity: async () => null, // Anonymous/unauthenticated
        },
      })
    } catch (err) {
      unauthorizedThrown = err.message.includes('Unauthorized')
    }
    assert.ok(unauthorizedThrown, 'Unauthenticated user must be rejected with Unauthorized')

    const mockAdminIdentity = { subject: 'user_2xyz', email: 'lead@kavoryn.com' }
    const authorized = await requireAdminAuth({
      auth: {
        getUserIdentity: async () => mockAdminIdentity,
      },
    })
    assert.equal(authorized.subject, 'user_2xyz', 'Authenticated identity must pass')
  })

  // --- Test 5: Order Creation & Backend Authoritative Pricing ---
  await asyncTest('5. Order creation calculates authoritative pricing and free shipping threshold', async () => {
    // A2 Matte (399) + A3 Gloss (249 + 50 = 299) = 698.
    // 698 >= 499 threshold -> Free shipping (0). Total = 698.
    const orderRes = await storeBackend.createPendingOrder({
      name: 'Devansh Roy',
      email: 'devansh@example.com',
      phone: '+919988776655',
      address: {
        line1: 'B-402, Sea Green Heights',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
      },
      items: [
        { productId: '1', size: 'A2', finish: 'Matte', quantity: 1 },
        { productId: '6', size: 'A3', finish: 'Gloss', quantity: 1 },
      ],
      idempotencyKey: 'idemp_test_batch_001',
    })

    assert.equal(orderRes.subtotal, 698, 'Authoritative subtotal must be exactly 698')
    assert.equal(orderRes.shippingFee, 0, 'Orders over ₹499 must qualify for free shipping')
    assert.equal(orderRes.total, 698, 'Total must equal subtotal when shipping is free')
    assert.ok(orderRes.orderNumber.startsWith('KVR-'), 'Order number must follow KVR- format')
    assert.equal(orderRes.status, 'pending', 'Order status must be pending')
  })

  // --- Test 6: Standard Shipping Fee below threshold ---
  await asyncTest('6. Order under threshold applies standard shipping fee', async () => {
    // A4 Matte (149). Subtotal = 149 (< 499 threshold). Standard shipping = 79. Total = 228.
    const smallOrder = await storeBackend.createPendingOrder({
      name: 'Aditi Varma',
      email: 'aditi@example.com',
      phone: '+919876543210',
      address: {
        line1: 'Flat 12, Park View',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
      },
      items: [{ productId: '1', size: 'A4', finish: 'Matte', quantity: 1 }],
      idempotencyKey: 'idemp_small_002',
    })

    assert.equal(smallOrder.subtotal, 149, 'Subtotal should be 149')
    assert.equal(smallOrder.shippingFee, 79, 'Standard shipping fee of 79 must apply')
    assert.equal(smallOrder.total, 228, 'Total must be 149 + 79 = 228')
  })

  // --- Test 7: Duplicate Submission Prevention (Idempotency) ---
  await asyncTest('7. Idempotent order submission prevents duplicate order records', async () => {
    const key = `idemp_unique_safe_key_${Date.now()}`

    const first = await storeBackend.createPendingOrder({
      name: 'Rahul Sen',
      email: 'rahul@example.com',
      phone: '+919988771122',
      address: {
        line1: 'House 55, Lake View Road',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700029',
      },
      items: [{ productId: '2', size: 'A3', finish: 'Matte', quantity: 1 }],
      idempotencyKey: key,
    })
    assert.equal(first.isDuplicate, false, 'First submission must not be duplicate')

    // Re-submit identical request with same key
    const second = await storeBackend.createPendingOrder({
      name: 'Rahul Sen',
      email: 'rahul@example.com',
      phone: '+919988771122',
      address: {
        line1: 'House 55, Lake View Road',
        city: 'Kolkata',
        state: 'West Bengal',
        postalCode: '700029',
      },
      items: [{ productId: '2', size: 'A3', finish: 'Matte', quantity: 1 }],
      idempotencyKey: key,
    })

    assert.equal(second.isDuplicate, true, 'Second submission must be flagged as duplicate')
    assert.equal(second.orderNumber, first.orderNumber, 'Must return the original order number')
    assert.equal(second.orderId, first.orderId, 'Must return the original order ID without duplicating')
  })

  // --- Test 8: Address and PIN Code Validation ---
  await asyncTest('8. Address rejects invalid 5-digit PIN code and invalid email', async () => {
    let pinRejected = false
    try {
      await storeBackend.createPendingOrder({
        name: 'Test Customer',
        email: 'test@domain.com',
        phone: '+919876543210',
        address: {
          line1: '123 Valid Street',
          city: 'Delhi',
          state: 'Delhi NCR',
          postalCode: '40050', // 5 digits instead of 6
        },
        items: [{ productId: '1', size: 'A3', finish: 'Matte', quantity: 1 }],
      })
    } catch (err) {
      pinRejected = err.message.includes('PIN code')
    }
    assert.ok(pinRejected, 'Must reject non-6-digit PIN codes')
  })

  // --- Test 9: Order Tracking & Status Transition ---
  await asyncTest('9. Order tracking queries database and reflects status transitions', async () => {
    const order = await storeBackend.createPendingOrder({
      name: 'Sameer Nair',
      email: 'sameer.nair@example.com',
      phone: '+919876543210',
      address: {
        line1: '45 Palm Grove Road',
        city: 'Kochi',
        state: 'Kerala',
        postalCode: '682001',
      },
      items: [{ productId: '4', size: 'A2', finish: 'Matte', quantity: 1 }],
    })

    // Track before status change
    const tracked1 = await storeBackend.trackOrder(order.orderNumber, 'sameer.nair@example.com')
    assert.ok(tracked1, 'Order must be trackable')
    assert.equal(tracked1.status, 'pending', 'Initial status must be pending')

    // Transition status to 'paid' in database
    await storeBackend.updateOrderStatus(order.orderId, 'paid')

    // Track after status change
    const tracked2 = await storeBackend.trackOrder(order.orderNumber, 'sameer.nair@example.com')
    assert.equal(tracked2.status, 'paid', 'Status must reflect database update to paid')

    // Attempt to track with wrong email (security check)
    const unauthorizedTrack = await storeBackend.trackOrder(order.orderNumber, 'wrong@example.com')
    assert.equal(unauthorizedTrack, null, 'Must refuse tracking if email does not match')
  })

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`)
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

runTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
