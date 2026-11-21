/**
 * KAVORYN Phase 3.2 Payment Capture Verification Suite
 * Tests all payment capture validation requirements:
 * 1. Authorized payment (status: 'authorized') must NOT mark order paid
 * 2. Captured payment (status: 'captured') successfully marks order paid
 * 3. Failed capture does not mark order paid (leaves order in pending status)
 * 4. Duplicate capture cannot create inconsistent state (alreadyPaid: true)
 * 5. An authorized webhook (payment.authorized) cannot mark an order paid
 * 6. A captured webhook (payment.captured) updates the correct order
 * 7. Repeated webhook delivery remains idempotent
 * 8. Server-side capture operation (callRazorpayPaymentCaptureApi) format & Basic Auth
 * 9. Capture rejects amount alteration / mismatch
 * 10. Out-of-order protection: failed capture attempt on settled order never downgrades
 */

import assert from 'node:assert/strict'
import crypto from 'node:crypto'

// Polyfill minimal browser localStorage for headless Node test environment
const memoryStore = new Map()
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear(),
}

console.log('--- STARTING KAVORYN PHASE 3.2 PAYMENT CAPTURE VALIDATION SUITE ---\n')

async function runCaptureTests() {
  const {
    callRazorpayPaymentCaptureApi,
    getBasicAuthHeader,
  } = await import('../convex/razorpay.js')

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

  // Seed database
  await storeBackend.seedDatabase()

  // Helper to create a valid pending order
  async function makePendingOrder(idemp = `idemp_cap_${Date.now()}_${Math.random()}`) {
    return await storeBackend.createPendingOrder({
      email: 'capture.auditor@kavoryn.studio',
      name: 'Rohan Mehra',
      phone: '+919876543210',
      address: {
        line1: 'Flat 702, Skyline Towers',
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

  // --- Test 1: Authorized payment must NOT mark order paid ---
  await test('1. Authorized payment (status: "authorized") strictly rejected from marking order paid', async () => {
    const order = await makePendingOrder('test_cap_auth_rejected')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_auth_only_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    let errorThrown = false
    try {
      await storeBackend.verifyRazorpayPayment({
        orderId: order.orderId,
        razorpayOrderId: rzpOrder.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        serverVerifiedPayment: {
          status: 'authorized', // Authorized-only; not yet captured
          amount: 59800,
          currency: 'INR',
        },
      })
    } catch (err) {
      errorThrown = true
      assert.ok(
        err.message.includes('Payment capture required') || err.message.includes('authorized-only'),
        `Error must mention capture required: ${err.message}`
      )
    }

    assert.ok(errorThrown, 'Must throw exception when payment is authorized but uncaptured')
    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'pending', 'Order must stay pending')
  })

  // --- Test 2: Captured payment successfully marks order paid ---
  await test('2. Captured payment (status: "captured") successfully marks order paid with paidAt timestamp', async () => {
    const order = await makePendingOrder('test_cap_success')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_captured_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    const verified = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      serverVerifiedPayment: {
        status: 'captured', // Truly captured
        amount: 59800,
        currency: 'INR',
      },
    })

    assert.equal(verified.status, 'paid')
    assert.equal(verified.paymentStatus, 'paid')

    const updated = await storeBackend.getOrderById(order.orderId)
    assert.equal(updated.status, 'paid')
    assert.equal(updated.razorpayPaymentId, paymentId)
    assert.ok(updated.paidAt, 'paidAt timestamp must be recorded')
  })

  // --- Test 3: Failed capture does not mark order paid ---
  await test('3. Failed capture leaves order in safe pending-payment state', async () => {
    const order = await makePendingOrder('test_cap_failed')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)

    // Record capture failure
    const res = await storeBackend.recordPaymentFailure(
      order.orderId,
      'Razorpay Payment Capture failed: Authorization expired / bank decline'
    )

    assert.equal(res.status, 'pending', 'Order must remain in pending status for retry')
    assert.equal(res.paymentStatus, 'failed')

    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'pending')
    assert.equal(
      check.paymentFailureReason,
      'Razorpay Payment Capture failed: Authorization expired / bank decline'
    )
  })

  // --- Test 4: Duplicate capture cannot create inconsistent state ---
  await test('4. Duplicate capture attempts handled safely without state corruption', async () => {
    const order = await makePendingOrder('test_cap_duplicate')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_cap_dup_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    // Initial capture verification
    const res1 = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      serverVerifiedPayment: {
        status: 'captured',
        amount: 59800,
        currency: 'INR',
      },
    })
    assert.equal(res1.status, 'paid')

    // Duplicate capture verification call
    const res2 = await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      serverVerifiedPayment: {
        status: 'captured',
        amount: 59800,
        currency: 'INR',
      },
    })
    assert.equal(res2.status, 'paid')
    assert.equal(res2.alreadyPaid, true, 'Must report alreadyPaid: true')

    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'paid')
  })

  // --- Test 5: Authorized webhook cannot mark an order paid ---
  await test('5. Authorized webhook (payment.authorized) cannot mark order paid', async () => {
    const order = await makePendingOrder('test_cap_wh_auth')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const eventId = `wh_auth_test_${Date.now()}`

    let authWebhookError = false
    try {
      await storeBackend.markPaid(
        rzpOrder.razorpayOrderId,
        'pay_auth_webhook',
        'sig_wh',
        eventId,
        'authorized' // Gateway status is authorized, NOT captured
      )
    } catch (err) {
      authWebhookError = true
      assert.ok(err.message.includes('authorized-only') || err.message.includes('captured'))
    }

    assert.ok(authWebhookError, 'markPaid must reject paymentStatus: authorized')
    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'pending', 'Order must remain pending')
  })

  // --- Test 6: Captured webhook updates the correct order ---
  await test('6. Captured webhook (payment.captured) marks the correct order paid', async () => {
    const order = await makePendingOrder('test_cap_wh_captured')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const eventId = `wh_cap_test_${Date.now()}`
    const paymentId = `pay_wh_cap_${Date.now()}`

    const res = await storeBackend.markPaid(
      rzpOrder.razorpayOrderId,
      paymentId,
      'sig_valid_wh',
      eventId,
      'captured' // Confirmed captured
    )

    assert.equal(res.success, true)
    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'paid')
    assert.equal(check.razorpayPaymentId, paymentId)
  })

  // --- Test 7: Repeated webhook delivery remains idempotent ---
  await test('7. Repeated captured webhook delivery remains idempotent', async () => {
    const order = await makePendingOrder('test_cap_wh_idemp')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const eventId = `wh_idemp_stable_${Date.now()}`
    const paymentId = `pay_wh_idemp_${Date.now()}`

    // First delivery
    const res1 = await storeBackend.markPaid(
      rzpOrder.razorpayOrderId,
      paymentId,
      'sig_idemp',
      eventId,
      'captured'
    )
    assert.equal(res1.success, true)
    assert.equal(res1.duplicateEvent, undefined)

    // Second delivery (same event ID)
    const res2 = await storeBackend.markPaid(
      rzpOrder.razorpayOrderId,
      paymentId,
      'sig_idemp',
      eventId,
      'captured'
    )
    assert.equal(res2.success, true)
    assert.equal(res2.duplicateEvent, true, 'Repeated delivery must return duplicateEvent: true')
  })

  // --- Test 8: Server-side manual capture operation (callRazorpayPaymentCaptureApi) ---
  await test('8. Server-side capture operation API target, Basic Auth and payload format', async () => {
    const originalFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedOptions = null

    globalThis.fetch = async (url, options) => {
      capturedUrl = String(url)
      capturedOptions = options
      return new Response(
        JSON.stringify({
          id: 'pay_capture_target_123',
          entity: 'payment',
          amount: 59800,
          currency: 'INR',
          status: 'captured',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    try {
      const captureResult = await callRazorpayPaymentCaptureApi({
        paymentId: 'pay_capture_target_123',
        amountInPaise: 59800,
        currency: 'INR',
        keyId: 'rzp_test_capkey',
        keySecret: 'secret_cap123',
      })

      assert.equal(capturedUrl, 'https://api.razorpay.com/v1/payments/pay_capture_target_123/capture')
      assert.equal(capturedOptions.method, 'POST')

      const expectedBase64 = Buffer.from('rzp_test_capkey:secret_cap123').toString('base64')
      assert.equal(capturedOptions.headers.Authorization, `Basic ${expectedBase64}`)

      const body = JSON.parse(capturedOptions.body)
      assert.equal(body.amount, 59800)
      assert.equal(body.currency, 'INR')
      assert.equal(captureResult.status, 'captured')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  // --- Test 9: Capture rejects amount alteration / mismatch ---
  await test('9. Manual capture rejects amount mismatch against order total', async () => {
    const order = await makePendingOrder('test_cap_amount_mismatch')

    let mismatchThrown = false
    try {
      await storeBackend.captureRazorpayPayment({
        orderId: order.orderId,
        paymentId: 'pay_mismatch_test',
        amountInPaise: 10000, // Attacker passes 10000 paise instead of 59800
      })
    } catch (err) {
      mismatchThrown = true
      assert.ok(err.message.includes('Amount mismatch'))
    }

    assert.ok(mismatchThrown, 'Must reject altered capture amount')
  })

  // --- Test 10: Out-of-order protection: failed capture attempt on settled order never downgrades ---
  await test('10. Failed capture attempt on an already settled order never downgrades status', async () => {
    const order = await makePendingOrder('test_cap_settled_protection')
    const rzpOrder = await storeBackend.createRazorpayOrder(order.orderId)
    const paymentId = `pay_settled_first_${Date.now()}`
    const payload = `${rzpOrder.razorpayOrderId}|${paymentId}`
    const signature = crypto.createHmac('sha256', RAZORPAY_TEST_SECRET).update(payload).digest('hex')

    // Mark paid
    await storeBackend.verifyRazorpayPayment({
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      serverVerifiedPayment: {
        status: 'captured',
        amount: 59800,
        currency: 'INR',
      },
    })

    // Advance to fulfilled
    await storeBackend.updateOrderStatus(order.orderId, 'fulfilled')

    // Late capture failure notification arrives
    const failRes = await storeBackend.recordPaymentFailure(
      order.orderId,
      'Late capture timeout from banking network'
    )
    assert.equal(failRes.alreadyPaid, true, 'Settled order must report alreadyPaid: true')

    const check = await storeBackend.getOrderById(order.orderId)
    assert.equal(check.status, 'fulfilled', 'Status must stay fulfilled')
  })

  console.log(`\n========================================`)
  console.log(`PAYMENT CAPTURE TESTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

runCaptureTests().catch((err) => {
  console.error('Capture test error:', err)
  process.exit(1)
})
