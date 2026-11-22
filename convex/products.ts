import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAdminAuth, requireSuperAdminAuth } from './auth'

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
 * Public query: List all active & published products, optionally filtered by collection slug.
 * Hidden drafts and archived products are strictly excluded from public customer storefront.
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

    // Filter to only published & active products for customers
    const published = items.filter(
      (p) => p.active !== false && (p.status === 'published' || !p.status)
    )

    // Resolve thumbnail, gallery, and lifestyle storage URLs if uploaded
    return await Promise.all(
      published.map(async (p) => {
        let thumbnailUrl: string | null = null
        if (p.thumbnailStorageId) {
          thumbnailUrl = await ctx.storage.getUrl(p.thumbnailStorageId)
        }
        const galleryUrls = p.galleryStorageIds
          ? ((await Promise.all(p.galleryStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
          : []
        const lifestyleUrls = p.lifestyleStorageIds
          ? ((await Promise.all(p.lifestyleStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
          : []

        const effectiveRenderMode: 'image' | 'procedural' =
          p.renderMode || (p.thumbnailStorageId ? 'image' : 'procedural')

        // Protect print master: strictly strip printMasterStorageId from public queries
        const safeProduct = { ...p, printMasterStorageId: undefined }
        return {
          ...safeProduct,
          renderMode: effectiveRenderMode,
          thumbnailUrl,
          galleryUrls,
          lifestyleUrls,
        }
      })
    )
  },
})

/**
 * Public query: Get a single product by its slug.
 * Draft and archived products are shielded from unauthenticated visitors.
 * High-resolution print masters are strictly stripped from public customer payloads.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!product) return null

    const effectiveRenderMode: 'image' | 'procedural' =
      product.renderMode || (product.thumbnailStorageId ? 'image' : 'procedural')

    let thumbnailUrl: string | null = null
    if (product.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(product.thumbnailStorageId)
    }
    const galleryUrls = product.galleryStorageIds
      ? ((await Promise.all(product.galleryStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
      : []
    const lifestyleUrls = product.lifestyleStorageIds
      ? ((await Promise.all(product.lifestyleStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
      : []

    // If published and active, anyone can view (print master stripped)
    if (product.active !== false && (product.status === 'published' || !product.status)) {
      const safeProduct = { ...product, printMasterStorageId: undefined }
      return {
        ...safeProduct,
        renderMode: effectiveRenderMode,
        thumbnailUrl,
        printMasterUrl: null,
        galleryUrls,
        lifestyleUrls,
        isUnavailable: false,
      }
    }

    // Otherwise, check if caller is an authorized studio administrator
    const identity = await ctx.auth.getUserIdentity()
    if (identity) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
        .first()

      if (user && (user.role === 'admin' || user.role === 'super_admin')) {
        let printMasterUrl: string | null = null
        if (product.printMasterStorageId) {
          printMasterUrl = await ctx.storage.getUrl(product.printMasterStorageId)
        }
        return {
          ...product,
          renderMode: effectiveRenderMode,
          thumbnailUrl,
          printMasterUrl,
          galleryUrls,
          lifestyleUrls,
          isUnavailable: false,
        }
      }
    }

    // Product exists in database, but is not currently published for public visitors
    return {
      _id: product._id,
      _creationTime: product._creationTime,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      collection: product.collection,
      description: product.description,
      colors: product.colors,
      motif: product.motif,
      renderMode: effectiveRenderMode,
      active: product.active,
      status: product.status || 'draft',
      prices: product.prices,
      finishSurcharges: product.finishSurcharges,
      thumbnailUrl: null,
      printMasterUrl: null,
      galleryUrls: [],
      lifestyleUrls: [],
      isUnavailable: true,
    }
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
 * Public query: List all published collections sorted by displayOrder.
 */
export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('collections').collect()
    const published = all.filter((c) => c.published !== false)
    return published.sort((a, b) => a.displayOrder - b.displayOrder)
  },
})

/**
 * Protected Super Admin Mutation:
 * Seeds or re-indexes all 6 collections, all 12 First Edition products, and initial store settings.
 * Strictly protected with requireSuperAdminAuth to prevent unauthorized tampering.
 */
