import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAdminAuth, requireSuperAdminAuth } from './auth'
import type { Id } from './_generated/dataModel'

/**
 * Protected Admin Mutation: Initialize a staged catalogue import job.
 */
export const createJob = mutation({
  args: {
    jobId: v.string(),
    csvFileName: v.string(),
    zipFileName: v.optional(v.string()),
    totalRecords: v.number(),
    validRecords: v.number(),
    failedRecords: v.number(),
    status: v.union(
      v.literal('uploaded'),
      v.literal('validating'),
      v.literal('validation_completed'),
      v.literal('awaiting_confirmation'),
      v.literal('uploading_assets'),
      v.literal('importing_products'),
      v.literal('completed'),
      v.literal('partially_failed'),
      v.literal('failed'),
      v.literal('cancelled')
    ),
    errorLog: v.optional(
      v.array(
        v.object({
          row: v.number(),
          sku: v.string(),
          field: v.string(),
          message: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const now = Date.now()

    // Ensure unique jobId
    const existing = await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        validRecords: args.validRecords,
        failedRecords: args.failedRecords,
        errorLog: args.errorLog,
        updatedAt: now,
      })
      return { success: true, id: existing._id, jobId: args.jobId }
    }

    const id = await ctx.db.insert('catalogueImportJobs', {
      jobId: args.jobId,
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      status: args.status,
      totalRecords: args.totalRecords,
      validRecords: args.validRecords,
      failedRecords: args.failedRecords,
      csvFileName: args.csvFileName,
      zipFileName: args.zipFileName,
      importedProductIds: [],
      errorLog: args.errorLog,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'IMPORT_JOB_CREATED',
      targetId: args.jobId,
      details: `Initialized import job ${args.jobId}: ${args.validRecords} valid, ${args.failedRecords} invalid`,
      timestamp: now,
    })

    return { success: true, id, jobId: args.jobId }
  },
})

/**
 * Protected Admin Mutation: Commit a batch of validated product records as drafts.
 * Idempotent: checks SKU uniqueness before inserting to prevent duplicates on retry.
 */
export const commitBatch = mutation({
  args: {
    jobId: v.string(),
    products: v.array(
      v.object({
        sku: v.string(),
        name: v.string(),
        slug: v.string(),
        collection: v.string(),
        description: v.string(),
        colors: v.array(v.string()),
        motif: v.string(),
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
        renderMode: v.optional(v.union(v.literal('image'), v.literal('procedural'))),
        tags: v.optional(v.array(v.string())),
        thumbnailStorageId: v.optional(v.id('_storage')),
        printMasterStorageId: v.optional(v.id('_storage')),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)

    const job = await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()

    if (!job) {
      throw new Error(`Import job '${args.jobId}' not found.`)
    }

    if (job.status === 'cancelled' || job.status === 'completed') {
      throw new Error(`Cannot commit to job in status '${job.status}'.`)
    }

    const now = Date.now()
    const importedIds: Id<'products'>[] = [...job.importedProductIds]
    let newlyCreated = 0

    for (const item of args.products) {
      // Check if product with this SKU already exists
      const existing = await ctx.db
        .query('products')
        .withIndex('by_sku', (q) => q.eq('sku', item.sku.trim().toUpperCase()))
        .first()

      if (existing) {
        // If already imported by this job, update fields
        if (importedIds.includes(existing._id)) {
          await ctx.db.patch(existing._id, {
            name: item.name.trim(),
            description: item.description.trim(),
            collection: item.collection.trim().toLowerCase(),
            colors: item.colors,
            motif: item.motif.trim(),
            prices: item.prices,
            finishSurcharges: item.finishSurcharges,
            thumbnailStorageId: item.thumbnailStorageId || existing.thumbnailStorageId,
            printMasterStorageId: item.printMasterStorageId || existing.printMasterStorageId,
            updatedAt: now,
          })
          continue
        }
        // If it's an existing catalogue product from another source, skip to preserve it
        continue
      }

      // Insert new product strictly as DRAFT and INACTIVE
      const newId = await ctx.db.insert('products', {
        name: item.name.trim(),
        slug: item.slug.trim().toLowerCase(),
        sku: item.sku.trim().toUpperCase(),
        collection: item.collection.trim().toLowerCase(),
        description: item.description.trim(),
        colors: item.colors,
        motif: item.motif.trim(),
        prices: item.prices,
        finishSurcharges: item.finishSurcharges,
        renderMode: item.renderMode || (item.thumbnailStorageId ? 'image' : 'procedural'),
        status: 'draft',
        active: false,
        tags: item.tags ? [...item.tags, `import:${args.jobId}`] : [`import:${args.jobId}`],
        thumbnailStorageId: item.thumbnailStorageId,
        printMasterStorageId: item.printMasterStorageId,
        createdAt: now,
        updatedAt: now,
      })

      importedIds.push(newId)
      newlyCreated++
    }

    await ctx.db.patch(job._id, {
      importedProductIds: importedIds,
      status: 'importing_products',
      updatedAt: now,
    })

    return {
      success: true,
      batchCount: args.products.length,
      newlyCreated,
      totalJobProducts: importedIds.length,
    }
  },
})

/**
 * Protected Admin Mutation: Mark an import job as completed or partially failed.
 */
export const completeJob = mutation({
  args: {
    jobId: v.string(),
    status: v.union(v.literal('completed'), v.literal('partially_failed'), v.literal('failed')),
    summary: v.optional(
      v.object({
        newProductsCreated: v.number(),
        assetsUploaded: v.number(),
        skippedCount: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const job = await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()

    if (!job) throw new Error('Job not found.')

    const now = Date.now()
    await ctx.db.patch(job._id, {
      status: args.status,
      summary: args.summary,
      completedAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'IMPORT_JOB_COMPLETED',
      targetId: args.jobId,
      details: `Import job completed with status ${args.status}. Total products created: ${job.importedProductIds.length}`,
      timestamp: now,
    })

    return { success: true }
  },
})

/**
 * Protected Admin Mutation: Cancel an import job.
 */
export const cancelJob = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireAdminAuth(ctx)
    const job = await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()

    if (!job) throw new Error('Job not found.')

    await ctx.db.patch(job._id, {
      status: 'cancelled',
      updatedAt: Date.now(),
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: identity.subject,
      actorEmail: identity.email || 'admin@kavoryn.com',
      action: 'IMPORT_JOB_CANCELLED',
      targetId: args.jobId,
      details: `Import job ${args.jobId} cancelled by administrator`,
      timestamp: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Protected Super Admin Mutation: Rollback products created by an import job.
 * Enforces historical order integrity: rejects rollback if any product has been ordered.
 */
export const rollbackJob = mutation({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    const { user: actor } = await requireSuperAdminAuth(ctx)
    const job = await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()

    if (!job) throw new Error('Job not found.')

    const allOrders = await ctx.db.query('orders').collect()
    let deletedCount = 0
    const blockedSkus: string[] = []

    for (const prodId of job.importedProductIds) {
      const prod = await ctx.db.get(prodId)
      if (!prod) continue

      // Verify no customer orders reference this product
      const isOrdered = allOrders.some((order) =>
        order.items.some((item) => item.productId === prodId || item.productSku === prod.sku)
      )

      if (isOrdered) {
        blockedSkus.push(prod.sku)
        continue
      }

      // Safe to delete draft import
      await ctx.db.delete(prodId)
      deletedCount++
    }

    if (blockedSkus.length > 0) {
      throw new Error(
        `Rollback partially blocked: SKUs [${blockedSkus.join(', ')}] have customer order references and cannot be deleted.`
      )
    }

    await ctx.db.patch(job._id, {
      status: 'cancelled',
      importedProductIds: [],
      updatedAt: Date.now(),
    })

    await ctx.db.insert('adminActivityLogs', {
      actorClerkId: actor.clerkId,
      actorEmail: actor.email,
      action: 'IMPORT_JOB_ROLLBACK',
      targetId: args.jobId,
      details: `Super Admin rolled back job ${args.jobId}. Deleted ${deletedCount} unreferenced draft products.`,
      timestamp: Date.now(),
    })

    return { success: true, deletedCount }
  },
})

/**
 * Protected Admin Query: List import jobs.
 */
export const listJobs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx)
    const jobs = await ctx.db.query('catalogueImportJobs').order('desc').collect()
    return jobs
  },
})

/**
 * Protected Admin Query: Get import job details.
 */
export const getJob = query({
  args: { jobId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx)
    return await ctx.db
      .query('catalogueImportJobs')
      .withIndex('by_job_id', (q) => q.eq('jobId', args.jobId))
      .first()
  },
})
