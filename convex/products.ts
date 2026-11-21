import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAdminAuth } from './auth'

const INITIAL_COLLECTIONS = [
  {
    slug: 'form',
    name: 'FORM',
    description: 'Exercises in balance, bold geometry, and electric negative space.',
    displayOrder: 1,
  },
  {
    slug: 'frame',
    name: 'FRAME',
    description: 'Cinematic visual moments captured between stillness and light.',
    displayOrder: 2,
  },
  {
    slug: 'type',
    name: 'TYPE',
    description: 'Typographic manifestos typeset for rooms with an opinion.',
    displayOrder: 3,
  },
  {
    slug: 'elsewhere',
    name: 'ELSEWHERE',
    description: 'Atmospheric gradients and palettes drawn from distant coastlines.',
    displayOrder: 4,
  },
  {
    slug: 'organic',
    name: 'ORGANIC',
    description: 'Earthy structures where brutalist lines meet biophilic growth.',
    displayOrder: 5,
  },
  {
    slug: 'personal',
    name: 'PERSONAL',
    description: 'Custom typographic prints with your own words and thoughts.',
    displayOrder: 6,
  },
]

const INITIAL_PRODUCTS = [
  {
    slug: 'shape-language',
    sku: 'KVR-FOR-001',
    name: 'Shape Language',
    collection: 'form',
    description: 'An exercise in balance, form, and electric negative space.',
    colors: ['#3155E7', '#D6F04A', '#F5F1E8'],
    motif: 'circle',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'the-blue-dimension',
    sku: 'KVR-FOR-002',
    name: 'The Blue Dimension',
    collection: 'form',
    description: 'A cobalt field where geometry slips out of frame.',
    colors: ['#3155E7', '#171717', '#F5F1E8'],
    motif: 'grid',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'organic-disorder',
    sku: 'KVR-FOR-003',
    name: 'Organic Disorder',
    collection: 'form',
    description: 'Rough shapes, imperfect systems, beautiful friction.',
    colors: ['#F05A3A', '#D6F04A', '#171717'],
    motif: 'wave',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'after-hours',
    sku: 'KVR-CIN-001',
    name: 'After Hours',
    collection: 'frame',
    description: 'A cinematic quiet after the city has emptied.',
    colors: ['#171717', '#F05A3A', '#3155E7'],
    motif: 'window',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'the-last-light',
    sku: 'KVR-CIN-004',
    name: 'The Last Light',
    collection: 'frame',
    description: 'The final flare of an unrepeatable day.',
    colors: ['#F05A3A', '#F5F1E8', '#171717'],
    motif: 'sun',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'make-it-matter',
    sku: 'KVR-TYP-001',
    name: 'Make It Matter',
    collection: 'type',
    description: 'A daily visual note to choose intent.',
    colors: ['#D6F04A', '#171717', '#3155E7'],
    motif: 'type',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'less-ordinary',
    sku: 'KVR-TYP-002',
    name: 'Less Ordinary',
    collection: 'type',
    description: 'For rooms that refuse the expected.',
    colors: ['#F5F1E8', '#3155E7', '#F05A3A'],
    motif: 'type',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'create-anyway',
    sku: 'KVR-TYP-004',
    name: 'Create Anyway',
    collection: 'type',
    description: 'A stubborn little manifesto in poster form.',
    colors: ['#F05A3A', '#171717', '#D6F04A'],
    motif: 'type',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'coastal-state',
    sku: 'KVR-ELS-002',
    name: 'Coastal State',
    collection: 'elsewhere',
    description: 'Salt-air palettes for a slower state of mind.',
    colors: ['#3155E7', '#D6F04A', '#F5F1E8'],
    motif: 'wave',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'wild-geometry',
    sku: 'KVR-ORG-001',
    name: 'Wild Geometry',
    collection: 'organic',
    description: 'Where sharp edges learn to grow.',
    colors: ['#D6F04A', '#171717', '#F05A3A'],
    motif: 'leaf',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'quiet-earth',
    sku: 'KVR-ORG-003',
    name: 'Quiet Earth',
    collection: 'organic',
    description: 'A grounding composition of warm matter.',
    colors: ['#F05A3A', '#F5F1E8', '#171717'],
    motif: 'sun',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
  {
    slug: 'your-name',
    sku: 'KVR-PER-001',
    name: 'Your Name',
    collection: 'personal',
    description: 'Your words, typeset for your wall.',
    colors: ['#3155E7', '#F5F1E8', '#D6F04A'],
    motif: 'type',
    active: true,
    prices: { A4: 149, A3: 249, A2: 399, A1: 699 },
    finishSurcharges: { Matte: 0, Gloss: 50 },
  },
]

/**
 * Public query: List all active products, optionally filtered by collection slug.
 */
export const list = query({
  args: {
    collection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = args.collection && args.collection !== 'all'
      ? await ctx.db
          .query('products')
          .withIndex('by_collection', (qb) => qb.eq('collection', args.collection!))
          .collect()
      : await ctx.db.query('products').collect()

    return items.filter((p) => p.active)
  },
})

/**
 * Public query: Get a single product by its slug.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

/**
 * Public query: Get a single product by its Convex ID.
 */
export const getById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Public query: List all collections sorted by displayOrder.
 */
export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.db.query('collections').collect()
    return list.sort((a, b) => a.displayOrder - b.displayOrder)
  },
})

/**
 * Idempotent seed mutation:
 * Seeds all 6 collections, all 12 First Edition products, and initial store settings.
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    let collectionsSeeded = 0
    let productsSeeded = 0

    // 1. Seed Collections
    for (const col of INITIAL_COLLECTIONS) {
      const existing = await ctx.db
        .query('collections')
        .withIndex('by_slug', (q) => q.eq('slug', col.slug))
        .unique()

      if (!existing) {
        await ctx.db.insert('collections', col)
        collectionsSeeded++
      }
    }

    // 2. Seed Products
    for (const prod of INITIAL_PRODUCTS) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_slug', (q) => q.eq('slug', prod.slug))
        .unique()

      if (!existing) {
        await ctx.db.insert('products', prod)
        productsSeeded++
      } else {
        // Update to ensure prices and variants match backend-authoritative schema
        await ctx.db.patch(existing._id, {
          sku: prod.sku,
          name: prod.name,
          collection: prod.collection,
          description: prod.description,
          colors: prod.colors,
          motif: prod.motif,
          prices: prod.prices,
          finishSurcharges: prod.finishSurcharges,
        })
      }
    }

    // 3. Seed Default Store Settings
    const existingSettings = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'store_config'))
      .unique()

    if (!existingSettings) {
      await ctx.db.insert('settings', {
        key: 'store_config',
        freeShippingThreshold: 499,
        standardShippingFee: 79,
        currency: 'INR',
        updatedAt: Date.now(),
      })
    }

    return {
      success: true,
      collectionsSeeded,
      productsSeeded,
      totalProducts: INITIAL_PRODUCTS.length,
      totalCollections: INITIAL_COLLECTIONS.length,
    }
  },
})

/**
 * Protected Admin query: List all products including inactive ones.
 */
export const adminListAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    return await ctx.db.query('products').collect()
  },
})

/**
 * Protected Admin mutation: Toggle active status of a product.
 */
export const adminToggleActive = mutation({
  args: {
    id: v.id('products'),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    await ctx.db.patch(args.id, { active: args.active })
    return { success: true }
  },
})
