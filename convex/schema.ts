import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  collections: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    displayOrder: v.number(),
  }).index('by_slug', ['slug']),

  products: defineTable({
    slug: v.string(),
    sku: v.string(),
    name: v.string(),
    collection: v.string(),
    description: v.string(),
    colors: v.array(v.string()),
    motif: v.string(),
    active: v.boolean(),
    prices: v.object({
      A4: v.number(),
      A3: v.number(),
      A2: v.number(),
      A1: v.number(),
    }),
    finishSurcharges: v.optional(
      v.object({
        Matte: v.number(),
        Gloss: v.number(),
      })
    ),
  })
    .index('by_slug', ['slug'])
    .index('by_sku', ['sku'])
    .index('by_collection', ['collection']),

  orders: defineTable({
    orderNumber: v.string(),
    razorpayOrderId: v.optional(v.string()),
    razorpayPaymentId: v.optional(v.string()),
    razorpaySignature: v.optional(v.string()),
    paymentStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('attempted'),
        v.literal('paid'),
        v.literal('failed')
      )
    ),
    paymentFailureReason: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('fulfilled'),
      v.literal('cancelled')
    ),
    paymentAttempts: v.optional(
      v.array(
        v.object({
          attemptId: v.string(),
          razorpayOrderId: v.string(),
          razorpayPaymentId: v.optional(v.string()),
          status: v.union(v.literal('initiated'), v.literal('paid'), v.literal('failed')),
          amount: v.number(),
          createdAt: v.number(),
          failureReason: v.optional(v.string()),
        })
      )
    ),
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
        productId: v.union(v.id('products'), v.string()),
        productSku: v.string(),
        productName: v.string(),
        size: v.string(),
        finish: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        subtotal: v.number(),
      })
    ),
    subtotal: v.number(),
    shippingFee: v.number(),
    total: v.number(),
    userId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_order_number', ['orderNumber'])
    .index('by_razorpay_order', ['razorpayOrderId'])
    .index('by_idempotency', ['idempotencyKey'])
    .index('by_user_id', ['userId'])
    .index('by_email', ['email']),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.union(v.literal('customer'), v.literal('admin'), v.literal('super_admin')),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_email', ['email'])
    .index('by_role', ['role']),

  adminRequests: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    reason: v.string(),
    status: v.union(v.literal('pending'), v.literal('approved'), v.literal('rejected')),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('by_status', ['status']),

  adminActivityLogs: defineTable({
    actorClerkId: v.string(),
    actorEmail: v.string(),
    action: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp']),

  customerAddresses: defineTable({
    userId: v.string(),
    name: v.string(),
    phone: v.string(),
    line1: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    isDefault: v.boolean(),
    updatedAt: v.number(),
  }).index('by_user_id', ['userId']),

  customRequests: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    customText: v.string(),
    palette: v.object({
      name: v.string(),
      colors: v.array(v.string()),
    }),
    size: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('proof_sent'),
      v.literal('approved'),
      v.literal('rejected')
    ),
    createdAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt']),

  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.optional(v.string()),
    status: v.optional(v.union(v.literal('processing'), v.literal('processed'), v.literal('failed'))),
    processedAt: v.number(),
  }).index('by_event', ['eventId']),

  settings: defineTable({
    key: v.string(),
    freeShippingThreshold: v.number(),
    standardShippingFee: v.number(),
    currency: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
})
