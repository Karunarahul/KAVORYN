import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import {
  getCurrentUserRecord,
  getSuperAdminEmails,
  requireCustomerAuth,
  requireSuperAdminAuth,
} from './auth'

/**
 * Public Query: Get current authenticated user profile and assigned role.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const record = await getCurrentUserRecord(ctx)
    if (!record) return null
    return record.user
  },
})

/**
 * Public Mutation: Sync or register Clerk user profile in Convex users table.
 * Defaults all new users to 'customer' unless their email is allowlisted for Super Admin.
 */
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated: Please sign in first.')

    const clerkId = identity.subject
    const email = (identity.email || '').trim().toLowerCase()
    const name = identity.name || undefined

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .first()

    const superEmails = getSuperAdminEmails()
    const isAllowlistedSuper = email && superEmails.includes(email)

    if (existing) {
      if (isAllowlistedSuper && existing.role !== 'super_admin') {
        await ctx.db.patch(existing._id, {
          role: 'super_admin',
          updatedAt: Date.now(),
        })
        return { ...existing, role: 'super_admin' as const }
      }
      return existing
    }

    const initialRole: 'super_admin' | 'customer' = isAllowlistedSuper ? 'super_admin' : 'customer'
    const newUserId = await ctx.db.insert('users', {
      clerkId,
      email,
      name,
      role: initialRole,
      createdAt: Date.now(),
    })

    if (initialRole === 'super_admin') {
      await ctx.db.insert('adminActivityLogs', {
        actorClerkId: clerkId,
        actorEmail: email,
        action: 'SUPER_ADMIN_BOOTSTRAP',
        targetId: clerkId,
        details: `Super Admin account initialized for ${email}`,
        timestamp: Date.now(),
      })
    }

    return {
      _id: newUserId,
      clerkId,
      email,
      name,
      role: initialRole,
      createdAt: Date.now(),
    }
  },
})

/**
 * Super Admin Mutation: Explicitly bootstrap the permanent Super Admin account.
 * Enforces server-side verification of Clerk JWT identity and verified primary email.
 * Idempotent: Can be called repeatedly without duplicating records or corrupting state.
 */
export const bootstrapSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Unauthenticated: Super Admin bootstrap requires active Clerk authentication.')
    }

    const clerkId = identity.subject
    const email = (identity.email || '').trim().toLowerCase()
    const name = identity.name || undefined

    const superEmails = getSuperAdminEmails()
    const isAuthorized = Boolean(email && superEmails.includes(email))

    if (!isAuthorized) {
      throw new Error(
        `Unauthorized: Identity '${email}' is not authorized for KAVORYN Super Admin privileges.`
      )
    }

    const now = Date.now()
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .first()

    if (existing) {
      if (existing.role !== 'super_admin') {
        await ctx.db.patch(existing._id, {
          role: 'super_admin',
          updatedAt: now,
        })
        await ctx.db.insert('adminActivityLogs', {
          actorClerkId: clerkId,
          actorEmail: email,
          action: 'SUPER_ADMIN_BOOTSTRAP',
          targetId: clerkId,
          details: `Permanent Super Admin role established for ${email}`,
          timestamp: now,
        })
      }
      return {
        success: true,
        clerkId,
        email,
        name: existing.name || name,
        role: 'super_admin' as const,
        bootstrapped: true,
        alreadyConfigured: true,
      }
    }

    const newId = await ctx.db.insert('users', {
      clerkId,
      email,
      name,
      role: 'super_admin',
      createdAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: clerkId,
      actorEmail: email,
      action: 'SUPER_ADMIN_BOOTSTRAP',
      targetId: clerkId,
      details: `Permanent Super Admin initialized for ${email} (${clerkId})`,
      timestamp: now,
    })

    return {
      success: true,
      clerkId,
      email,
      name,
      role: 'super_admin' as const,
      bootstrapped: true,
      userId: newId,
      alreadyConfigured: false,
    }
  },
})

