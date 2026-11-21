import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('--- STARTING LIVE CONVEX + RAZORPAY TEST SUITE ---')
console.log(`Target Convex Deployment: ${CONVEX_URL}\n`)

async function runTests() {
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

  // 1. Test Razorpay API Connectivity
  await test('1. Razorpay Orders API credentials test', async () => {
    const res = await client.action(api.razorpay.testConnection, {})
    assert.ok(res.success, `Connection test failed: ${res.error}`)
    assert.ok(res.orderId && res.orderId.startsWith('order_'), 'Must return authentic Razorpay order ID')
    console.log(`       Authentic Razorpay Test Order Created: ${res.orderId}`)
  })

  // 2. Test Order Creation with Numeric Product ID ("1")
  let createdOrderId = null
  let createdOrderNumber = null
  await test('2. Create Pending Order in Convex with numeric product ID ("1")', async () => {
    const res = await client.mutation(api.orders.createPending, {
      name: 'Aditi Rao',
      email: 'aditi.test@example.com',
      phone: '+919876543210',
      address: {
        line1: 'Flat 402, Lotus Towers, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
      },
      items: [
        {
          productId: '1', // Static numeric product ID from First Edition catalog
          size: 'A3',
          finish: 'Matte',
          quantity: 2,
        },
      ],
      idempotencyKey: `test_idemp_${Date.now()}`,
    })

    assert.ok(res.orderId, 'Order ID must be returned')
    assert.ok(res.orderNumber.startsWith('KVR-'), 'Order number must have KVR- prefix')
    assert.equal(res.subtotal, 498, 'A3 base price (249) x 2 must equal 498')
    assert.equal(res.total, 498 + 79, 'Under 499 threshold must include 79 standard shipping')

    createdOrderId = res.orderId
    createdOrderNumber = res.orderNumber
    console.log(`       Convex Order Created: ${createdOrderNumber} (${createdOrderId})`)
  })

  // 3. Test Genuine Razorpay Order Creation for the Pending Order
  let rzpOrderId = null
  await test('3. Create Genuine Razorpay Order via createOrderAction', async () => {
    assert.ok(createdOrderId, 'Pending order must exist')
    const res = await client.action(api.razorpay.createOrderAction, {
      orderId: createdOrderId,
    })

    assert.ok(res.success, 'Action must succeed')
    assert.ok(res.razorpayOrderId.startsWith('order_'), 'Must be authentic Razorpay order ID')
    assert.equal(res.currency, 'INR')
    assert.equal(res.amount, (498 + 79) * 100, 'Amount must be exactly converted to paise')
    assert.ok(res.keyId.startsWith('rzp_test_'), 'Key ID must be Razorpay test key')

    rzpOrderId = res.razorpayOrderId
    console.log(`       Genuine Razorpay Order attached: ${rzpOrderId}`)
  })

  // 4. Test Convex Order Record has Razorpay Order attached
  await test('4. Verify Order in Convex database reflects attempted status and razorpayOrderId', async () => {
    assert.ok(createdOrderId, 'Pending order must exist')
    const order = await client.query(api.orders.getById, { id: createdOrderId })
    assert.ok(order, 'Order must be queryable by ID')
    assert.equal(order.razorpayOrderId, rzpOrderId)
    assert.equal(order.paymentStatus, 'attempted')
    assert.equal(order.status, 'pending')
    assert.ok(order.paymentAttempts && order.paymentAttempts.length >= 1, 'Payment attempt recorded')
  })

  // 5. Test Unified Checkout Action (createCheckoutOrderAction)
  await test('5. Unified createCheckoutOrderAction completes order creation + Razorpay order in single round-trip', async () => {
    const res = await client.action(api.razorpay.createCheckoutOrderAction, {
      name: 'Rohan Mehta',
      email: 'rohan.test@example.com',
      phone: '+919811223344',
      address: {
        line1: '12 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
      },
      items: [
        {
          productId: '2', // The Blue Dimension
          size: 'A2',
          finish: 'Gloss',
          quantity: 2,
        },
      ],
      idempotencyKey: `test_unified_${Date.now()}`,
    })

    assert.ok(res.success, 'Unified action must succeed')
    assert.ok(res.orderId, 'Order ID must be returned')
    assert.ok(res.razorpayOrderId.startsWith('order_'), 'Genuine Razorpay order ID returned')
    assert.equal(res.currency, 'INR')
    assert.ok(res.amount > 0)
    console.log(`       Unified Checkout Action Result: Order ${res.orderNumber} -> Razorpay ${res.razorpayOrderId}`)
  })

  // 6. Test Payment Verification Rejection for Invalid Payment / Signature
  await test('6. VerifyPaymentAction rejects tampered / invalid payment', async () => {
    assert.ok(createdOrderId && rzpOrderId)
    let errorCaught = false
    try {
      await client.action(api.razorpay.verifyPaymentAction, {
        orderId: createdOrderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: 'pay_invalid_123',
        razorpaySignature: 'corrupted_signature_ffffffffffffffff',
      })
    } catch (err) {
      console.log(`       Expected rejection received: ${err.message}`)
      errorCaught = true
    }
    assert.ok(errorCaught, 'Must reject invalid payment or signature')
  })

  // 7. Test Webhook Endpoint Signature Enforcement
  await test('7. Webhook HTTP endpoint enforces valid signature on POST /razorpay-webhook', async () => {
    const webhookUrl = 'https://resolute-bison-903.convex.site/razorpay-webhook'
    // Missing signature header
    const resNoSig = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'payment.captured' }),
    })
    assert.equal(resNoSig.status, 400, 'Must return 400 when X-Razorpay-Signature is missing')

    // Invalid signature header
    const resBadSig = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': 'invalid_hex_signature_123',
      },
      body: JSON.stringify({ event: 'payment.captured' }),
    })
    assert.equal(resBadSig.status, 401, 'Must return 401 when X-Razorpay-Signature is invalid')
    console.log(`       Webhook correctly enforced 400 (missing) and 401 (invalid) signatures`)
  })

  console.log(`\n========================================`)
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log(`========================================`)
  if (failed > 0) process.exit(1)
}

runTests().catch((e) => {
  console.error('Test run error:', e)
  process.exit(1)
})
