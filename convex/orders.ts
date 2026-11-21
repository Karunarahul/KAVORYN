import { mutation, query } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { v } from 'convex/values'
import { requireAdminAuth } from './auth'

// Email format regex validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Indian 6-digit PIN code validation
const PIN_CODE_REGEX = /^[1-9][0-9]{5}$/

/**
 * Public mutation: Create a pending order with strict server-side validation,
 * backend-authoritative pricing, address validation, and idempotency protection.
 */
export const createPending = mutation({
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
  handler: async (ctx, args) => {
    // 1. Validate customer input
    const cleanEmail = args.email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Invalid email address provided.')
    }

    const cleanName = args.name.trim()
    if (cleanName.length < 2) {
      throw new Error('Customer name must be at least 2 characters.')
    }

    const cleanPhone = args.phone.trim()
    if (cleanPhone.length < 10) {
      throw new Error('Please provide a valid 10-digit phone number.')
    }

    // 2. Validate address
    const cleanPostal = args.address.postalCode.trim()
    if (!PIN_CODE_REGEX.test(cleanPostal)) {
      throw new Error('Please provide a valid 6-digit Indian PIN code.')
    }

    if (args.address.line1.trim().length < 5) {
      throw new Error('Street address line 1 is too short.')
    }

    if (args.items.length === 0) {
      throw new Error('Cannot create an order with zero items.')
    }

    // 3. Duplicate submission prevention via idempotencyKey
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query('orders')
        .withIndex('by_idempotency', (q) =>
          q.eq('idempotencyKey', args.idempotencyKey)
        )
        .first()

      if (existing) {
        return {
          orderId: existing._id,
          orderNumber: existing.orderNumber,
          subtotal: existing.subtotal,
          shippingFee: existing.shippingFee,
          total: existing.total,
          status: existing.status,
          razorpayOrderId: existing.razorpayOrderId,
          isDuplicate: true,
        }
      }
    }

    // 4. Server-Side Authoritative Product & Pricing Resolution
    const orderItems: Array<{
      productId: typeof args.items[0]['productId']
      productSku: string
      productName: string
      size: string
      finish: string
      quantity: number
      unitPrice: number
      subtotal: number
    }> = []

    let calculatedSubtotal = 0

    for (const item of args.items) {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero.')
      }

      // Fetch authentic product document directly from database (by ID, SKU, slug, or numeric index)
      const normalizedProdId = ctx.db.normalizeId('products', item.productId)
      let product: Doc<'products'> | null = normalizedProdId ? await ctx.db.get(normalizedProdId) : null
      if (!product) {
        product = await ctx.db
          .query('products')
          .withIndex('by_sku', (q) => q.eq('sku', item.productId))
          .first()
      }
      if (!product) {
        product = await ctx.db
          .query('products')
          .withIndex('by_slug', (q) => q.eq('slug', item.productId))
          .first()
      }
      if (!product) {
        const num = parseInt(item.productId, 10)
        if (!isNaN(num) && num >= 1) {
          const allProds = await ctx.db.query('products').collect()
          if (allProds[num - 1]) {
            product = allProds[num - 1]
          }
        }
      }
      if (!product || !product.active) {
        throw new Error(
          `Product (${item.productId}) is not available or has been discontinued.`
        )
      }

      // Resolve base size price from backend record
      const sizeKey = item.size as 'A4' | 'A3' | 'A2' | 'A1'
      const basePrice = product.prices[sizeKey]
      if (typeof basePrice !== 'number') {
        throw new Error(
          `Invalid size (${item.size}) requested for product: ${product.name}.`
        )
      }

      // Resolve finish surcharge from backend record
      const finishKey = item.finish as 'Matte' | 'Gloss'
      const finishSurcharge =
        product.finishSurcharges && product.finishSurcharges[finishKey]
          ? product.finishSurcharges[finishKey]
          : finishKey === 'Gloss'
            ? 50
            : 0

      const authoritativeUnitPrice = basePrice + finishSurcharge
      const lineSubtotal = authoritativeUnitPrice * item.quantity

      calculatedSubtotal += lineSubtotal

      orderItems.push({
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        size: item.size,
        finish: item.finish,
        quantity: item.quantity,
        unitPrice: authoritativeUnitPrice,
        subtotal: lineSubtotal,
      })
    }

    // 5. Authoritative Shipping Calculation
    const settings = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'store_config'))
      .unique()

    const freeThreshold = settings ? settings.freeShippingThreshold : 499
    const standardFee = settings ? settings.standardShippingFee : 79

    const shippingFee = calculatedSubtotal >= freeThreshold ? 0 : standardFee
    const grandTotal = calculatedSubtotal + shippingFee

    // 6. Generate Human-Readable Order Number
    const year = new Date().getFullYear()
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `KVR-${year}-${randomHex}`

    // 7. Insert Order Record in 'pending' status with optional authenticated userId
    const identity = await ctx.auth.getUserIdentity()
    const userId = identity?.subject || undefined

    const orderId = await ctx.db.insert('orders', {
      orderNumber,
      paymentStatus: 'pending',
      status: 'pending',
      email: cleanEmail,
      name: cleanName,
      phone: cleanPhone,
      address: {
        line1: args.address.line1.trim(),
        city: args.address.city.trim(),
        state: args.address.state.trim(),
        postalCode: cleanPostal,
      },
      items: orderItems,
      subtotal: calculatedSubtotal,
      shippingFee,
      total: grandTotal,
      userId,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    })

    return {
      orderId,
      orderNumber,
      subtotal: calculatedSubtotal,
      shippingFee,
      total: grandTotal,
      status: 'pending' as const,
      isDuplicate: false,
    }
  },
})