/**
 * Public Query: Inspect the current Super Admin configuration status.
 * Returns safe metadata on whether Super Admin is registered.
 */
export const getSuperAdminBootstrapStatus = query({
  args: {},
  handler: async (ctx) => {
    const superAdmins = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'super_admin'))
      .collect()

    const allowlist = getSuperAdminEmails()

    return {
      isConfigured: superAdmins.length > 0,
      authorizedEmails: allowlist,
      registeredCount: superAdmins.length,
      superAdmins: superAdmins.map((sa) => ({
        email: sa.email,
        clerkId: sa.clerkId,
        createdAt: sa.createdAt,
      })),
    }
  },
})

/**
 * Super Admin Query: List all customers with their order history metrics.
 */
export const adminListCustomers = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminAuth(ctx)

    const allUsers = await ctx.db.query('users').collect()
    const allOrders = await ctx.db.query('orders').collect()

    return allUsers.map((u) => {
      const userOrders = allOrders.filter(
        (o) => (o.userId && o.userId === u.clerkId) || o.email.toLowerCase() === u.email.toLowerCase()
      )
      const paidOrders = userOrders.filter((o) => o.status === 'paid' || o.status === 'fulfilled')
      const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0)

      return {
        _id: u._id,
        clerkId: u.clerkId,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        totalOrders: userOrders.length,
        paidOrders: paidOrders.length,
        totalSpent,
      }
    })
  },
})

/**
 * Customer Mutation: Submit request for studio administrator access.
 */
export const requestAdminAccess = mutation({
  args: {
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireCustomerAuth(ctx)

    if (user.role === 'admin' || user.role === 'super_admin') {
      return { success: true, message: 'You already possess administrator privileges.' }
    }

    const cleanReason = args.reason.trim()
    if (cleanReason.length < 5) {
      throw new Error('Please provide a substantive reason (minimum 5 characters) for your request.')
    }

    // Check if user already has a pending request
    const existing = await ctx.db
      .query('adminRequests')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', user.clerkId))
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .first()

    if (existing) {
      throw new Error('You already have an administrator access request under review.')
    }

    const requestId = await ctx.db.insert('adminRequests', {
      clerkId: user.clerkId,
      email: user.email,
      name: user.name || identity.name || user.email,
      reason: cleanReason,
      status: 'pending',
      requestedAt: Date.now(),
    })

    return { success: true, requestId }
  },
})

/**
 * Customer Query: Get the current user's latest admin access request.
 */
export const getMyAdminRequest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query('adminRequests')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .order('desc')
      .first()
  },
})

/**
 * Super Admin Query: List all registered users and their current roles.
 */
export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminAuth(ctx)
    return await ctx.db.query('users').order('desc').collect()
  },
})

/**
 * Super Admin Query: List all pending and reviewed admin access requests.
 */
export const adminListRequests = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminAuth(ctx)
    return await ctx.db.query('adminRequests').order('desc').collect()
  },
})

/**
 * Super Admin Mutation: Review and approve/reject an admin access request.
 */
export const adminReviewRequest = mutation({
  args: {
    requestId: v.id('adminRequests'),
    action: v.union(v.literal('approve'), v.literal('reject')),
  },
  handler: async (ctx, args) => {
    const { user: reviewer } = await requireSuperAdminAuth(ctx)

    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'pending') {
      throw new Error(`Request has already been ${request.status}.`)
    }

    const now = Date.now()
    const newStatus = args.action === 'approve' ? ('approved' as const) : ('rejected' as const)

    await ctx.db.patch(args.requestId, {
      status: newStatus,
      reviewedAt: now,
      reviewedBy: reviewer.email,
    })

    // If approved, promote the user in the users table
    if (args.action === 'approve') {
      const targetUser = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', request.clerkId))
        .first()

      if (targetUser) {
        await ctx.db.patch(targetUser._id, {
          role: 'admin',
          updatedAt: now,
        })
      } else {
        await ctx.db.insert('users', {
          clerkId: request.clerkId,
          email: request.email,
          name: request.name,
          role: 'admin',
          createdAt: now,
        })
      }
    }

    // Log administrative action
    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: reviewer.clerkId,
      actorEmail: reviewer.email,
      action: args.action === 'approve' ? 'APPROVE_ADMIN_ACCESS' : 'REJECT_ADMIN_ACCESS',
      targetId: request.clerkId,
      details: `${reviewer.email} ${args.action}d admin access request for ${request.email}`,
      timestamp: now,
    })

    return { success: true, status: newStatus }
  },
})

