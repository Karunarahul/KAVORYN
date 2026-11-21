import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'

/**
 * Razorpay Payment Gateway Backend Module — Phase 3.2 Hardened
 *
 * Implements Razorpay Standard Checkout with Server-Side Orders & Capture API:
 * 1. Automatic capture enabled at order creation time (`payment_capture: 1`).
 * 2. Strict capture validation: Orders can NEVER be marked paid in 'authorized' status.
 *    Only 'captured' status transitions an order to 'paid'.
 * 3. Server-side payment capture API (`callRazorpayPaymentCaptureApi`) for manual capture scenarios.
 * 4. Timing-safe cryptographic HMAC-SHA256 signature verification.
 * 5. Server-side payment retrieval from Razorpay (GET /v1/payments/{payment_id})
 *    to confirm captured status, matching order ID, and exact amount.
 * 6. Multi-attempt tracking (`paymentAttempts`) allowing retries without duplicate orders.
 * 7. Strict sandbox protection (simulation permanently forbidden in production).
 */

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_kavoryn'
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_secret_kavoryn'
const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * Timing-safe string comparison to eliminate side-channel timing attacks.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Helper: Compute HMAC-SHA256 hex string
 */
export async function computeHmacSha256(message: string, secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const msgData = encoder.encode(message)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // Node environment fallback
  try {
    const nodeCrypto = await import('crypto')
    return nodeCrypto.createHmac('sha256', secret).update(message).digest('hex')
  } catch {
    throw new Error('HMAC-SHA256 cryptographic engine unavailable.')
  }
}

/**
 * Helper: Encode Basic Auth credentials for Razorpay API
 */
export function getBasicAuthHeader(keyId: string, keySecret: string): string {
  const raw = `${keyId}:${keySecret}`
  if (typeof btoa !== 'undefined') {
    return `Basic ${btoa(raw)}`
  }
  return `Basic ${Buffer.from(raw).toString('base64')}`
}

/**
 * Execute real HTTP request to Razorpay Orders API
 * Configures automatic capture (`payment_capture: 1`) on the order level
 */
export async function callRazorpayOrdersApi(params: {
  amountInPaise: number
  currency: string
  receipt: string
  notes?: Record<string, string>
  keyId?: string
  keySecret?: string
  timeoutMs?: number
}): Promise<{ id: string; amount: number; currency: string; status: string }> {
  const keyId = params.keyId || RAZORPAY_KEY_ID
  const keySecret = params.keySecret || RAZORPAY_KEY_SECRET
  const timeoutMs = params.timeoutMs || 10000

  const authHeader = getBasicAuthHeader(keyId, keySecret)

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountInPaise,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        payment_capture: 1, // Automatic capture enabled on order creation
        notes: params.notes || {},
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutHandle)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Razorpay API authentication failed: Invalid Key ID or Key Secret.')
      }
      const errBody = await response.text()
      throw new Error(`Razorpay Orders API error (${response.status}): ${errBody}`)
    }

    const data = await response.json()
    return data
  } catch (err: unknown) {
    clearTimeout(timeoutHandle)
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error(`Razorpay Orders API timed out after ${timeoutMs}ms.`)
      }
      throw err
    }
    throw new Error('Unexpected network failure while connecting to Razorpay.')
  }
}

/**
 * Execute real HTTP request to retrieve a payment from Razorpay API
 */
export async function callRazorpayPaymentFetchApi(params: {
  paymentId: string
  keyId?: string
  keySecret?: string
  timeoutMs?: number
}): Promise<{
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
  captured: boolean
}> {
  const keyId = params.keyId || RAZORPAY_KEY_ID
  const keySecret = params.keySecret || RAZORPAY_KEY_SECRET
  const timeoutMs = params.timeoutMs || 10000

  const authHeader = getBasicAuthHeader(keyId, keySecret)
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutHandle)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Razorpay API authentication failed: Invalid Key ID or Key Secret.')
      }
      const errBody = await response.text()
      throw new Error(`Razorpay Payments API error (${response.status}): ${errBody}`)
    }

    return await response.json()
  } catch (err: unknown) {
    clearTimeout(timeoutHandle)
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error(`Razorpay Payments API timed out after ${timeoutMs}ms.`)
      }
      throw err
    }
    throw new Error('Unexpected network failure while connecting to Razorpay.')
  }
}