/**
 * Public query: Customer order tracking by orderNumber and email.
 * Returns safe public order tracking metadata without exposing internal details.
 */
export const trackOrder = query({
  args: {
    orderNumber: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanNum = args.orderNumber.trim().toUpperCase()
    const cleanMail = args.email.trim().toLowerCase()

    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', cleanNum))
      .unique()

    if (!order || order.email.toLowerCase() !== cleanMail) {
      return null
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus || 'pending',
      razorpayOrderId: order.razorpayOrderId,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      city: order.address.city,
      state: order.address.state,
      itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
      items: order.items.map((i) => ({
        name: i.productName,
        size: i.size,
        finish: i.finish,
        qty: i.quantity,
      })),
      total: order.total,
    }
  },
})

/**
 * Public Query: Authenticated customer order tracking with verification key.
 * Verifies either matching email address OR matching 6-digit PIN code.
 */
export const trackOrderVerified = query({
  args: {
    orderNumber: v.string(),
    verificationKey: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanNum = args.orderNumber.trim().toUpperCase()
    const cleanKey = args.verificationKey.trim().toLowerCase()

    const order = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', cleanNum))
      .unique()

    if (!order) return null

    const matchesEmail = order.email.toLowerCase() === cleanKey
    const matchesPin = order.address.postalCode.trim().toLowerCase() === cleanKey

    if (!matchesEmail && !matchesPin) {
      return null
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus || 'pending',
      razorpayOrderId: order.razorpayOrderId,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      city: order.address.city,
      state: order.address.state,
      postalCode: order.address.postalCode,
      line1: order.address.line1,
      itemCount: order.items.reduce((acc, item) => acc + item.quantity, 0),
      items: order.items.map((i) => ({
        name: i.productName,
        sku: i.productSku,
        size: i.size,
        finish: i.finish,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
    }
  },
})

/**
 * Customer Query: List authenticated user's orders.
 * Returns orders linked to the user's Clerk ID or checkout email.
 */
export const listMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const clerkId = identity.subject
    const email = (identity.email || '').trim().toLowerCase()

    const userOrders = await ctx.db
      .query('orders')
      .withIndex('by_user_id', (q) => q.eq('userId', clerkId))
      .collect()

    let emailOrders: Doc<'orders'>[] = []
    if (email) {
      emailOrders = await ctx.db
        .query('orders')
        .withIndex('by_email', (q) => q.eq('email', email))
        .collect()
    }

    // Merge and deduplicate by _id
    const orderMap = new Map<string, Doc<'orders'>>()
    for (const order of [...userOrders, ...emailOrders]) {
      orderMap.set(order._id, order)
    }

    return Array.from(orderMap.values()).sort((a, b) => b.createdAt - a.createdAt)
  },
})

/**
 * Customer Query: Get single order details with ownership verification.
 */
export const getMyOrderById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated: Please sign in.')

    const clerkId = identity.subject
    const email = (identity.email || '').trim().toLowerCase()

    const normalizedId = ctx.db.normalizeId('orders', args.id)
    let order: Doc<'orders'> | null = normalizedId ? await ctx.db.get(normalizedId) : null
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_order_number', (q) => q.eq('orderNumber', args.id))
        .first()
    }
    if (!order) {
      order = await ctx.db
        .query('orders')
        .withIndex('by_razorpay_order', (q) => q.eq('razorpayOrderId', args.id))
        .first()
    }
    if (!order) return null

    // Enforce ownership check
    const matchesUser = order.userId && order.userId === clerkId
    const matchesEmail = email && order.email.toLowerCase() === email
    if (!matchesUser && !matchesEmail) {
      throw new Error('Unauthorized: You do not have permission to view this order.')
    }

    return order
  },
})

