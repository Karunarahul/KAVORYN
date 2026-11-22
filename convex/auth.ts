import type { GenericMutationCtx, GenericQueryCtx } from 'convex/server'
import type { DataModel } from './_generated/dataModel'

/**
 * Super Admin Email Allowlist
 * Configurable via Convex environment variable SUPER_ADMIN_EMAILS
 */
export function getSuperAdminEmails(): string[] {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || ''
  const parsed = envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  // Default system bootstrap admin addresses
  if (!parsed.includes('karunarahul8885@gmail.com')) {
    parsed.push('karunarahul8885@gmail.com')
  }
  if (!parsed.includes('admin@kavoryn.com')) {
    parsed.push('admin@kavoryn.com')
  }
  return parsed
}

/**
 * Super Admin Verified Clerk User ID Allowlist
 * Configurable via Convex environment variable SUPER_ADMIN_CLERK_IDS
 */
export function getSuperAdminClerkIds(): string[] {
  const envIds = process.env.SUPER_ADMIN_CLERK_IDS || ''
  const parsed = envIds
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  // Permanent authorized Clerk User ID for karunarahul8885@gmail.com
  if (!parsed.includes('user_3MRF4pYoolWnkVAEHIjgvXc6VYs')) {
    parsed.push('user_3MRF4pYoolWnkVAEHIjgvXc6VYs')
  }
  return parsed
}

/**
 * Get the current user record from the database.
 * If user does not exist yet, returns a virtual record with the appropriate default role.
 */
export async function getCurrentUserRecord(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
): Promise<{
  identity: { subject: string; email?: string; name?: string }
  user: {
    clerkId: string
    email: string
    name?: string
    role: 'customer' | 'admin' | 'super_admin'
  }
} | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const clerkId = identity.subject
  const email = (identity.email || '').trim().toLowerCase()
  const name = identity.name || undefined

  const superEmails = getSuperAdminEmails()
  const superClerkIds = getSuperAdminClerkIds()
  const isAllowlistedSuper =
    (email && superEmails.includes(email)) || superClerkIds.includes(clerkId)

  if (!ctx.db) {
    const isAdminMock = !isAllowlistedSuper && (email.includes('admin') || email.includes('lead'))
    return {
      identity,
      user: {
        clerkId,
        email: email || (isAllowlistedSuper ? 'karunarahul8885@gmail.com' : ''),
        name,
        role: isAllowlistedSuper ? 'super_admin' : isAdminMock ? 'admin' : 'customer',
      },
    }
  }

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
    .first()

  if (existing) {
    const effectiveEmail =
      existing.email || email || (isAllowlistedSuper ? 'karunarahul8885@gmail.com' : '')
    const isEffectiveSuper =
      isAllowlistedSuper ||
      (effectiveEmail && superEmails.includes(effectiveEmail)) ||
      existing.role === 'super_admin'
    const effectiveRole = isEffectiveSuper ? 'super_admin' : existing.role

    return {
      identity,
      user: {
        clerkId: existing.clerkId,
        email: effectiveEmail,
        name: existing.name || name,
        role: effectiveRole,
      },
    }
  }

  // Not yet persisted in users table
  const defaultRole = isAllowlistedSuper ? 'super_admin' : 'customer'

  return {
    identity,
    user: {
      clerkId,
      email: email || (isAllowlistedSuper ? 'karunarahul8885@gmail.com' : ''),
      name,
      role: defaultRole,
    },
  }
}

/**
 * Requires authenticated user (Customer, Admin, or Super Admin).
 */
export async function requireCustomerAuth(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const result = await getCurrentUserRecord(ctx)
  if (!result) {
    throw new Error('Unauthorized: Authentication required.')
  }
  return result
}

/**
 * Requires Administrator privileges (Admin or Super Admin).
 * Strictly enforced on the server for all store mutations and admin views.
 */
export async function requireAdminAuth(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const result = await getCurrentUserRecord(ctx)
  if (!result) {
    throw new Error('Unauthorized: Authentication required.')
  }

  if (result.user.role !== 'admin' && result.user.role !== 'super_admin') {
    throw new Error(
      'Unauthorized: Access restricted to authenticated KAVORYN studio administrators.'
    )
  }

  return result.identity
}

/**
 * Requires Super Admin privileges.
 * Strictly enforced for user role management and access request approvals.
 */
export async function requireSuperAdminAuth(
  ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
  const result = await getCurrentUserRecord(ctx)
  if (!result) {
    throw new Error('Unauthorized: Authentication required.')
  }

  if (result.user.role !== 'super_admin') {
    throw new Error('Unauthorized: Super Admin privileges required.')
  }

  return result
}