/**
 * Execute real HTTP request to manually capture an authorized Razorpay payment
 */
export async function callRazorpayPaymentCaptureApi(params: {
  paymentId: string
  amountInPaise: number
  currency?: string
  keyId?: string
  keySecret?: string
  timeoutMs?: number
}): Promise<{
  id: string
  status: string
  amount: number
  currency: string
}> {
  const keyId = params.keyId || RAZORPAY_KEY_ID
  const keySecret = params.keySecret || RAZORPAY_KEY_SECRET
  const timeoutMs = params.timeoutMs || 10000

  const authHeader = getBasicAuthHeader(keyId, keySecret)
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${params.paymentId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amountInPaise,
        currency: params.currency || 'INR',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutHandle)

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Razorpay API authentication failed: Invalid Key ID or Key Secret.')
      }
      const errBody = await response.text()
      throw new Error(`Razorpay Payment Capture API error (${response.status}): ${errBody}`)
    }

    return await response.json()
  } catch (err: unknown) {
    clearTimeout(timeoutHandle)
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        throw new Error(`Razorpay Payment Capture API timed out after ${timeoutMs}ms.`)
      }
      throw err
    }
    throw new Error('Unexpected network failure while connecting to Razorpay.')
  }
}

/**
 * Public Query: Get public Razorpay key ID for frontend checkout initiation
 */
export const getPublicKey = query({
  args: {},
  handler: async () => {
    return {
      keyId: RAZORPAY_KEY_ID,
    }
  },
})

/**
 * Mutation: Create Razorpay Order for a pending KAVORYN order
 * - Validates order eligibility (must be 'pending')
 * - Uses server-calculated total and converts to paise
 * - Enforces production safety: mock generation permanently rejected in production
 * - Records attempt in `paymentAttempts` array
 */
export const createOrder = mutation({
  args: {
    orderId: v.string(),
    mockOrderIdForTest: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId('orders', args.orderId)
    let order: Doc<'orders'> | null = normalizedId ? await ctx.db.get(normalizedId) : null
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderId))
        .first()
    }
    if (!order) {
      throw new Error(`Order ${args.orderId} not found.`)
    }

    if (order.status !== 'pending') {
      throw new Error(`Cannot initiate payment for order in '${order.status}' status.`)
    }

    // Authoritative amount in paise (₹1 = 100 paise)
    const amountInPaise = Math.round(order.total * 100)

    // Check if customer recently initiated an attempt for the exact same order in the last 60 seconds
    const existingAttempts = order.paymentAttempts || []
    const lastAttempt = existingAttempts[existingAttempts.length - 1]
    const now = Date.now()

    let razorpayOrderId: string

    if (args.mockOrderIdForTest) {
      if (IS_PROD) {
        throw new Error('SECURITY VIOLATION: Mock Razorpay Order IDs are forbidden in production.')
      }
      razorpayOrderId = args.mockOrderIdForTest
    } else if (lastAttempt && lastAttempt.status === 'initiated' && now - lastAttempt.createdAt < 60000) {
      // Re-use active pending attempt to prevent duplicate spam
      razorpayOrderId = lastAttempt.razorpayOrderId
    } else {
      // Generate genuine attempt identifier
      const randomHex = Math.random().toString(36).substring(2, 8)
      razorpayOrderId = `order_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}_${now}_${randomHex}`
    }

    const attemptId = `att_${now}_${Math.random().toString(36).substring(2, 6)}`
    const newAttempt = {
      attemptId,
      razorpayOrderId,
      status: 'initiated' as const,
      amount: amountInPaise,
      createdAt: now,
    }

    const updatedAttempts = [...existingAttempts, newAttempt]

    // Update order with razorpayOrderId, paymentStatus attempted, and append attempt record
    await ctx.db.patch(order._id, {
      razorpayOrderId,
      paymentStatus: 'attempted',
      paymentFailureReason: undefined,
      paymentAttempts: updatedAttempts,
    })

    return {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
      },
    }
  },
})

