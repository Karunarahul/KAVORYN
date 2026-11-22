import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('=================================================================')
console.log('  KAVORYN — ACTUAL ARTWORK IMAGE RENDERING REGRESSION TEST SUITE ')
console.log('=================================================================')
console.log(`Convex Cloud Target: ${CONVEX_URL}\n`)

async function runArtworkTests() {
  let passed = 0
  let failed = 0

  async function test(name, fn) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
      passed++
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message || err)
      failed++
    }
  }

  // 1. Spider-Man Product Image Mode Verification
  await test('1.1 Spider-Man product resolves in image mode with actual artwork URL', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'shape-language' })
    assert.ok(product, 'Spider-Man product must exist in database')
    assert.equal(product.sku, 'KVR-FOR-001', 'SKU must match KVR-FOR-001')
    assert.equal(product.name, 'Spiderman', 'Title must be Spiderman')
    assert.equal(product.renderMode, 'image', 'renderMode must be image')
    assert.ok(product.thumbnailUrl, 'thumbnailUrl must be resolved')
    assert.match(product.thumbnailUrl, /^https:\/\/[^/]+\.convex\.cloud\/api\/storage\//, 'thumbnailUrl must point to Convex storage')
    assert.equal(product.printMasterUrl, null, 'Public query must not expose printMasterUrl')
    assert.equal(product.printMasterStorageId, undefined, 'Public query must strip printMasterStorageId')
  })

  // 2. Verified Storage Asset Accessibility
  await test('1.2 Uploaded Spider-Man artwork storage asset is accessible and valid', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'shape-language' })
    const res = await fetch(product.thumbnailUrl, { method: 'HEAD' })
    assert.equal(res.status, 200, 'Image storage URL must return HTTP 200')
    const contentType = res.headers.get('content-type')
    assert.ok(contentType?.startsWith('image/'), `Content-Type must be image/*, got: ${contentType}`)
    const contentLength = Number(res.headers.get('content-length') || 0)
    assert.ok(contentLength > 1000, `Image asset size must be substantial, got: ${contentLength} bytes`)
  })

  // 3. Storefront Query Verification
  await test('1.3 Public products.list includes Spider-Man with renderMode=image and artwork URL', async () => {
    const all = await client.query(api.products.list, {})
    assert.ok(all && all.length > 0, 'Storefront query must return active products')
    const spiderman = all.find((p) => p.sku === 'KVR-FOR-001')
    assert.ok(spiderman, 'Spider-Man product must be present in public listing')
    assert.equal(spiderman.renderMode, 'image', 'Spider-Man in public list must have renderMode=image')
    assert.ok(spiderman.thumbnailUrl, 'Spider-Man in public list must have valid thumbnailUrl')
    assert.equal(spiderman.printMasterStorageId, undefined, 'Public list must omit printMasterStorageId')
  })

  // 4. Procedural Mode Preservation
  await test('1.4 First Edition prints preserve procedural renderMode with zero artwork disruption', async () => {
    const all = await client.query(api.products.list, {})
    const proceduralPrints = all.filter((p) => p.sku !== 'KVR-FOR-001')
    assert.ok(proceduralPrints.length >= 8, 'Other First Edition prints must exist')
    for (const p of proceduralPrints) {
      assert.equal(p.renderMode, 'procedural', `${p.name} (${p.sku}) must have renderMode='procedural'`)
      assert.ok(p.motif, `${p.name} must preserve motif graphic`)
      assert.ok(Array.isArray(p.colors) && p.colors.length === 3, `${p.name} must preserve studio palette`)
    }
  })

  // 5. Print Master Security Enforcement
  await test('1.5 Public visitors cannot download print masters directly', async () => {
    const spiderman = await client.query(api.products.getBySlug, { slug: 'shape-language' })
    assert.equal(spiderman.printMasterUrl, null, 'Public getBySlug returns null printMasterUrl')
    
    // Calling getPrintMasterDownloadUrl without admin auth should fail
    let threw = false
    try {
      await client.query(api.products.getPrintMasterDownloadUrl, { id: spiderman._id })
    } catch {
      threw = true
    }
    assert.ok(threw, 'Unauthenticated getPrintMasterDownloadUrl must throw authorization error')
  })

  console.log('\n=================================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runArtworkTests()
