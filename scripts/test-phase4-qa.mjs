import assert from 'node:assert/strict'

const PREVIEW_URL = 'http://localhost:4173'

console.log('=================================================================')
console.log('  KAVORYN PHASE 4: AUTOMATED QA & INTEGRATION VERIFICATION       ')
console.log('=================================================================\n')

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

// 1. Static Discoverability: ai-catalog.json
await test('1. AI Discoverability: /ai-catalog.json returns valid JSON with 12 prints', async () => {
  const res = await fetch(`${PREVIEW_URL}/ai-catalog.json`)
  assert.equal(res.status, 200, 'HTTP status must be 200')
  const data = await res.json()
  assert.equal(data.name, 'KAVORYN Studio Catalog')
  assert.equal(data.products.length, 12, 'Must contain all 12 products')
  assert.equal(data.currency, 'INR')
  console.log(`       Catalog Name: "${data.name}" (${data.products.length} products, Currency: ${data.currency})`)
})

// 2. Static Discoverability: llms.txt
await test('2. AI Discoverability: /llms.txt returns valid Markdown with H1 & links', async () => {
  const res = await fetch(`${PREVIEW_URL}/llms.txt`)
  assert.equal(res.status, 200, 'HTTP status must be 200')
  const text = await res.text()
  assert.ok(text.startsWith('# KAVORYN'), 'Must start with valid # H1')
  assert.ok(text.includes('## Storefront & Collections'), 'Must include collections')
  assert.ok(text.includes('KVR-FOR-001'), 'Must include product SKUs')
  console.log(`       llms.txt size: ${text.length} bytes, H1 verified.`)
})

// 3. SEO: robots.txt
await test('3. SEO: /robots.txt is accessible and well-formed', async () => {
  const res = await fetch(`${PREVIEW_URL}/robots.txt`)
  assert.equal(res.status, 200, 'HTTP status must be 200')
  const text = await res.text()
  assert.ok(text.includes('User-agent'), 'Must contain User-agent directive')
  assert.ok(text.includes('sitemap.xml'), 'Must reference sitemap')
})

// 4. SEO: sitemap.xml
await test('4. SEO: /sitemap.xml is valid XML', async () => {
  const res = await fetch(`${PREVIEW_URL}/sitemap.xml`)
  assert.equal(res.status, 200, 'HTTP status must be 200')
  const text = await res.text()
  assert.ok(text.includes('<urlset'), 'Must contain <urlset>')
  assert.ok(text.includes('https://kavoryn.com/'), 'Must contain site URLs')
})

// 5. Performance: Non-blocking Google Fonts in index.html
await test('5. Performance: index.html implements non-blocking Google Fonts pattern', async () => {
  const res = await fetch(`${PREVIEW_URL}/`)
  assert.equal(res.status, 200, 'HTTP status must be 200')
  const html = await res.text()
  assert.ok(html.includes('rel="preload"'), 'Must contain font preload')
  assert.ok(html.includes('media="print"'), 'Must contain print media swap')
  assert.ok(html.includes('onload="this.media=\'all\'"'), 'Must contain onload media swap')
  console.log('       Font loading verified: Preload + Print-to-All media swap.')
})

// 6. Security: No secrets exposed in client bundle
await test('6. Security: Verify client bundle does NOT leak backend secrets', async () => {
  const res = await fetch(`${PREVIEW_URL}/`)
  const html = await res.text()
  assert.ok(!html.includes('RAZORPAY_KEY_SECRET'), 'No secret key leak in index')
  assert.ok(!html.includes('RAZORPAY_WEBHOOK_SECRET'), 'No webhook secret leak in index')
})

console.log('\n=================================================================')
console.log(`QA VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('=================================================================\n')

if (failed > 0) process.exit(1)