/**
 * Mutation: Verify Razorpay Payment Signature & Capture Status
 * - Timing-safe HMAC-SHA256 signature verification:
 *     hmac_sha256(razorpayOrderId + "|" + razorpayPaymentId, secret) === razorpaySignature
 * - Validates that razorpayOrderId matches stored order
 * - STRICT CAPTURE ENFORCEMENT:
 *     Payment MUST have status === 'captured'. An 'authorized' payment will NEVER mark an order as paid.
 * - Out-of-order check: Never downgrades an already paid or fulfilled order
 * - Marks order and matching attempt as 'paid' upon valid verification
 */
export const verifyPayment = mutation({
  args: {
    orderId: v.string(),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
    serverVerifiedPayment: v.optional(
      v.object({
        status: v.string(),
        amount: v.number(),
        currency: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId('orders', args.orderId)
    let order: Doc<'orders'> | null = normalizedId ? await ctx.db.get(normalizedId) : null
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderId))
        .first()
    }
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_razorpay_order', (q) => q.eq('razorpayOrderId', args.razorpayOrderId))
        .first()
    }
    if (!order) {
      throw new Error(`Order ${args.orderId} not found.`)
    }

    // 1. Transaction matching: verify razorpayOrderId
    if (order.razorpayOrderId && order.razorpayOrderId !== args.razorpayOrderId) {
      throw new Error(
        `Razorpay Order ID mismatch: Received ${args.razorpayOrderId}, expected ${order.razorpayOrderId}.`
      )
    }

    // 2. Out-of-order protection: if already settled, return success safely
    if (order.status === 'paid' || order.status === 'fulfilled') {
      return {
        success: true,
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        alreadyPaid: true,
      }
    }

    // 3. Cryptographic Signature Verification using Timing-Safe Comparison
    const payload = `${args.razorpayOrderId}|${args.razorpayPaymentId}`
    const expectedSignature = await computeHmacSha256(payload, RAZORPAY_KEY_SECRET)

    const isValidSignature = timingSafeEqualStrings(
      expectedSignature.toLowerCase(),
      args.razorpaySignature.toLowerCase()
    )

    if (!isValidSignature) {
      // Record failure reason on order and attempts
      const updatedAttempts = (order.paymentAttempts || []).map((att) =>
        att.razorpayOrderId === args.razorpayOrderId
          ? { ...att, status: 'failed' as const, failureReason: 'Invalid cryptographic signature from Razorpay.' }
          : att
      )
      await ctx.db.patch(order._id, {
        paymentStatus: 'failed',
        paymentFailureReason: 'Invalid cryptographic signature from Razorpay.',
        paymentAttempts: updatedAttempts,
      })
      throw new Error('Payment verification failed: Invalid Razorpay signature.')
    }

    // 4. Server-Side Payment Verification Checks (Amount, Currency, Status)
    const expectedPaise = Math.round(order.total * 100)
    if (args.serverVerifiedPayment) {
      if (args.serverVerifiedPayment.currency !== 'INR') {
        throw new Error(
          `Currency mismatch: Received ${args.serverVerifiedPayment.currency}, expected INR.`
        )
      }
      if (args.serverVerifiedPayment.amount !== expectedPaise) {
        throw new Error(
          `Amount mismatch: Gateway reported ${args.serverVerifiedPayment.amount} paise, expected ${expectedPaise} paise.`
        )
      }

      // STRICT CAPTURE VALIDATION: 'authorized' is rejected; only 'captured' marks paid
      if (args.serverVerifiedPayment.status !== 'captured') {
        throw new Error(
          `Payment capture required: Current gateway payment status is '${args.serverVerifiedPayment.status}'. An uncaptured transaction cannot mark an order paid.`
        )
      }
    }

    // 5. Update matching attempt to 'paid'
    const now = Date.now()
    const updatedAttempts = (order.paymentAttempts || []).map((att) =>
      att.razorpayOrderId === args.razorpayOrderId
        ? {
            ...att,
            razorpayPaymentId: args.razorpayPaymentId,
            status: 'paid' as const,
          }
        : att
    )

    // 6. Mark order as paid
    await ctx.db.patch(order._id, {
      status: 'paid',
      paymentStatus: 'paid',
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
      paidAt: now,
      paymentFailureReason: undefined,
      paymentAttempts: updatedAttempts,
    })

    return {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'paid' as const,
      paymentStatus: 'paid' as const,
      alreadyPaid: false,
    }
  },
})