export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { user: actor } = await requireSuperAdminAuth(ctx)
    let collectionsSeeded = 0
    let productsSeeded = 0
    const now = Date.now()

    // 1. Seed Collections
    for (const col of INITIAL_COLLECTIONS) {
      const existing = await ctx.db
        .query('collections')
        .withIndex('by_slug', (q) => q.eq('slug', col.slug))
        .unique()

      if (!existing) {
        await ctx.db.insert('collections', {
          ...col,
          published: true,
          createdAt: now,
          updatedAt: now,
        })
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
        await ctx.db.insert('products', {
          ...prod,
          renderMode: 'procedural',
          status: 'published',
          active: true,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        productsSeeded++
      } else {
        // Update to ensure prices, variants, and published lifecycle state are active
        await ctx.db.patch(existing._id, {
          sku: prod.sku,
          name: prod.name,
          collection: prod.collection,
          description: prod.description,
          colors: prod.colors,
          motif: prod.motif,
          prices: prod.prices,
          finishSurcharges: prod.finishSurcharges,
          renderMode: existing.renderMode || (existing.thumbnailStorageId ? 'image' : 'procedural'),
          status: existing.status || 'published',
          active: existing.active ?? true,
          updatedAt: now,
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
        updatedAt: now,
      })
    }

    // 4. Audit Log
    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: actor.clerkId,
      actorEmail: actor.email,
      action: 'CATALOGUE_SEED',
      details: `Super Admin seeded catalogue. Collections: ${collectionsSeeded}, Products: ${productsSeeded}`,
      timestamp: now,
    })

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
 * Protected Admin Query: List all products in catalogue including drafts and archives.
 */
export const adminListAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    const items = await ctx.db.query('products').collect()

    return await Promise.all(
      items.map(async (p) => {
        let thumbnailUrl: string | null = null
        let printMasterUrl: string | null = null
        if (p.thumbnailStorageId) {
          thumbnailUrl = await ctx.storage.getUrl(p.thumbnailStorageId)
        }
        if (p.printMasterStorageId) {
          printMasterUrl = await ctx.storage.getUrl(p.printMasterStorageId)
        }
        const galleryUrls = p.galleryStorageIds
          ? ((await Promise.all(p.galleryStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
          : []
        const lifestyleUrls = p.lifestyleStorageIds
          ? ((await Promise.all(p.lifestyleStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
          : []

        const effectiveRenderMode: 'image' | 'procedural' =
          p.renderMode || (p.thumbnailStorageId ? 'image' : 'procedural')

        return {
          ...p,
          renderMode: effectiveRenderMode,
          status: p.status || (p.active ? 'published' : 'draft'),
          thumbnailUrl,
          printMasterUrl,
          galleryUrls,
          lifestyleUrls,
        }
      })
    )
  },
})

/**
 * Protected Admin Query: Get product details by ID for editing.
 */
export const adminGetById = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    const product = await ctx.db.get(args.id)
    if (!product) return null

    let thumbnailUrl: string | null = null
    let printMasterUrl: string | null = null
    if (product.thumbnailStorageId) {
      thumbnailUrl = await ctx.storage.getUrl(product.thumbnailStorageId)
    }
    if (product.printMasterStorageId) {
      printMasterUrl = await ctx.storage.getUrl(product.printMasterStorageId)
    }
    const galleryUrls = product.galleryStorageIds
      ? ((await Promise.all(product.galleryStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
      : []
    const lifestyleUrls = product.lifestyleStorageIds
      ? ((await Promise.all(product.lifestyleStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(Boolean) as string[])
      : []

    const effectiveRenderMode: 'image' | 'procedural' =
      product.renderMode || (product.thumbnailStorageId ? 'image' : 'procedural')

    return {
      ...product,
      renderMode: effectiveRenderMode,
      thumbnailUrl,
      printMasterUrl,
      galleryUrls,
      lifestyleUrls,
    }
  },
})

/**
 * Protected Admin Mutation: Create a new catalogue product.
 */
export const adminCreate = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    sku: v.string(),
    collection: v.string(),
    description: v.string(),
    colors: v.array(v.string()),
    motif: v.string(),
    renderMode: v.optional(v.union(v.literal('image'), v.literal('procedural'))),
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
    status: v.union(v.literal('draft'), v.literal('published')),
    tags: v.optional(v.array(v.string())),
    thumbnailStorageId: v.optional(v.id('_storage')),
    printMasterStorageId: v.optional(v.id('_storage')),
    galleryStorageIds: v.optional(v.array(v.id('_storage'))),
    lifestyleStorageIds: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)

    // Validate unique slug
    const existingSlug = await ctx.db
      .query('products')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug.trim().toLowerCase()))
      .first()
    if (existingSlug) {
      throw new Error(`Product slug '${args.slug}' is already in use. Please provide a unique slug.`)
    }

    // Validate unique SKU
    const existingSku = await ctx.db
      .query('products')
      .withIndex('by_sku', (q) => q.eq('sku', args.sku.trim().toUpperCase()))
      .first()
    if (existingSku) {
      throw new Error(`Product SKU '${args.sku}' is already in use. Please provide a unique SKU.`)
    }

    const now = Date.now()
    const isPublished = args.status === 'published'

    const newId = await ctx.db.insert('products', {
      name: args.name.trim(),
      slug: args.slug.trim().toLowerCase(),
      sku: args.sku.trim().toUpperCase(),
      collection: args.collection.trim().toLowerCase(),
      description: args.description.trim(),
      colors: args.colors,
      motif: args.motif.trim(),
      renderMode: args.renderMode || (args.thumbnailStorageId ? 'image' : 'procedural'),
      prices: args.prices,
      finishSurcharges: args.finishSurcharges,
      status: args.status,
      active: isPublished,
      publishedAt: isPublished ? now : undefined,
      createdAt: now,
      updatedAt: now,
      tags: args.tags,
      thumbnailStorageId: args.thumbnailStorageId,
      printMasterStorageId: args.printMasterStorageId,
      galleryStorageIds: args.galleryStorageIds,
      lifestyleStorageIds: args.lifestyleStorageIds,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'PRODUCT_CREATE',
      targetId: newId,
      details: `Created product '${args.name}' (${args.sku}) with status ${args.status}`,
      timestamp: now,
    })

    return { success: true, id: newId }
  },
})