/**
 * Super Admin Mutation: Promote, demote, or change any user's role.
 * Enforces prevention of self-demotion to avoid accidental Super Admin lockout.
 */
export const adminUpdateUserRole = mutation({
  args: {
    targetClerkId: v.string(),
    newRole: v.union(v.literal('customer'), v.literal('admin'), v.literal('super_admin')),
  },
  handler: async (ctx, args) => {
    const { user: reviewer } = await requireSuperAdminAuth(ctx)

    if (reviewer.clerkId === args.targetClerkId && args.newRole !== 'super_admin') {
      throw new Error('Self-demotion prevented: Super Admins cannot demote their own account.')
    }

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.targetClerkId))
      .first()

    if (!targetUser) throw new Error('Target user not found.')

    const oldRole = targetUser.role
    const now = Date.now()

    await ctx.db.patch(targetUser._id, {
      role: args.newRole,
      updatedAt: now,
    })

    // Log administrative action
    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: reviewer.clerkId,
      actorEmail: reviewer.email,
      action: 'UPDATE_USER_ROLE',
      targetId: targetUser.clerkId,
      details: `Role changed from '${oldRole}' to '${args.newRole}' for ${targetUser.email}`,
      timestamp: now,
    })

    return { success: true, oldRole, newRole: args.newRole }
  },
})

/**
 * Super Admin Query: Get recent administrative activity audit logs.
 */
export const adminGetActivityLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireSuperAdminAuth(ctx)
    return await ctx.db.query('adminActivityLogs').order('desc').take(100)
  },
})

/**
 * Customer Addresses Management:
 * Secure server-side address CRUD for customer profile.
 */
export const listMyAddresses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return await ctx.db
      .query('customerAddresses')
      .withIndex('by_user_id', (q) => q.eq('userId', identity.subject))
      .collect()
  },
})

export const saveAddress = mutation({
  args: {
    addressId: v.optional(v.id('customerAddresses')),
    name: v.string(),
    phone: v.string(),
    line1: v.string(),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireCustomerAuth(ctx)
    const now = Date.now()

    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existing = await ctx.db
        .query('customerAddresses')
        .withIndex('by_user_id', (q) => q.eq('userId', identity.subject))
        .collect()

      for (const addr of existing) {
        if (addr.isDefault) {
          await ctx.db.patch(addr._id, { isDefault: false })
        }
      }
    }

    if (args.addressId) {
      const existing = await ctx.db.get(args.addressId)
      if (!existing || existing.userId !== identity.subject) {
        throw new Error('Address not found or unauthorized.')
      }
      await ctx.db.patch(args.addressId, {
        name: args.name.trim(),
        phone: args.phone.trim(),
        line1: args.line1.trim(),
        city: args.city.trim(),
        state: args.state.trim(),
        postalCode: args.postalCode.trim(),
        isDefault: args.isDefault,
        updatedAt: now,
      })
      return { success: true, addressId: args.addressId }
    }

    const newId = await ctx.db.insert('customerAddresses', {
      userId: identity.subject,
      name: args.name.trim(),
      phone: args.phone.trim(),
      line1: args.line1.trim(),
      city: args.city.trim(),
      state: args.state.trim(),
      postalCode: args.postalCode.trim(),
      isDefault: args.isDefault,
      updatedAt: now,
    })

    return { success: true, addressId: newId }
  },
})