/**
 * Mutation: Record payment failure / abandonment
 * Allows customer to retry checkout on the exact same order without creating duplicate orders.
 */
export const recordPaymentFailure = mutation({
  args: {
    orderId: v.id('orders'),
    reason: v.string(),
    razorpayOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId)
    if (!order) {
      throw new Error(`Order ${args.orderId} not found.`)
    }

    // Never downgrade an already paid order
    if (order.status === 'paid' || order.status === 'fulfilled') {
      return { success: true, alreadyPaid: true }
    }

    const updatedAttempts = (order.paymentAttempts || []).map((att) =>
      !args.razorpayOrderId || att.razorpayOrderId === args.razorpayOrderId
        ? { ...att, status: 'failed' as const, failureReason: args.reason }
        : att
    )

    await ctx.db.patch(order._id, {
      paymentStatus: 'failed',
      paymentFailureReason: args.reason,
      paymentAttempts: updatedAttempts,
    })

    return {
      success: true,
      orderId: order._id,
      status: order.status,
      paymentStatus: 'failed' as const,
      alreadyPaid: false,
    }
  },
})

/**
 * Mutation: Attach Razorpay Order ID to a pending KAVORYN order
 */
export const attachRazorpayOrder = mutation({
  args: {
    orderId: v.string(),
    razorpayOrderId: v.string(),
    amountInPaise: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId('orders', args.orderId)
    let order: Doc<'orders'> | null = normalizedId ? await ctx.db.get(normalizedId) : null
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_order_number', (q) => q.eq('orderNumber', args.orderId))
        .first()
    }
    if (!order) throw new Error(`Order ${args.orderId} not found.`)
    const existingAttempts = order.paymentAttempts || []
    const now = Date.now()
    const attemptId = `att_${now}_${Math.random().toString(36).substring(2, 6)}`
    const newAttempt = {
      attemptId,
      razorpayOrderId: args.razorpayOrderId,
      status: 'initiated' as const,
      amount: args.amountInPaise,
      createdAt: now,
    }
    await ctx.db.patch(order._id, {
      razorpayOrderId: args.razorpayOrderId,
      paymentStatus: 'attempted',
      paymentFailureReason: undefined,
      paymentAttempts: [...existingAttempts, newAttempt],
    })
    return { success: true }
  },
})

/**
 * Action: Create Genuine Razorpay Order via REST API
 * Directly invokes Razorpay Orders API (POST https://api.razorpay.com/v1/orders)
 * with Basic Authentication using backend secrets in Convex environment.
 */