/**
 * Public query: Get order by ID (e.g. for checkout status confirmation).
 */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args): Promise<Doc<'orders'> | null> => {
    const normalizedId = ctx.db.normalizeId('orders', args.id)
    if (normalizedId) {
      const order = await ctx.db.get(normalizedId)
      if (order) return order
    }
    const byNumber = await ctx.db
      .query('orders')
      .withIndex('by_order_number', (q) => q.eq('orderNumber', args.id))
      .first()
    if (byNumber) return byNumber

    return await ctx.db
      .query('orders')
      .withIndex('by_razorpay_order', (q) => q.eq('razorpayOrderId', args.id))
      .first()
  },
})

/**
 * Public query: Get order by Razorpay Order ID.
 */
export const getByRazorpayOrderId = query({
  args: { razorpayOrderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orders')
      .withIndex('by_razorpay_order', (q) =>
        q.eq('razorpayOrderId', args.razorpayOrderId)
      )
      .unique()
  },
})

/**
 * Protected Admin query: List all orders in reverse chronological order.
 */
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    return await ctx.db.query('orders').order('desc').collect()
  },
})

/**
 * Protected Admin mutation: Update order fulfillment status.
 */
export const adminUpdateStatus = mutation({
  args: {
    id: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('fulfilled'),
      v.literal('cancelled')
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    const normalizedId = ctx.db.normalizeId('orders', args.id)
    let existing: Doc<'orders'> | null = normalizedId ? await ctx.db.get(normalizedId) : null
    if (!existing) {
      existing = await ctx.db
        .query('orders')
        .withIndex('by_order_number', (q) => q.eq('orderNumber', args.id))
        .first()
    }
    if (!existing) {
      throw new Error('Order not found.')
    }

    await ctx.db.patch(existing._id, { status: args.status })
    return { success: true, newStatus: args.status }
  },
})

/**
 * Mutation: Mark order paid after verified payment or webhook event.
 * Enforces event idempotency via webhookEvents and prevents downgrading of settled orders.
 */
export const markPaid = mutation({
  args: {
    razorpayOrderId: v.string(),
    paymentId: v.string(),
    signature: v.optional(v.string()),
    eventId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Strict capture validation: If paymentStatus is provided and NOT 'captured', reject!
    if (args.paymentStatus && args.paymentStatus !== 'captured') {
      throw new Error(
        `Payment cannot be marked paid: payment status is '${args.paymentStatus}'. Authorized-only payments cannot mark order paid.`
      )
    }

    // 1. Idempotency check: if event was already successfully processed, return early
    if (args.eventId) {
      const existingEvent = await ctx.db
        .query('webhookEvents')
        .withIndex('by_event', (q) => q.eq('eventId', args.eventId!))
        .unique()

      if (existingEvent && existingEvent.status === 'processed') {
        return { success: true, duplicateEvent: true }
      }
    }

    // 2. Locate order by razorpayOrderId
    const order = await ctx.db
      .query('orders')
      .withIndex('by_razorpay_order', (q) =>
        q.eq('razorpayOrderId', args.razorpayOrderId)
      )
      .unique()

    if (!order) {
      throw new Error(`Order for Razorpay ID ${args.razorpayOrderId} not found.`)
    }

    // 3. Out-of-order protection: never downgrade paid/fulfilled order
    if (order.status === 'paid' || order.status === 'fulfilled') {
      if (args.eventId) {
        await ctx.db.insert('webhookEvents', {
          eventId: args.eventId,
          eventType: 'payment.captured',
          status: 'processed',
          processedAt: Date.now(),
        })
      }
      return { success: true, orderId: order._id, alreadyPaid: true }
    }

    const now = Date.now()
    const updatedAttempts = (order.paymentAttempts || []).map((att) =>
      att.razorpayOrderId === args.razorpayOrderId
        ? { ...att, status: 'paid' as const, razorpayPaymentId: args.paymentId }
        : att
    )

    // 4. Mark order as paid
    await ctx.db.patch(order._id, {
      status: 'paid',
      paymentStatus: 'paid',
      razorpayPaymentId: args.paymentId,
      razorpaySignature: args.signature,
      paidAt: now,
      paymentFailureReason: undefined,
      paymentAttempts: updatedAttempts,
    })

    // 5. Durably record processed event upon successful mutation
    if (args.eventId) {
      await ctx.db.insert('webhookEvents', {
        eventId: args.eventId,
        eventType: 'payment.captured',
        status: 'processed',
        processedAt: now,
      })
    }

    return { success: true, orderId: order._id, alreadyPaid: false }
  },
})