/**
 * Protected Admin Mutation: Update an existing product.
 */
export const adminUpdate = mutation({
  args: {
    id: v.id('products'),
    name: v.optional(v.string()),
    collection: v.optional(v.string()),
    description: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    motif: v.optional(v.string()),
    renderMode: v.optional(v.union(v.literal('image'), v.literal('procedural'))),
    prices: v.optional(
      v.object({
        A4: v.number(),
        A3: v.number(),
        A2: v.number(),
        A1: v.number(),
      })
    ),
    finishSurcharges: v.optional(
      v.object({
        Matte: v.number(),
        Gloss: v.number(),
      })
    ),
    status: v.optional(v.union(v.literal('draft'), v.literal('published'), v.literal('archived'))),
    tags: v.optional(v.array(v.string())),
    thumbnailStorageId: v.optional(v.id('_storage')),
    printMasterStorageId: v.optional(v.id('_storage')),
    galleryStorageIds: v.optional(v.array(v.id('_storage'))),
    lifestyleStorageIds: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Product not found.')

    const now = Date.now()
    const patchData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (args.name !== undefined) patchData.name = args.name.trim()
    if (args.collection !== undefined) patchData.collection = args.collection.trim().toLowerCase()
    if (args.description !== undefined) patchData.description = args.description.trim()
    if (args.colors !== undefined) patchData.colors = args.colors
    if (args.motif !== undefined) patchData.motif = args.motif.trim()
    if (args.renderMode !== undefined) {
      patchData.renderMode = args.renderMode
    } else if (args.thumbnailStorageId && !existing.renderMode) {
      patchData.renderMode = 'image'
    }
    if (args.prices !== undefined) patchData.prices = args.prices
    if (args.finishSurcharges !== undefined) patchData.finishSurcharges = args.finishSurcharges
    if (args.tags !== undefined) patchData.tags = args.tags
    if (args.thumbnailStorageId !== undefined) patchData.thumbnailStorageId = args.thumbnailStorageId
    if (args.printMasterStorageId !== undefined) patchData.printMasterStorageId = args.printMasterStorageId
    if (args.galleryStorageIds !== undefined) patchData.galleryStorageIds = args.galleryStorageIds
    if (args.lifestyleStorageIds !== undefined) patchData.lifestyleStorageIds = args.lifestyleStorageIds

    if (args.status !== undefined) {
      patchData.status = args.status
      if (args.status === 'published') {
        patchData.active = true
        if (!existing.publishedAt) patchData.publishedAt = now
      } else if (args.status === 'archived') {
        patchData.active = false
        patchData.archivedAt = now
      } else if (args.status === 'draft') {
        patchData.active = false
      }
    }

    await ctx.db.patch(args.id, patchData)

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'PRODUCT_UPDATE',
      targetId: args.id,
      details: `Updated product '${existing.name}' (${existing.sku})`,
      timestamp: now,
    })

    return { success: true }
  },
})

