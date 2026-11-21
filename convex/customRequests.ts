import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAdminAuth } from './auth'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Public mutation: Submit a custom 1-of-1 typographic poster brief.
 */
export const submit = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const cleanName = args.name.trim()
    if (cleanName.length < 2) {
      throw new Error('Name must be at least 2 characters.')
    }

    const cleanEmail = args.email.trim().toLowerCase()
    if (!EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Valid email address required for sending digital proofs.')
    }

    const cleanPhone = args.phone.trim()
    if (cleanPhone.length < 10) {
      throw new Error('Valid WhatsApp phone number required for design sign-off.')
    }

    const cleanText = args.customText.trim().toUpperCase()
    if (cleanText.length < 1 || cleanText.length > 100) {
      throw new Error('Poster text must be between 1 and 100 characters.')
    }

    const requestId = await ctx.db.insert('customRequests', {
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      customText: cleanText,
      palette: args.palette,
      size: args.size,
      notes: args.notes ? args.notes.trim() : undefined,
      status: 'pending',
      createdAt: Date.now(),
    })

    const referenceCode = `KVR-CR-${Date.now().toString(36).toUpperCase()}`

    return {
      success: true,
      requestId,
      referenceCode,
      status: 'pending' as const,
    }
  },
})

/**
 * Protected Admin query: List all custom requests.
 */
export const adminList = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    return await ctx.db.query('customRequests').order('desc').collect()
  },
})

/**
 * Protected Admin mutation: Update custom request status.
 */
export const adminUpdateStatus = mutation({
  args: {
    id: v.id('customRequests'),
    status: v.union(
      v.literal('pending'),
      v.literal('reviewed'),
      v.literal('proof_sent'),
      v.literal('approved'),
      v.literal('rejected')
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) {
      throw new Error('Custom request not found.')
    }

    await ctx.db.patch(args.id, { status: args.status })
    return { success: true, newStatus: args.status }
  },
})
