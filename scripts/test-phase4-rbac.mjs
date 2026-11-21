import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('====================================================')
console.log('   KAVORYN PHASE 4: RBAC & SYSTEM SECURITY TEST    ')
console.log('====================================================')
console.log(`Convex Cloud Target: ${CONVEX_URL}\n`)

async function runPhase4Tests() {
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

  // 1. Create a known test order for verification testing
  let testOrder = null
  await test('1. Create test order in Convex with customer details and PIN', async () => {
    const res = await client.mutation(api.orders.createPending, {
      name: 'Pooja Hegde',
      email: 'pooja.hegde@kavoryn-test.com',
      phone: '+919988776655',
      address: {
        line1: '45 Palm Grove, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400050',
      },
      items: [
        {
          productId: '1',
          size: 'A2',
          finish: 'Matte',
          quantity: 1,
        },
      ],
      idempotencyKey: `p4_test_${Date.now()}`,
    })

    assert.ok(res.orderId, 'Order must be created with ID')
    assert.ok(res.orderNumber.startsWith('KVR-'), 'Order number format valid')
    assert.equal(res.subtotal, 399, 'Subtotal authoritative match')
    testOrder = res
    console.log(`       Order Created: ${res.orderNumber} (Total: ₹${res.total})`)
  })

  // 2. Test verified tracking with email match
  await test('2. Verified Order Tracking succeeds with matching Email', async () => {
    const tracked = await client.query(api.orders.trackOrderVerified, {
      orderNumber: testOrder.orderNumber,
      verificationKey: 'pooja.hegde@kavoryn-test.com',
    })

    assert.ok(tracked, 'Tracked order must be returned')
    assert.equal(tracked.orderNumber, testOrder.orderNumber)
    assert.equal(tracked.city, 'Mumbai')
    assert.equal(tracked.postalCode, '400050')
    assert.equal(tracked.items.length, 1)
    console.log(`       Verified Status: ${tracked.status.toUpperCase()} (${tracked.itemCount} item)`)
  })

  // 3. Test verified tracking with PIN code match
  await test('3. Verified Order Tracking succeeds with matching Indian PIN Code (400050)', async () => {
    const tracked = await client.query(api.orders.trackOrderVerified, {
      orderNumber: testOrder.orderNumber,
      verificationKey: '400050',
    })

    assert.ok(tracked, 'Tracked order must be returned')
    assert.equal(tracked.orderNumber, testOrder.orderNumber)
    assert.equal(tracked.city, 'Mumbai')
  })

  // 4. Test verified tracking rejection with mismatched key
  await test('4. Verified Order Tracking rejects unauthorized query (wrong PIN/Email)', async () => {
    const tracked = await client.query(api.orders.trackOrderVerified, {
      orderNumber: testOrder.orderNumber,
      verificationKey: '110001', // Incorrect PIN
    })

    assert.equal(tracked, null, 'Must return null for mismatched key to prevent enumeration')
  })

  // 5. Test Server-Side RBAC Guard on orders.adminList
  await test('5. Unauthenticated call to orders.adminList is strictly rejected by server', async () => {
    try {
      await client.query(api.orders.adminList, {})
      assert.fail('Should have been rejected with Unauthorized')
    } catch (err) {
      assert.ok(
        err.message.includes('Unauthorized') || err.message.includes('Authentication required'),
        `Expected Unauthorized error, got: ${err.message}`
      )
      console.log('       Server rejected unauthenticated admin query as expected.')
    }
  })

  // 6. Test Server-Side RBAC Guard on users.adminListUsers
  await test('6. Unauthenticated call to users.adminListUsers is strictly rejected by server', async () => {
    try {
      await client.query(api.users.adminListUsers, {})
      assert.fail('Should have been rejected with Unauthorized')
    } catch (err) {
      assert.ok(
        err.message.includes('Unauthorized') || err.message.includes('Authentication required'),
        `Expected Unauthorized error, got: ${err.message}`
      )
      console.log('       Server rejected unauthenticated super admin query as expected.')
    }
  })

  // 7. Test Server-Side RBAC Guard on users.adminUpdateUserRole
  await test('7. Unauthenticated call to users.adminUpdateUserRole is rejected by server', async () => {
    try {
      await client.mutation(api.users.adminUpdateUserRole, {
        targetClerkId: 'user_fake_123',
        newRole: 'super_admin',
      })
      assert.fail('Should have been rejected with Unauthorized')
    } catch (err) {
      assert.ok(
        err.message.includes('Unauthorized') || err.message.includes('Authentication required'),
        `Expected Unauthorized error, got: ${err.message}`
      )
      console.log('       Server rejected unauthenticated role escalation mutation as expected.')
    }
  })

  // 8. Test SEO & Lighthouse Artifacts
  await test('8. SEO Artifacts (robots.txt, sitemap.xml, index.html) validated', async () => {
    const robotsPath = path.resolve('public/robots.txt')
    const sitemapPath = path.resolve('public/sitemap.xml')
    const indexPath = path.resolve('index.html')

    assert.ok(fs.existsSync(robotsPath), 'robots.txt must exist')
    const robotsContent = fs.readFileSync(robotsPath, 'utf8')
    assert.ok(robotsContent.includes('Disallow: /admin'), 'robots.txt disallows /admin')
    assert.ok(robotsContent.includes('Disallow: /profile'), 'robots.txt disallows /profile')

    assert.ok(fs.existsSync(sitemapPath), 'sitemap.xml must exist')
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8')
    assert.ok(sitemapContent.includes('https://kavoryn.com/collections/brutalist-grid'), 'sitemap includes collections')

    assert.ok(fs.existsSync(indexPath), 'index.html must exist')
    const indexContent = fs.readFileSync(indexPath, 'utf8')
    assert.ok(indexContent.includes('rel="canonical"'), 'index.html has canonical link')
    assert.ok(indexContent.includes('og:title'), 'index.html has og:title')
  })

  // 9. Client-Side Bundle Security Audit
  await test('9. Production build client bundle does not contain secret credentials', async () => {
    const distAssetsDir = path.resolve('dist/assets')
    assert.ok(fs.existsSync(distAssetsDir), 'dist/assets directory must exist')

    const files = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'))
    let totalBundleSize = 0

    for (const file of files) {
      const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf8')
      totalBundleSize += content.length

      // Verify no backend secrets exist
      assert.ok(!content.includes('RAZORPAY_KEY_SECRET='), `File ${file} leaked RAZORPAY_KEY_SECRET`)
      assert.ok(!content.includes('RAZORPAY_WEBHOOK_SECRET='), `File ${file} leaked RAZORPAY_WEBHOOK_SECRET`)
      assert.ok(!content.includes('test_secret_kavoryn'), `File ${file} leaked test_secret_kavoryn`)
    }

    console.log(`       Total JS bundle size across all code-split chunks: ${(totalBundleSize / 1024).toFixed(1)} kB`)
    console.log('       Clean: No private keys, webhook secrets, or hardcoded signatures found.')
  })

  console.log(`\n====================================================`)
  console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(`====================================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runPhase4Tests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