/**
 * Protected Admin Mutation: Archive a product (soft deletion).
 */
export const adminArchive = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Product not found.')

    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: 'archived',
      active: false,
      archivedAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'PRODUCT_ARCHIVE',
      targetId: args.id,
      details: `Archived product '${existing.name}' (${existing.sku})`,
      timestamp: now,
    })

    return { success: true }
  },
})

/**
 * Protected Super Admin Mutation: Restore an archived product to published or draft.
 */
export const adminRestore = mutation({
  args: {
    id: v.id('products'),
    restoreTo: v.optional(v.union(v.literal('published'), v.literal('draft'))),
  },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSuperAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Product not found.')

    const newStatus = args.restoreTo || 'published'
    const now = Date.now()
    await ctx.db.patch(args.id, {
      status: newStatus,
      active: newStatus === 'published',
      publishedAt: newStatus === 'published' ? now : existing.publishedAt,
      archivedAt: undefined,
      updatedAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: actor.clerkId,
      actorEmail: actor.email,
      action: 'PRODUCT_RESTORE',
      targetId: args.id,
      details: `Restored archived product '${existing.name}' (${existing.sku}) to status '${newStatus}'`,
      timestamp: now,
    })

    return { success: true }
  },
})

/**
 * Protected Super Admin Mutation: Permanently delete a product.
 * Enforces historical order integrity: strictly prevents deletion if product is referenced in any customer order.
 */
export const adminDelete = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSuperAdminAuth(ctx)
    const product = await ctx.db.get(args.id)
    if (!product) throw new Error('Product not found.')

    // Check for references in orders table
    const allOrders = await ctx.db.query('orders').collect()
    const referencedOrder = allOrders.find((order) =>
      order.items.some(
        (item) => item.productId === args.id || item.productSku === product.sku
      )
    )

    if (referencedOrder) {
      throw new Error(
        `Cannot permanently delete product '${product.name}' (${product.sku}) because it is referenced in historical customer order #${referencedOrder.orderNumber}. Please archive it instead to preserve order fulfillment and financial audit history.`
      )
    }

    await ctx.db.delete(args.id)

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: actor.clerkId,
      actorEmail: actor.email,
      action: 'PRODUCT_DELETE',
      targetId: args.id,
      details: `Permanently deleted unreferenced product '${product.name}' (${product.sku})`,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Protected Admin Mutation: Duplicate a product as a new draft.
 */
export const adminDuplicate = mutation({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Product not found.')

    const now = Date.now()
    const copySuffix = `-${Date.now().toString(36).substring(4)}`
    const newSlug = `${existing.slug}-copy${copySuffix}`
    const newSku = `${existing.sku}-CPY`

    const newId = await ctx.db.insert('products', {
      name: `${existing.name} (Copy)`,
      slug: newSlug,
      sku: newSku,
      collection: existing.collection,
      description: existing.description,
      colors: existing.colors,
      motif: existing.motif,
      prices: existing.prices,
      finishSurcharges: existing.finishSurcharges,
      status: 'draft',
      active: false,
      createdAt: now,
      updatedAt: now,
      tags: existing.tags ? [...existing.tags, 'duplicate'] : ['duplicate'],
      thumbnailStorageId: existing.thumbnailStorageId,
      printMasterStorageId: existing.printMasterStorageId,
      galleryStorageIds: existing.galleryStorageIds,
      lifestyleStorageIds: existing.lifestyleStorageIds,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'PRODUCT_DUPLICATE',
      targetId: newId,
      details: `Duplicated product '${existing.name}' to new draft '${newSlug}'`,
      timestamp: now,
    })

    return { success: true, id: newId }
  },
})

/**
 * Protected Admin Mutation: Toggle active status.
 */
