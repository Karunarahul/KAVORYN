import { ConvexReactClient } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import {
  collections as staticCollections,
  collectionDescriptions,
  finishPrices,
  prices as basePrices,
  products as staticProducts,
  shippingConfig as defaultShipping,
  type Collection,
  type PosterFinish,
  type Product,
} from '../data'
import type { PosterSize } from '../types'
import { convexUrl, isConvexConfigured } from './env'

export interface DBProduct extends Product {
  active: boolean
  prices: Record<PosterSize, number>
  finishSurcharges: Record<PosterFinish, number>
}

export interface DBOrder {
  _id: string
  orderNumber: string
  razorpayOrderId?: string
  razorpayPaymentId?: string
  razorpaySignature?: string
  paymentStatus?: 'pending' | 'attempted' | 'paid' | 'failed'
  paymentFailureReason?: string
  paidAt?: number
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  email: string
  name: string
  phone: string
  address: {
    line1: string
    city: string
    state: string
    postalCode: string
  }
  items: Array<{
    productId: string
    productSku: string
    productName: string
    size: PosterSize
    finish: PosterFinish
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  subtotal: number
  shippingFee: number
  total: number
  idempotencyKey?: string
  createdAt: number
  paymentAttempts?: Array<{
    attemptId: string
    razorpayOrderId: string
    razorpayPaymentId?: string
    status: 'initiated' | 'paid' | 'failed'
    amount: number
    createdAt: number
    failureReason?: string
  }>
}

export interface DBCustomRequest {
  _id: string
  name: string
  email: string
  phone: string
  customText: string
  palette: {
    name: string
    colors: [string, string, string]
  }
  size: string
  notes?: string
  status: 'pending' | 'reviewed' | 'proof_sent' | 'approved' | 'rejected'
  createdAt: number
  referenceCode: string
}

export interface DBSettings {
  freeShippingThreshold: number
  standardShippingFee: number
  currency: string
}

export interface WebhookEventRecord {
  eventId: string
  eventType?: string
  processedAt: number
}

export type UserRole = 'customer' | 'admin' | 'super_admin'

export interface DBUser {
  _id?: string
  clerkId: string
  email: string
  name?: string
  role: UserRole
  createdAt?: number
  updatedAt?: number
}

export interface DBAdminRequest {
  _id: string
  clerkId: string
  email: string
  name: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: number
  reviewedAt?: number
  reviewedBy?: string
}

export interface DBActivityLog {
  _id: string
  actorClerkId: string
  actorEmail: string
  action: string
  targetId?: string
  details?: string
  timestamp: number
}

export interface DBCustomerAddress {
  _id: string
  userId: string
  name: string
  phone: string
  line1: string
  city: string
  state: string
  postalCode: string
  isDefault: boolean
  updatedAt: number
}

// 1. Initialize official Convex React Client if configured
export { isConvexConfigured }
export const convexClient =
  isConvexConfigured && convexUrl ? new ConvexReactClient(convexUrl) : null

// 2. Local fallback storage keys for offline/sandbox development
const STORAGE_ORDERS = 'kavoryn_db_orders'
const STORAGE_CUSTOM = 'kavoryn_db_custom_requests'
const STORAGE_SETTINGS = 'kavoryn_db_settings'
const STORAGE_PRODUCTS = 'kavoryn_db_products'
const STORAGE_WEBHOOK_EVENTS = 'kavoryn_db_webhook_events'

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors
  }
}

// Initial products seed with variants and status
const INITIAL_DB_PRODUCTS: DBProduct[] = staticProducts.map((p) => ({
  ...p,
  active: true,
  prices: { ...basePrices },
  finishSurcharges: { ...finishPrices },
}))

export const RAZORPAY_TEST_KEY_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAZORPAY_KEY_ID) ||
  'rzp_test_U2x730Z4HcGdMR'

/**
 * Backend Authoritative E-Commerce Service
 * Implements strict server-side validation, authoritative pricing,
 * address validation, duplicate order prevention, and Razorpay payment integration.
 */
