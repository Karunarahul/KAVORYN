import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('=================================================================')
console.log('  KAVORYN — PRODUCT PAGE ROUTING & RESOLUTION TEST SUITE         ')
console.log('=================================================================')
console.log(`Convex Cloud Target: ${CONVEX_URL}\n`)

async function runTests() {
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

  // 1. DOOM Product Resolution
  await test('1.1 DOOM product resolves with slug dr-doom in image mode', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'dr-doom' })
    assert.ok(product, 'Dr DOOM product must exist in database')
    assert.equal(product.slug, 'dr-doom', 'Slug must be dr-doom')
    assert.equal(product.name, 'Dr DOOM', 'Title must be Dr DOOM')
    assert.equal(product.sku, 'KVR-FOR-573', 'SKU must match KVR-FOR-573')
    assert.equal(product.renderMode, 'image', 'renderMode must be image')
    assert.ok(product.thumbnailUrl, 'thumbnailUrl must be resolved')
    assert.equal(product.isUnavailable, false, 'isUnavailable must be false for published item')
    assert.equal(product.printMasterUrl, null, 'Public query must never expose printMasterUrl')
    assert.equal(product.printMasterStorageId, undefined, 'Public query must strip printMasterStorageId')
    assert.deepEqual(product.prices, { A1: 299, A2: 249, A3: 199, A4: 149 }, 'Prices must match database')
    assert.deepEqual(product.finishSurcharges, { Gloss: 49, Matte: 0 }, 'Finish surcharges must match database')
  })

  // 2. Spider-Man Product Resolution
  await test('1.2 Spider-Man product resolves with slug shape-language', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'shape-language' })
    assert.ok(product, 'Spider-Man product must exist in database')
    assert.equal(product.slug, 'shape-language')
    assert.equal(product.name, 'Spiderman')
    assert.equal(product.sku, 'KVR-FOR-001')
    assert.equal(product.renderMode, 'image')
    assert.ok(product.thumbnailUrl)
    assert.equal(product.isUnavailable, false)
  })

  // 3. Procedural First Edition Product Resolution
  await test('1.3 Procedural First Edition (after-hours) resolves with procedural renderMode', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'after-hours' })
    assert.ok(product, 'After Hours must exist in database')
    assert.equal(product.slug, 'after-hours')
    assert.equal(product.name, 'After Hours')
    assert.equal(product.renderMode, 'procedural')
    assert.equal(product.isUnavailable, false)
    assert.ok(product.colors && product.colors.length === 3, 'Must have 3 color swatches')
  })

  // 4. Missing Product Resolution
  await test('1.4 Non-existent product slug returns null (triggers 404 state, not redirect)', async () => {
    const product = await client.query(api.products.getBySlug, { slug: 'non-existent-artwork-xyz' })
    assert.equal(product, null, 'Non-existent slug must return null')
  })

  // 5. Storefront Product List contains DOOM
  await test('1.5 Public products.list contains DOOM with matching slug dr-doom', async () => {
    const list = await client.query(api.products.list, {})
    const doomInList = list.find((p) => p.slug === 'dr-doom')
    assert.ok(doomInList, 'DOOM must be present in public products.list')
    assert.equal(doomInList.name, 'Dr DOOM')
    assert.equal(doomInList.status, 'published')
    assert.equal(doomInList.active, true)
  })

  console.log('\n=================================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) process.exit(1)
}

runTests().catch((err) => {
  console.error('Test suite execution error:', err)
  process.exit(1)
})
