/**
 * KAVORYN Phase 3 Razorpay Verification Suite
 * Tests all 13 required payment scenarios:
 * 1. Successful payment
 * 2. Failed payment
 * 3. Cancelled checkout (modal dismissed)
 * 4. Customer closes checkout / abandonment
 * 5. Duplicate payment submission idempotency
 * 6. Invalid cryptographic signature rejection
 * 7. Server-authoritative amount calculation in paise
 * 8. Incorrect / mismatched Razorpay order ID rejection
 * 9. Duplicate webhook event idempotency
 * 10. Delayed webhook (out-of-order protection)
 * 11. Customer refresh after successful payment
 * 12. Verification failure safety (order not marked paid)
 * 13. Customer payment retry without duplicate order creation
 */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// Polyfill minimal browser localStorage and crypto for headless Node test environment
const memoryStore = new Map()
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

console.log('--- STARTING KAVORYN PHASE 3 RAZORPAY VERIFICATION SUITE ---\n')

async function runTests() {
  const { storeBackend } = await import('../src/lib/convex-client.js')
  const RAZORPAY_TEST_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret_kavoryn'

  let passed = 0
  let failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message)
      failed++
    }
  }

  // Seed database first
  await storeBackend.seedDatabase()

  // Helper to create a valid pending order
  async function makePendingOrder(idemp = `idemp_${Date.now()}_${Math.random()}`) {
    return await storeBackend.createPendingOrder({
      email: 'customer@kavoryn.studio',
      name: 'Aarav Sharma',
      phone: '+919876543210',
      address: {
        line1: '104 Studio Crescent, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
      },
      items: [
        {
          productId: '1',
          size: 'A3',
          finish: 'Gloss',
          quantity: 2,
        },
      ],
      idempotencyKey: idemp,
    })
  }

  // --- Test 1: Successful Payment ---
  await test('1. Successful payment flow with valid HMAC-SHA256 signature', async () => {
    const order = await makePendingOrder('test_1_success')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    assert.ok(rzpOrder.razorpayOrderId.startsWith('order_'), 'Must generate valid Razorpay order ID')
    assert.equal(rzpOrder.amount, order.total * 100, 'Amount must be exactly total * 100 paise')

    const paymentId = `pay_${Date.now()}_abc123`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    const verified = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })

    assert.equal(verified.status, 'paid', 'Order status must be updated to paid')
    assert.equal(verified.paymentStatus, 'paid', 'Payment status must be paid')

    const updated = await storeBackend.getOrderById(order.orderId)
    assert.equal(updated.status, 'paid')
    assert.equal(updated.razorpayPaymentId, paymentId)
    assert.ok(updated.paidAt, 'paidAt timestamp must be recorded')
  })

  // --- Test 2: Failed Payment ---
  await test('2. Failed payment updates paymentStatus to failed while preserving order for retry', async () => {
    const order = await makePendingOrder('test_2_failed')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    const failureRes = await storeBackend.recordPaymentFailure(
      order.orderId,
      'Bank server error / card declined'
    )

    assert.equal(failureRes.status, 'pending', 'Order status must remain pending so customer can retry')
    assert.equal(failureRes.paymentStatus, 'failed', 'Payment status must be marked failed')

    const updated = await storeBackend.getOrderById(order.orderId)
    assert.equal(updated.status, 'pending')
    assert.equal(updated.paymentStatus, 'failed')
    assert.equal(updated.paymentFailureReason, 'Bank server error / card declined')
  })

  // --- Test 3: Cancelled Checkout (Modal Dismissed) ---
  await test('3. Cancelled checkout modal recorded without corrupting order', async () => {
    const order = await makePendingOrder('test_3_dismissed')
    await storeBackend.createRazorpayOrder(order.orderId)

    await storeBackend.recordPaymentFailure(
      order.orderId,
      'Customer dismissed Razorpay checkout modal.'
    )

    const updated = await storeBackend.getOrderById(order.orderId)
    assert.equal(updated.status, 'pending')
    assert.equal(updated.paymentStatus, 'failed')
    assert.equal(updated.paymentFailureReason, 'Customer dismissed Razorpay checkout modal.')
  })

  // --- Test 4: Customer Closes Checkout / Abandonment ---
  await test('4. Customer checkout closure does not generate duplicate orders', async () => {
    const order = await makePendingOrder('test_4_abandon')
    const initialOrders = await storeBackend.getAdminOrders()
    const countBefore = initialOrders.length

    // Simulate modal dismissal
    await storeBackend.recordPaymentFailure(order.orderId, 'Checkout window closed')

    const ordersAfter = await storeBackend.getAdminOrders()
    assert.equal(ordersAfter.length, countBefore, 'Order count must remain constant on abandonment')
  })

  // --- Test 5: Duplicate Payment Submission Idempotency ---
  await test('5. Duplicate payment submission handled idempotently without re-marking', async () => {
    const order = await makePendingOrder('test_5_duplicate')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_dup_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    // First verification
    const res1 = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })
    assert.equal(res1.status, 'paid')
    assert.equal(res1.alreadyPaid, undefined)

    // Second verification (identical submission)
    const res2 = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })
    assert.equal(res2.status, 'paid')
    assert.equal(res2.alreadyPaid, true, 'Subsequent submission must report alreadyPaid: true')
  })

  // --- Test 6: Invalid Cryptographic Signature Rejection ---
  await test('6. Tampered / invalid HMAC-SHA256 signature is strictly rejected', async () => {
    const order = await makePendingOrder('test_6_tamper')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_tamper_${Date.now()}`
    const bogusSignature = 'tampered_sha256_hex_signature_deadbeef'

    let errorThrown = false
    try {
      await storeBackend.verifyRazorpayPayment({
        orderId: order.orderId,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: bogusSignature,
      })
    } catch (err) {
      errorThrown = true
      assert.ok(err.message.includes('Invalid Razorpay signature'))
    }

    assert.ok(errorThrown, 'Must throw error on invalid signature')
    const updated = await storeBackend.getOrderById(order.orderId)
    assert.notEqual(updated.status, 'paid', 'Order must NOT be marked paid on invalid signature')
    assert.equal(updated.paymentStatus, 'failed')
  })

  // --- Test 7: Server-Authoritative Amount Calculation (INR to paise) ---
  await test('7. Authoritative amount in paise strictly calculated by backend', async () => {
    const order = await makePendingOrder('test_7_amount')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    // Subtotal: 2 x (249 + 50) = 598. Shipping: 0 (subtotal >= 499 threshold). Total = 598.
    // 598 INR = 59800 paise.
    assert.equal(order.total, 598, 'Authoritative total must be 598 INR')
    assert.equal(rzpOrder.amount, 59800, 'Razorpay amount must be exactly 59800 paise')
  })

  // --- Test 8: Incorrect / Mismatched Razorpay Order ID Rejection ---
  await test('8. Mismatched Razorpay order ID is strictly rejected', async () => {
    const order = await makePendingOrder('test_8_mismatch')
    await storeBackend.createRazorpayOrder(order.orderId)

    let errorThrown = false
    try {
      await storeBackend.verifyRazorpayPayment({
        orderId: order.orderId,
        razorpayOrderId: 'order_DIFFERENT_UNEXPECTED_ID',
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: 'sig',
      })
    } catch (err) {
      errorThrown = true
      assert.ok(err.message.includes('Razorpay Order ID mismatch'))
    }

    assert.ok(errorThrown, 'Must throw on mismatched Razorpay order ID')
  })

  // --- Test 9: Duplicate Webhook Event Idempotency ---
  await test('9. Webhook handler processes events idempotently', async () => {
    const order = await makePendingOrder('test_9_webhook')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    const eventId = `wh_evt_${Date.now()}_unique`

    // First webhook delivery
    const wh1 = await storeBackend.markPaid(
      rzpOrder.razorpayOrderId,
      'pay_webhook_1',
      'sig_1',
      eventId
    )
    assert.equal(wh1.success, true)
    assert.equal(wh1.alreadyPaid, false)

    // Second webhook delivery (same event ID)
    const wh2 = await storeBackend.markPaid(
      rzpOrder.razorpayOrderId,
      'pay_webhook_1',
      'sig_1',
      eventId
    )
    assert.equal(wh2.success, true)
    assert.equal(wh2.duplicateEvent, true, 'Subsequent webhook delivery must report duplicateEvent: true')
  })

  // --- Test 10: Delayed Webhook (Out-of-Order Lifecycle Protection) ---
  await test('10. Delayed or late webhook never downgrades settled or fulfilled order', async () => {
    const order = await makePendingOrder('test_10_lifecycle')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    // Settle order
    const paymentId = `pay_settled_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })

    // Advance order to fulfilled in studio admin
    await storeBackend.updateOrderStatus(order.orderId, 'fulfilled')

    // Simulate delayed failure webhook or callback
    const failureAttempt = await storeBackend.recordPaymentFailure(
      order.orderId,
      'Delayed failure notification from gateway'
    )

    assert.equal(failureAttempt.alreadyPaid, true, 'Settled order must report alreadyPaid: true')
    const postCheck = await storeBackend.getOrderById(order.orderId)
    assert.equal(postCheck.status, 'fulfilled', 'Status must remain fulfilled and not downgraded')
  })

  // --- Test 11: Customer Refresh After Successful Payment ---
  await test('11. Customer refresh retrieves authoritative paid order from database', async () => {
    const order = await makePendingOrder('test_11_refresh')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_refresh_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    })

    // Simulate page reload: query by ID
    const reloaded = await storeBackend.getOrderById(order.orderId)
    assert.ok(reloaded)
    assert.equal(reloaded.status, 'paid')
    assert.equal(reloaded.razorpayPaymentId, paymentId)

    // Customer tracking query
    const tracked = await storeBackend.trackOrder(order.orderNumber, 'customer@kavoryn.studio')
    assert.ok(tracked)
    assert.equal(tracked.status, 'paid')
    assert.equal(tracked.paymentStatus, 'paid')
  })

  // --- Test 12: Payment Verification Failure Safety ---
  await test('12. Verification error prevents order from being falsely marked paid', async () => {
    const order = await makePendingOrder('test_12_safety')
    await storeBackend.createRazorpayOrder(order.orderId)

    try {
      await storeBackend.verifyRazorpayPayment({
        orderId: order.orderId,
        razorpayOrderId: 'order_corrupt',
        razorpayPaymentId: 'pay_bad',
        razorpaySignature: 'sig_bad',
      })
    } catch {
      // Expected failure
    }

    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'pending', 'Order must remain pending on verification failure')
  })

  // --- Test 13: Customer Retries Payment on Same Order ---
  await test('13. Customer can retry payment on the exact same order without duplicates', async () => {
    const order = await makePendingOrder('test_13_retry')
    const adminOrdersBefore = await storeBackend.getAdminOrders()

    // First attempt fails / dismissed
    await storeBackend.createRazorpayOrder(order.orderId)
    await storeBackend.recordPaymentFailure(order.orderId, 'User closed modal')

    // Retry attempt: customer clicks retry on the SAME orderId
    const retryRzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    assert.ok(retryRzpOrder.razorpayOrderId)

    // Retry succeeds
    const retryPaymentId = `pay_retry_success_${Date.now()}`
    const payload = `${retryRzpOrder.razorpayOrderId}|${retryPaymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    const retryVerified = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: retryRzpOrder.razorpayOrderId,
      razorpayPaymentId: retryPaymentId,
      razorpaySignature: signature,
    })

    assert.equal(retryVerified.status, 'paid')

    // Verify no duplicate order records were created
    const adminOrdersAfter = await storeBackend.getAdminOrders()
    assert.equal(
      adminOrdersAfter.length,
      adminOrdersBefore.length,
      'Retry must NOT increase total order count'
    )
  })

  console.log(`\n========================================`)
  console.log(`PHASE 3 RAZORPAY TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
