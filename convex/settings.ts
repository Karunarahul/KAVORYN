import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAdminAuth } from './auth'

/**
 * Public query: Get active store settings (shipping thresholds, fees, currency).
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'store_config'))
      .unique()

    if (!config) {
      return {
        freeShippingThreshold: 499,
        standardShippingFee: 79,
        currency: 'INR',
      }
    }

    return {
      freeShippingThreshold: config.freeShippingThreshold,
      standardShippingFee: config.standardShippingFee,
      currency: config.currency,
    }
  },
})

/**
 * Protected Admin mutation: Update shipping thresholds and store settings.
 */
export const adminUpdate = mutation({
  args: {
    freeShippingThreshold: v.number(),
    standardShippingFee: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)

    if (args.freeShippingThreshold < 0 || args.standardShippingFee < 0) {
      throw new Error('Shipping values cannot be negative.')
    }

    const config = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'store_config'))
      .unique()

    if (config) {
      await ctx.db.patch(config._id, {
        freeShippingThreshold: args.freeShippingThreshold,
        standardShippingFee: args.standardShippingFee,
        updatedAt: Date.now(),
      })
    } else {
      await ctx.db.insert('settings', {
        key: 'store_config',
        freeShippingThreshold: args.freeShippingThreshold,
        standardShippingFee: args.standardShippingFee,
        currency: 'INR',
        updatedAt: Date.now(),
      })
    }

    return { success: true }
  },
})