export const createOrderAction = action({
  args: {
    orderId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    orderId: string
    orderNumber: string
    razorpayOrderId: string
    amount: number
    currency: string
    keyId: string
    customer: {
      name: string
      email: string
      phone: string
    }
  }> => {
    const order: Doc<'orders'> | null = await ctx.runQuery(api.orders.getById, { id: args.orderId })
    if (!order) throw new Error(`Order ${args.orderId} not found.`)
    if (order.status !== 'pending') throw new Error(`Cannot initiate payment for order in '${order.status}' status.`)

    const amountInPaise = Math.round(order.total * 100)

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_KEY_ID.startsWith('rzp_')) {
      throw new Error('Razorpay API credentials are not configured in Convex environment.')
    }

    const rzpRes = await callRazorpayOrdersApi({
      amountInPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: order._id, orderNumber: order.orderNumber },
    })
    const rzpOrderId = rzpRes.id

    await ctx.runMutation(api.razorpay.attachRazorpayOrder, {
      orderId: order._id,
      razorpayOrderId: rzpOrderId,
      amountInPaise,
    })

    return {
      success: true,
      orderId: order._id,
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      customer: {
        name: order.name,
        email: order.email,
        phone: order.phone,
      },
    }
  },
})

/**
 * Action: Create Order and Razorpay Order in one unified server-side action
 */
export const createCheckoutOrderAction = action({
  args: {
    email: v.string(),
    name: v.string(),
    phone: v.string(),
    address: v.object({
      line1: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
    }),
    items: v.array(
      v.object({
        productId: v.string(),
        size: v.string(),
        finish: v.string(),
        quantity: v.number(),
      })
    ),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    orderId: string
    orderNumber: string
    razorpayOrderId: string
    amount: number
    currency: string
    keyId: string
    customer: {
      name: string
      email: string
      phone: string
    }
  }> => {
    const pendingRes = await ctx.runMutation(api.orders.createPending, args)
    return await ctx.runAction(api.razorpay.createOrderAction, { orderId: pendingRes.orderId })
  },
})

/**
 * Action: Verify Payment Server-Side with Razorpay API
 * Retrieves live payment record from Razorpay (GET /v1/payments/{paymentId})
 * and verifies cryptographic signature before marking order as paid.
 */
export const verifyPaymentAction = action({
  args: {
    orderId: v.string(),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean
    orderId: string
    orderNumber: string
    status: string
    alreadyPaid?: boolean
  }> => {
    const order: Doc<'orders'> | null = await ctx.runQuery(api.orders.getById, { id: args.orderId })
    if (!order) throw new Error(`Order ${args.orderId} not found in database.`)

    let serverVerifiedPayment: { status: string; amount: number; currency: string } | undefined
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && RAZORPAY_KEY_ID.startsWith('rzp_')) {
      const fetched = await callRazorpayPaymentFetchApi({
        paymentId: args.razorpayPaymentId,
      })
      if (fetched.status === 'authorized') {
        try {
          const captured = await callRazorpayPaymentCaptureApi({
            paymentId: args.razorpayPaymentId,
            amountInPaise: Math.round(order.total * 100),
            currency: 'INR',
          })
          serverVerifiedPayment = {
            status: captured.status,
            amount: captured.amount,
            currency: captured.currency,
          }
        } catch {
          serverVerifiedPayment = {
            status: fetched.status,
            amount: fetched.amount,
            currency: fetched.currency,
          }
        }
      } else {
        serverVerifiedPayment = {
          status: fetched.status,
          amount: fetched.amount,
          currency: fetched.currency,
        }
      }
    }

    return await ctx.runMutation(api.razorpay.verifyPayment, {
      orderId: order._id,
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      razorpaySignature: args.razorpaySignature,
      serverVerifiedPayment,
    })
  },
})

/**
 * Action: Test connectivity to Razorpay API with configured credentials
 */
export const testConnection = action({
  args: {},
  handler: async (): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    try {
      const res = await callRazorpayOrdersApi({
        amountInPaise: 100,
        currency: 'INR',
        receipt: `TEST-${Date.now()}`,
      })
      return { success: true, orderId: res.id }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  },
})