export const adminToggleActive = mutation({
  args: {
    id: v.id('products'),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Product not found.')

    const newStatus = args.active ? 'published' : 'draft'
    await ctx.db.patch(args.id, {
      active: args.active,
      status: newStatus,
      updatedAt: Date.now(),
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'PRODUCT_TOGGLE_ACTIVE',
      targetId: args.id,
      details: `Toggled active status of '${existing.name}' to ${args.active}`,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Protected Admin Mutation: Generate an authorized file upload URL for product media (thumbnails, masters).
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Query: Get URL for a stored asset.
 * Enforces print-master protection: if the asset is registered as a print master, admin auth is required.
 */
export const getStorageUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    const isPrintMaster = await ctx.db
      .query('products')
      .filter((q) => q.eq(q.field('printMasterStorageId'), args.storageId))
      .first()

    if (isPrintMaster) {
      await requireAdminAuth(ctx)
    }

    return await ctx.storage.getUrl(args.storageId)
  },
})

/**
 * Protected Admin Query: Get secure download URL for high-resolution print master.
 * Restricted strictly to authorized studio staff and print operations.
 */
export const getPrintMasterDownloadUrl = query({
  args: { id: v.id('products') },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    const product = await ctx.db.get(args.id)
    if (!product) throw new Error('Product not found.')
    if (!product.printMasterStorageId) {
      throw new Error(`Product '${product.name}' has no print master registered.`)
    }
    return await ctx.storage.getUrl(product.printMasterStorageId)
  },
})

/**
 * Protected Admin Query: List all collections including unpublished ones.
 */
export const adminListCollections = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    const list = await ctx.db.query('collections').collect()
    return list.sort((a, b) => a.displayOrder - b.displayOrder)
  },
})

/**
 * Protected Admin Mutation: Create a new collection.
 */
export const adminCreateCollection = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    displayOrder: v.number(),
    imageStorageId: v.optional(v.id('_storage')),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)

    const existing = await ctx.db
      .query('collections')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug.trim().toLowerCase()))
      .first()

    if (existing) {
      throw new Error(`Collection slug '${args.slug}' already exists.`)
    }

    const now = Date.now()
    const id = await ctx.db.insert('collections', {
      slug: args.slug.trim().toLowerCase(),
      name: args.name.trim(),
      description: args.description.trim(),
      displayOrder: args.displayOrder,
      imageStorageId: args.imageStorageId,
      published: args.published ?? true,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'COLLECTION_CREATE',
      targetId: id,
      details: `Created collection '${args.name}' (${args.slug})`,
      timestamp: now,
    })

    return { success: true, id }
  },
})

/**
 * Protected Admin Mutation: Update an existing collection.
 */
export const adminUpdateCollection = mutation({
  args: {
    id: v.id('collections'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    imageStorageId: v.optional(v.id('_storage')),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing) throw new Error('Collection not found.')

    const patchData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }
    if (args.name !== undefined) patchData.name = args.name.trim()
    if (args.description !== undefined) patchData.description = args.description.trim()
    if (args.displayOrder !== undefined) patchData.displayOrder = args.displayOrder
    if (args.imageStorageId !== undefined) patchData.imageStorageId = args.imageStorageId
    if (args.published !== undefined) patchData.published = args.published

    await ctx.db.patch(args.id, patchData)

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'COLLECTION_UPDATE',
      targetId: args.id,
      details: `Updated collection '${existing.name}' (${existing.slug})`,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Protected Super Admin Mutation: Delete a collection if no products belong to it.
 */
export const adminDeleteCollection = mutation({
  args: { id: v.id('collections') },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSuperAdminAuth(ctx)
    const collection = await ctx.db.get(args.id)
    if (!collection) throw new Error('Collection not found.')

    // Check if any product belongs to this collection
    const product = await ctx.db
      .query('products')
      .withIndex('by_collection', (q) => q.eq('collection', collection.slug))
      .first()

    if (product) {
      throw new Error(
        `Cannot delete collection '${collection.name}' because product '${product.name}' (${product.sku}) belongs to it. Please reassign or delete the products first.`
      )
    }

    await ctx.db.delete(args.id)

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: actor.clerkId,
      actorEmail: actor.email,
      action: 'COLLECTION_DELETE',
      targetId: args.id,
      details: `Deleted collection '${collection.name}' (${collection.slug})`,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})