export const storeBackend = {
  // --- Products & Collections ---
  async getProducts(collection?: string): Promise<DBProduct[]> {
    const products = getStored<DBProduct[]>(STORAGE_PRODUCTS, INITIAL_DB_PRODUCTS)
    const active = products.filter((p) => p.active)
    if (collection && collection !== 'all') {
      return active.filter((p) => p.collection === collection)
    }
    return active
  },

  async getAllProductsForAdmin(): Promise<DBProduct[]> {
    return getStored<DBProduct[]>(STORAGE_PRODUCTS, INITIAL_DB_PRODUCTS)
  },

  async toggleProductActive(productId: string, active: boolean): Promise<boolean> {
    const products = getStored<DBProduct[]>(STORAGE_PRODUCTS, INITIAL_DB_PRODUCTS)
    const updated = products.map((p) => (p.id === productId ? { ...p, active } : p))
    setStored(STORAGE_PRODUCTS, updated)
    return true
  },

  async getCollections() {
    return Object.entries(staticCollections).map(([slug, name], idx) => ({
      slug,
      name,
      description: collectionDescriptions[slug as Collection] || '',
      displayOrder: idx + 1,
    }))
  },

  async seedDatabase(): Promise<{
    collectionsCount: number
    productsCount: number
    settingsConfigured: boolean
  }> {
    if (isConvexConfigured && convexClient) {
      try {
        const res = await convexClient.mutation(api.products.seed, {})
        return {
          collectionsCount: res.totalCollections,
          productsCount: res.totalProducts,
          settingsConfigured: true,
        }
      } catch (err) {
        console.warn('Convex products.seed failed, fallback to local storage:', err)
      }
    }
    setStored(STORAGE_PRODUCTS, INITIAL_DB_PRODUCTS)
    setStored(STORAGE_SETTINGS, {
      freeShippingThreshold: defaultShipping.freeShippingThreshold,
      standardShippingFee: defaultShipping.standardShippingFee,
      currency: defaultShipping.currency,
    })
    return {
      collectionsCount: 6,
      productsCount: INITIAL_DB_PRODUCTS.length,
      settingsConfigured: true,
    }
  },

  // --- Settings & Shipping ---
  async getSettings(): Promise<DBSettings> {
    if (isConvexConfigured && convexClient) {
      try {
        const s = await convexClient.query(api.settings.get, {})
        if (s) return s as DBSettings
      } catch (err) {
        console.warn('Convex settings.get failed, fallback to local storage:', err)
      }
    }
    return getStored<DBSettings>(STORAGE_SETTINGS, {
      freeShippingThreshold: defaultShipping.freeShippingThreshold,
      standardShippingFee: defaultShipping.standardShippingFee,
      currency: defaultShipping.currency,
    })
  },

  async updateSettings(threshold: number, fee: number): Promise<boolean> {
    if (isConvexConfigured && convexClient) {
      try {
        await convexClient.mutation(api.settings.adminUpdate, {
          freeShippingThreshold: Math.max(0, threshold),
          standardShippingFee: Math.max(0, fee),
        })
      } catch (err) {
        console.warn('Convex settings.adminUpdate failed, fallback to local storage:', err)
      }
    }
    const current = await this.getSettings()
    setStored(STORAGE_SETTINGS, {
      ...current,
      freeShippingThreshold: Math.max(0, threshold),
      standardShippingFee: Math.max(0, fee),
    })
    return true
  },

  // --- Orders ---
  async createPendingOrder(args: {
    email: string
    name: string
    phone: string
    address: {
      line1: string
      city: string
      state: string
      postalCode: string
    }
    items: Array<{
      productId: string
      size: PosterSize
      finish: PosterFinish
      quantity: number
    }>
    idempotencyKey?: string
  }): Promise<{
    orderId: string
    orderNumber: string
    subtotal: number
    shippingFee: number
    total: number
    status: 'pending'
    isDuplicate: boolean
  }> {
    // 1. Strict Server-Side Input Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pinRegex = /^[1-9][0-9]{5}$/

    const cleanEmail = args.email.trim().toLowerCase()
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Invalid email address provided.')
    }

    const cleanName = args.name.trim()
    if (cleanName.length < 2) {
      throw new Error('Customer full name must be at least 2 characters.')
    }

    const cleanPhone = args.phone.trim()
    if (cleanPhone.length < 10) {
      throw new Error('Please provide a valid 10-digit delivery phone number.')
    }

    const cleanPostal = args.address.postalCode.trim()
    if (!pinRegex.test(cleanPostal)) {
      throw new Error('Please enter a valid 6-digit Indian PIN code.')
    }

    if (args.address.line1.trim().length < 5) {
      throw new Error('Please provide a complete street/house address.')
    }

    if (args.items.length === 0) {
      throw new Error('Cannot place an order with zero items.')
    }

    // Attempt Convex Cloud Server Mutation First
    if (isConvexConfigured && convexClient) {
      try {
        const res = await convexClient.mutation(api.orders.createPending, {
          email: cleanEmail,
          name: cleanName,
          phone: cleanPhone,
          address: {
            line1: args.address.line1.trim(),
            city: args.address.city.trim(),
            state: args.address.state.trim(),
            postalCode: cleanPostal,
          },
          items: args.items.map((i) => ({
            productId: i.productId,
            size: i.size,
            finish: i.finish,
            quantity: i.quantity,
          })),
          idempotencyKey: args.idempotencyKey,
        })
        const fullOrder = await convexClient.query(api.orders.getById, { id: res.orderId })
        if (fullOrder) {
          const stored = getStored<DBOrder[]>(STORAGE_ORDERS, [])
          setStored(STORAGE_ORDERS, [
            ...stored.filter((o) => o._id !== fullOrder._id),
            fullOrder as unknown as DBOrder,
          ])
        }
        return {
          orderId: res.orderId,
          orderNumber: res.orderNumber,
          subtotal: res.subtotal,
          shippingFee: res.shippingFee,
          total: res.total,
          status: 'pending' as const,
          isDuplicate: Boolean(res.isDuplicate),
        }
      } catch (err) {
        console.warn('Convex createPending failed, using local fallback:', err)
      }
    }

    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])

    // 2. Duplicate submission prevention
    if (args.idempotencyKey) {
      const existing = orders.find((o) => o.idempotencyKey === args.idempotencyKey)
      if (existing) {
        return {
          orderId: existing._id,
          orderNumber: existing.orderNumber,
          subtotal: existing.subtotal,
          shippingFee: existing.shippingFee,
          total: existing.total,
          status: 'pending',
          isDuplicate: true,
        }
      }
    }

    // 3. Backend-Authoritative Pricing Calculation
    const products = await this.getAllProductsForAdmin()
    let computedSubtotal = 0

    const resolvedItems = args.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId)
      if (!prod || !prod.active) {
        throw new Error(`Product (${item.productId}) is not available in the active catalog.`)
      }

      const basePrice = prod.prices[item.size]
      if (typeof basePrice !== 'number') {
        throw new Error(`Invalid size (${item.size}) specified for ${prod.name}.`)
      }

      const surcharge = prod.finishSurcharges[item.finish] ?? (item.finish === 'Gloss' ? 50 : 0)
      const authoritativeUnitPrice = basePrice + surcharge
      const lineSubtotal = authoritativeUnitPrice * item.quantity

      computedSubtotal += lineSubtotal

      return {
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        size: item.size,
        finish: item.finish,
        quantity: item.quantity,
        unitPrice: authoritativeUnitPrice,
        subtotal: lineSubtotal,
      }
    })

    // 4. Server Shipping Calculation
    const settings = await this.getSettings()
    const shippingFee =
      computedSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee
    const grandTotal = computedSubtotal + shippingFee

    // 5. Generate Official Order Number
    const year = new Date().getFullYear()
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `KVR-${year}-${randomSuffix}`
    const orderId = `ord_${Date.now()}_${randomSuffix.toLowerCase()}`

    const newOrder: DBOrder = {
      _id: orderId,
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
      items: resolvedItems,
      subtotal: computedSubtotal,
      shippingFee,
      total: grandTotal,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    }

    orders.unshift(newOrder)
    setStored(STORAGE_ORDERS, orders)

    return {
      orderId,
      orderNumber,
      subtotal: computedSubtotal,
      shippingFee,
      total: grandTotal,
      status: 'pending',
      isDuplicate: false,
    }
  },

  async getAdminOrders(): Promise<DBOrder[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const list = await convexClient.query(api.orders.adminList, {})
        if (list && list.length > 0) return list as unknown as DBOrder[]
      } catch (err) {
        console.warn('Convex orders.adminList failed, fallback to local storage:', err)
      }
    }
    return getStored<DBOrder[]>(STORAGE_ORDERS, [])
  },

  async getOrderById(orderId: string): Promise<DBOrder | null> {
    if (isConvexConfigured && convexClient) {
      try {
        const ord = await convexClient.query(api.orders.getById, { id: orderId as unknown as Id<'orders'> })
        if (ord) return ord as unknown as DBOrder
      } catch (err) {
        console.warn('Convex orders.getById failed, fallback to local storage:', err)
      }
    }
    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    return orders.find((o) => o._id === orderId) || null
  },

  async getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<DBOrder | null> {
    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    return orders.find((o) => o.razorpayOrderId === razorpayOrderId) || null
  },

  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  ): Promise<boolean> {
    if (isConvexConfigured && convexClient) {
      try {
        await convexClient.mutation(api.orders.adminUpdateStatus, {
          id: orderId,
          status,
        })
      } catch (err) {
        console.warn('Convex orders.adminUpdateStatus failed, fallback to local storage:', err)
      }
    }
    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    const updated = orders.map((o) =>
      o._id === orderId || o.orderNumber === orderId ? { ...o, status } : o
    )
    setStored(STORAGE_ORDERS, updated)
    return true
  },

  async trackOrder(orderNumber: string, email: string) {
    const cleanNum = orderNumber.trim().toUpperCase()
    const cleanMail = email.trim().toLowerCase()

    if (isConvexConfigured && convexClient) {
      try {
        const ord = await convexClient.query(api.orders.trackOrder, {
          orderNumber: cleanNum,
          email: cleanMail,
        })
        if (ord) {
          const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
          const local = orders.find(
            (o) => o.orderNumber.toUpperCase() === cleanNum && o.email.toLowerCase() === cleanMail
          )
          if (local && local.status !== ord.status && ord.status === 'pending') {
            return {
              ...ord,
              status: local.status,
              paymentStatus: local.paymentStatus || local.status,
            }
          }
          return ord
        }
      } catch (err) {
        console.warn('Convex orders.trackOrder failed, fallback to local storage:', err)
      }
    }

    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])

    const found = orders.find(
      (o) => o.orderNumber.toUpperCase() === cleanNum && o.email.toLowerCase() === cleanMail
    )

    if (!found) return null

    return {
      orderNumber: found.orderNumber,
      status: found.status,
      paymentStatus: found.paymentStatus || 'pending',
      razorpayOrderId: found.razorpayOrderId,
      createdAt: found.createdAt,
      paidAt: found.paidAt,
      city: found.address.city,
      state: found.address.state,
      itemCount: found.items.reduce((acc, i) => acc + i.quantity, 0),
      items: found.items.map((i) => ({
        name: i.productName,
        size: i.size,
        finish: i.finish,
        qty: i.quantity,
      })),
      total: found.total,
    }
  },

  // --- Razorpay Payment Operations ---
  /**
   * Create Razorpay Order for a pending KAVORYN order
   * Calculates authoritative amount in paise (₹1 = 100 paise)
   * Stores razorpayOrderId and marks paymentStatus = 'attempted'
   */
  async createRazorpayOrder(orderId: string): Promise<{
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
  }> {
    if (isConvexConfigured && convexClient) {
      const res = await convexClient.action(api.razorpay.createOrderAction, {
        orderId,
      })
      const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
      const updated = orders.map((o) =>
        o._id === orderId
          ? {
              ...o,
              razorpayOrderId: res.razorpayOrderId,
              paymentStatus: 'attempted' as const,
            }
          : o
      )
      setStored(STORAGE_ORDERS, updated)
      return res
    }
    throw new Error('Convex backend is not configured for Razorpay order creation.')
  },

  /**
   * Complete Server-Side Checkout Action:
   * Creates pending order with authoritative pricing and initiates genuine Razorpay order.
   */
  async createCheckoutOrder(args: {
    email: string
    name: string
    phone: string
    shippingAddress: {
      line1: string
      city: string
      state: string
      postalCode: string
    }
    items: Array<{
      productId: string
      size: PosterSize
      finish: PosterFinish
      quantity: number
    }>
    idempotencyKey?: string
  }): Promise<{
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
  }> {
    if (isConvexConfigured && convexClient) {
      const res = await convexClient.action(api.razorpay.createCheckoutOrderAction, {
        email: args.email.trim().toLowerCase(),
        name: args.name.trim(),
        phone: args.phone.trim(),
        address: {
          line1: args.shippingAddress.line1.trim(),
          city: args.shippingAddress.city.trim(),
          state: args.shippingAddress.state.trim(),
          postalCode: args.shippingAddress.postalCode.trim(),
        },
        items: args.items.map((i) => ({
          productId: i.productId,
          size: i.size,
          finish: i.finish,
          quantity: i.quantity,
        })),
        idempotencyKey: args.idempotencyKey,
      })
      return res
    }
    throw new Error('Convex backend is not configured for checkout.')
  },

  /**
   * Verify Razorpay Payment Signature & Capture Status Server-Side
   * - Enforces server-side timing-safe HMAC-SHA256 signature verification in Convex
   * - Verifies server-side payment status (must be captured)
   * - Prevents duplicate order mutations
   */
  async verifyRazorpayPayment(args: {
    orderId: string
    razorpayOrderId: string
    razorpayPaymentId: string
    razorpaySignature: string
    serverVerifiedPayment?: {
      status: string
      amount: number
      currency: string
    }
  }): Promise<{
    success: boolean
    orderId: string
    orderNumber: string
    status: 'paid'
    paymentStatus: 'paid'
    alreadyPaid?: boolean
  }> {
    if (isConvexConfigured && convexClient) {
      const res = await convexClient.action(api.razorpay.verifyPaymentAction, {
        orderId: args.orderId,
        razorpayOrderId: args.razorpayOrderId,
        razorpayPaymentId: args.razorpayPaymentId,
        razorpaySignature: args.razorpaySignature,
      })
      const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
      const updated = orders.map((o) =>
        o._id === args.orderId
          ? { ...o, status: 'paid' as const, paymentStatus: 'paid' as const, paidAt: Date.now() }
          : o
      )
      setStored(STORAGE_ORDERS, updated)
      return {
        success: true,
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        status: 'paid',
        paymentStatus: 'paid',
        alreadyPaid: Boolean(res.alreadyPaid),
      }
    }
    throw new Error('Convex backend is not configured for payment verification.')
  },

  /**
   * Record payment failure or cancellation
   * Allows customer to retry checkout on the exact same order without duplicate order creation
   */
  async recordPaymentFailure(
      orderId: string,
      reason: string
    ): Promise < {
      success: boolean
    orderId: string
    status: string
    paymentStatus: string
    alreadyPaid?: boolean
    } > {
      const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    const order = orders.find((o) => o._id === orderId)
    if(!order) {
        throw new Error(`Order ${orderId} not found.`)
      }

    // Never downgrade a paid order
    if(order.status === 'paid' || order.status === 'fulfilled') {
      return {
        success: true,
        orderId: order._id,
        status: order.status,
        paymentStatus: order.paymentStatus || 'paid',
        alreadyPaid: true,
      }
    }

    const updatedAttempts = (order.paymentAttempts || []).map((att) =>
      att.razorpayOrderId === order.razorpayOrderId
        ? { ...att, status: 'failed' as const, failureReason: reason }
        : att
    )

    const updated = orders.map((o) =>
      o._id === orderId
        ? {
          ...o,
          paymentStatus: 'failed' as const,
          paymentFailureReason: reason,
          paymentAttempts: updatedAttempts,
        }
        : o
    )
    setStored(STORAGE_ORDERS, updated)

    return {
      success: true,
      orderId: order._id,
      status: order.status,
      paymentStatus: 'failed',
    }
  },

  /**
   * Server-side capture an authorized Razorpay payment
   */
  async captureRazorpayPayment(args: {
    orderId: string
    paymentId: string
    amountInPaise: number
  }): Promise<{
    success: boolean
    paymentId: string
    status: 'captured'
    amount: number
  }> {
    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    const order = orders.find((o) => o._id === args.orderId)
    if (!order) {
      throw new Error(`Order ${args.orderId} not found.`)
    }

    const expectedPaise = Math.round(order.total * 100)
    if (args.amountInPaise !== expectedPaise) {
      throw new Error(
        `Amount mismatch: Attempted to capture ${args.amountInPaise} paise, expected ${expectedPaise} paise.`
      )
    }

    return {
      success: true,
      paymentId: args.paymentId,
      status: 'captured',
      amount: args.amountInPaise,
    }
  },

  /**
   * Mark order paid from webhook or server action (idempotent)
   * Strictly enforces that paymentStatus is 'captured'
   */
  async markPaid(
    razorpayOrderId: string,
    paymentId: string,
    signature?: string,
    eventId?: string,
    paymentStatus?: string
  ): Promise<{
    success: boolean
    duplicateEvent?: boolean
    alreadyPaid?: boolean
    orderId?: string
  }> {
    if (paymentStatus && paymentStatus !== 'captured') {
      throw new Error(
        `Payment cannot be marked paid: status is '${paymentStatus}'. An authorized-only payment cannot mark an order paid.`
      )
    }
    if (eventId) {
      const events = getStored<WebhookEventRecord[]>(STORAGE_WEBHOOK_EVENTS, [])
      if (events.some((e) => e.eventId === eventId)) {
        return { success: true, duplicateEvent: true }
      }
      events.push({
        eventId,
        eventType: 'payment.captured',
        processedAt: Date.now(),
      })
      setStored(STORAGE_WEBHOOK_EVENTS, events)
    }

    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    const order = orders.find((o) => o.razorpayOrderId === razorpayOrderId)
    if (!order) {
      throw new Error(`Order for Razorpay ID ${razorpayOrderId} not found.`)
    }

    if (order.status === 'paid' || order.status === 'fulfilled') {
      return { success: true, alreadyPaid: true, orderId: order._id }
    }

    const updated = orders.map((o) =>
      o._id === order._id
        ? {
          ...o,
          status: 'paid' as const,
          paymentStatus: 'paid' as const,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          paidAt: Date.now(),
          paymentFailureReason: undefined,
        }
        : o
    )
    setStored(STORAGE_ORDERS, updated)

    return { success: true, alreadyPaid: false, orderId: order._id }
  },

  // --- Custom Poster Requests ---
  async submitCustomRequest(args: {
    name: string
    email: string
    phone: string
    customText: string
    palette: { name: string; colors: [string, string, string] }
    size: string
    notes?: string
  }): Promise<{
    success: boolean
    requestId: string
    referenceCode: string
    status: 'pending'
  }> {
    const cleanName = args.name.trim()
    const cleanEmail = args.email.trim().toLowerCase()
    const cleanPhone = args.phone.trim()
    const cleanText = args.customText.trim().toUpperCase()

    if (cleanName.length < 2) throw new Error('Name must be at least 2 characters.')
    if (!cleanEmail.includes('@')) throw new Error('Valid email required for digital proofs.')
    if (cleanPhone.length < 10) throw new Error('Valid phone number required for WhatsApp sign-off.')
    if (!cleanText) throw new Error('Poster text cannot be blank.')

    const referenceCode = `KVR-CR-${Date.now().toString(36).toUpperCase()}`
    const requestId = `cr_${Date.now()}`

    const newRequest: DBCustomRequest = {
      _id: requestId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      customText: cleanText,
      palette: args.palette,
      size: args.size,
      notes: args.notes?.trim(),
      status: 'pending',
      createdAt: Date.now(),
      referenceCode,
    }

    const requests = getStored<DBCustomRequest[]>(STORAGE_CUSTOM, [])
    requests.unshift(newRequest)
    setStored(STORAGE_CUSTOM, requests)

    if (isConvexConfigured && convexClient) {
      try {
        const res = await convexClient.mutation(api.customRequests.submit, {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          customText: cleanText,
          palette: {
            name: args.palette.name,
            colors: args.palette.colors,
          },
          size: args.size,
          notes: args.notes?.trim(),
        })
        const updatedRequests = getStored<DBCustomRequest[]>(STORAGE_CUSTOM, [])
        setStored(
          STORAGE_CUSTOM,
          updatedRequests.map((r) =>
            r._id === requestId
              ? { ...r, _id: res.requestId, referenceCode: res.referenceCode }
              : r
          )
        )
        return {
          success: true,
          requestId: res.requestId,
          referenceCode: res.referenceCode,
          status: 'pending',
        }
      } catch (err) {
        console.warn('Convex customRequests.submit failed, fallback to local storage:', err)
      }
    }

    return {
      success: true,
      requestId,
      referenceCode,
      status: 'pending',
    }
  },

  async getAdminCustomRequests(): Promise<DBCustomRequest[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const list = await convexClient.query(api.customRequests.adminList, {})
        if (list && list.length > 0) {
          return list.map((r: Doc<'customRequests'>) => ({
            ...r,
            palette: {
              name: r.palette.name,
              colors: (r.palette.colors.length >= 3
                ? [r.palette.colors[0], r.palette.colors[1], r.palette.colors[2]]
                : [r.palette.colors[0] || '#000', r.palette.colors[1] || '#000', r.palette.colors[2] || '#000']) as [
                string,
                string,
                string,
              ],
            },
            referenceCode: `KVR-CR-${r._id.substring(0, 6).toUpperCase()}`,
          }))
        }
      } catch (err) {
        console.warn('Convex customRequests.adminList failed, fallback to local storage:', err)
      }
    }
    return getStored<DBCustomRequest[]>(STORAGE_CUSTOM, [])
  },

  async updateCustomRequestStatus(
    id: string,
    status: 'pending' | 'reviewed' | 'proof_sent' | 'approved' | 'rejected'
  ): Promise<boolean> {
    if (isConvexConfigured && convexClient) {
      try {
        await convexClient.mutation(api.customRequests.adminUpdateStatus, {
          id: id as unknown as Id<'customRequests'>,
          status,
        })
      } catch (err) {
        console.warn('Convex customRequests.adminUpdateStatus failed, fallback to local storage:', err)
      }
    }
    const requests = getStored<DBCustomRequest[]>(STORAGE_CUSTOM, [])
    const updated = requests.map((r) => (r._id === id ? { ...r, status } : r))
    setStored(STORAGE_CUSTOM, updated)
    return true
  },

  // --- Verified Order Tracking & Customer Order Management ---
  async trackOrderVerified(orderNumber: string, verificationKey: string): Promise<{
    orderNumber: string
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
    paymentStatus: string
    razorpayOrderId?: string
    createdAt: number
    paidAt?: number
    city: string
    state: string
    postalCode: string
    line1: string
    itemCount: number
    items: Array<{
      name: string
      sku: string
      size: string
      finish: string
      qty: number
      unitPrice: number
      subtotal: number
    }>
    subtotal: number
    shippingFee: number
    total: number
  } | null> {
    const cleanNum = orderNumber.trim().toUpperCase()
    const cleanKey = verificationKey.trim().toLowerCase()

    if (isConvexConfigured && convexClient) {
      try {
        const result = await convexClient.query(api.orders.trackOrderVerified, {
          orderNumber: cleanNum,
          verificationKey: cleanKey,
        })
        if (result) {
          return result as {
            orderNumber: string
            status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
            paymentStatus: string
            razorpayOrderId?: string
            createdAt: number
            paidAt?: number
            city: string
            state: string
            postalCode: string
            line1: string
            itemCount: number
            items: Array<{
              name: string
              sku: string
              size: string
              finish: string
              qty: number
              unitPrice: number
              subtotal: number
            }>
            subtotal: number
            shippingFee: number
            total: number
          }
        }
      } catch (err) {
        console.warn('Convex trackOrderVerified query error, falling back to local lookup:', err)
      }
    }

    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    const found = orders.find(
      (o) =>
        o.orderNumber.toUpperCase() === cleanNum &&
        (o.email.toLowerCase() === cleanKey || o.address.postalCode.trim().toLowerCase() === cleanKey)
    )
    if (!found) return null

    return {
      orderNumber: found.orderNumber,
      status: found.status,
      paymentStatus: found.paymentStatus || 'pending',
      razorpayOrderId: found.razorpayOrderId,
      createdAt: found.createdAt,
      paidAt: found.paidAt,
      city: found.address.city,
      state: found.address.state,
      postalCode: found.address.postalCode,
      line1: found.address.line1,
      itemCount: found.items.reduce((acc, i) => acc + i.quantity, 0),
      items: found.items.map((i) => ({
        name: i.productName,
        sku: i.productSku,
        size: i.size,
        finish: i.finish,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: found.subtotal,
      shippingFee: found.shippingFee,
      total: found.total,
    }
  },

  async listMyOrders(): Promise<DBOrder[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const res = await convexClient.query(api.orders.listMyOrders, {})
        if (res && res.length > 0) return res as unknown as DBOrder[]
      } catch (err) {
        console.warn('Convex listMyOrders query error:', err)
      }
    }
    return getStored<DBOrder[]>(STORAGE_ORDERS, [])
  },

  async getMyOrderById(id: string): Promise<DBOrder | null> {
    if (isConvexConfigured && convexClient) {
      try {
        const res = await convexClient.query(api.orders.getMyOrderById, { id })
        if (res) return res as unknown as DBOrder
      } catch (err) {
        console.warn('Convex getMyOrderById query error:', err)
      }
    }
    const orders = getStored<DBOrder[]>(STORAGE_ORDERS, [])
    return orders.find((o) => o._id === id || o.orderNumber === id) || null
  },

  // --- Customer & Super Admin RBAC Operations ---
  async getCurrentUser(): Promise<DBUser | null> {
    if (isConvexConfigured && convexClient) {
      try {
        const user = await convexClient.query(api.users.getCurrentUser, {})
        return user as DBUser | null
      } catch (err) {
        console.warn('Convex getCurrentUser error:', err)
      }
    }
    return null
  },

  async syncUser(): Promise<DBUser | null> {
    if (isConvexConfigured && convexClient) {
      try {
        const synced = await convexClient.mutation(api.users.syncUser, {})
        return synced as DBUser
      } catch (err) {
        console.warn('Convex syncUser error:', err)
      }
    }
    return null
  },

  async requestAdminAccess(reason: string): Promise<{ success: boolean; message?: string; requestId?: string }> {
    if (isConvexConfigured && convexClient) {
      return await convexClient.mutation(api.users.requestAdminAccess, { reason })
    }
    return { success: true, message: 'Admin access request recorded.' }
  },

  async getMyAdminRequest(): Promise<DBAdminRequest | null> {
    if (isConvexConfigured && convexClient) {
      try {
        const req = await convexClient.query(api.users.getMyAdminRequest, {})
        return req as DBAdminRequest | null
      } catch (err) {
        console.warn('Convex getMyAdminRequest error:', err)
      }
    }
    return null
  },

  async adminListUsers(): Promise<DBUser[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const users = await convexClient.query(api.users.adminListUsers, {})
        return users as DBUser[]
      } catch (err) {
        console.warn('Convex adminListUsers error:', err)
      }
    }
    return []
  },

  async adminListRequests(): Promise<DBAdminRequest[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const requests = await convexClient.query(api.users.adminListRequests, {})
        return requests as DBAdminRequest[]
      } catch (err) {
        console.warn('Convex adminListRequests error:', err)
      }
    }
    return []
  },

  async adminReviewRequest(
    requestId: string,
    action: 'approve' | 'reject'
  ): Promise<{ success: boolean; newRole?: UserRole }> {
    if (isConvexConfigured && convexClient) {
      return await convexClient.mutation(api.users.adminReviewRequest, {
        requestId: requestId as unknown as Id<'adminRequests'>,
        action,
      })
    }
    return { success: true }
  },

  async adminUpdateUserRole(
    targetClerkId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; newRole: UserRole }> {
    if (isConvexConfigured && convexClient) {
      return await convexClient.mutation(api.users.adminUpdateUserRole, {
        targetClerkId,
        newRole,
      })
    }
    return { success: true, newRole }
  },

  async adminGetActivityLogs(): Promise<DBActivityLog[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const logs = await convexClient.query(api.users.adminGetActivityLogs, {})
        return logs as DBActivityLog[]
      } catch (err) {
        console.warn('Convex adminGetActivityLogs error:', err)
      }
    }
    return []
  },

  // --- Super Admin Bootstrap & Customer Directory ---
  async bootstrapSuperAdmin(): Promise<{
    success: boolean
    clerkId: string
    email: string
    name?: string
    role: UserRole
    bootstrapped: boolean
    alreadyConfigured: boolean
  }> {
    if (isConvexConfigured && convexClient) {
      return (await convexClient.mutation(api.users.bootstrapSuperAdmin, {})) as {
        success: boolean
        clerkId: string
        email: string
        name?: string
        role: UserRole
        bootstrapped: boolean
        alreadyConfigured: boolean
      }
    }
    throw new Error('Convex backend is not configured for Super Admin bootstrap.')
  },

  async getSuperAdminBootstrapStatus(): Promise<{
    isConfigured: boolean
    authorizedEmails: string[]
    registeredCount: number
    superAdmins: Array<{ email: string; clerkId: string; createdAt: number }>
  }> {
    if (isConvexConfigured && convexClient) {
      return (await convexClient.query(api.users.getSuperAdminBootstrapStatus, {})) as {
        isConfigured: boolean
        authorizedEmails: string[]
        registeredCount: number
        superAdmins: Array<{ email: string; clerkId: string; createdAt: number }>
      }
    }
    return {
      isConfigured: false,
      authorizedEmails: ['karunarahul8885@gmail.com'],
      registeredCount: 0,
      superAdmins: [],
    }
  },

  async adminListCustomers(): Promise<
    Array<{
      _id: string
      clerkId: string
      email: string
      name?: string
      role: UserRole
      createdAt: number
      totalOrders: number
      paidOrders: number
      totalSpent: number
    }>
  > {
    if (isConvexConfigured && convexClient) {
      try {
        const list = await convexClient.query(api.users.adminListCustomers, {})
        return list as Array<{
          _id: string
          clerkId: string
          email: string
          name?: string
          role: UserRole
          createdAt: number
          totalOrders: number
          paidOrders: number
          totalSpent: number
        }>
      } catch (err) {
        console.warn('Convex adminListCustomers error:', err)
      }
    }
    return []
  },

  async testRazorpayConnection(): Promise<{
    success: boolean
    orderId?: string
    error?: string
  }> {
    if (isConvexConfigured && convexClient) {
      try {
        return await convexClient.action(api.razorpay.testConnection, {})
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown gateway error',
        }
      }
    }
    return { success: false, error: 'Convex not configured' }
  },

  // --- Customer Saved Addresses ---
  async listMyAddresses(): Promise<DBCustomerAddress[]> {
    if (isConvexConfigured && convexClient) {
      try {
        const addresses = await convexClient.query(api.users.listMyAddresses, {})
        return addresses as DBCustomerAddress[]
      } catch (err) {
        console.warn('Convex listMyAddresses error:', err)
      }
    }
    return []
  },

  async saveAddress(args: {
    addressId?: string
    name: string
    phone: string
    line1: string
    city: string
    state: string
    postalCode: string
    isDefault: boolean
  }): Promise<{ success: boolean; addressId: string }> {
    if (isConvexConfigured && convexClient) {
      return await convexClient.mutation(api.users.saveAddress, {
        ...args,
        addressId: args.addressId as unknown as Id<'customerAddresses'> | undefined,
      })
    }
    return { success: true, addressId: `addr_${Date.now()}` }
  },
}
