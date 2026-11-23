import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=================================================================')
console.log('  KAVORYN — PRE-LAUNCH STOREFRONT TRANSFORMATION AUDIT          ')
console.log('=================================================================')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message || err)
    failed++
  }
}

const root = process.cwd()

// 1. Home.tsx Performance & Zero Database Queries
test('1. Home.tsx does not query Convex products (lightweight, zero network waterfall)', () => {
  const homeCode = fs.readFileSync(path.join(root, 'src/pages/Home.tsx'), 'utf-8')
  assert.ok(!homeCode.includes('api.products'), 'Home.tsx must not reference api.products')
  assert.ok(!homeCode.includes('useQuery'), 'Home.tsx must not call useQuery')
})

// 2. Home.tsx Required Copy & Headlines
test('2. Home.tsx contains all required pre-launch copy and headlines', () => {
  const homeCode = fs.readFileSync(path.join(root, 'src/pages/Home.tsx'), 'utf-8')
  assert.ok(homeCode.includes('YOUR WALLS'), 'Must contain YOUR WALLS')
  assert.ok(homeCode.includes('ARE ABOUT'), 'Must contain ARE ABOUT')
  assert.ok(homeCode.includes('TO CHANGE.'), 'Must contain TO CHANGE.')
  assert.ok(
    homeCode.includes('A new point of view is taking shape'),
    'Must contain lede sentence'
  )
  assert.ok(
    homeCode.includes('FIRST COLLECTION DROPPING SOON.'),
    'Must contain launch announcement'
  )
  assert.ok(homeCode.includes('FOLLOW THE DROP'), 'Must contain primary CTA')
  assert.ok(
    homeCode.includes('NOT JUST DECOR.'),
    'Must contain brand statement headline'
  )
  assert.ok(
    homeCode.includes('AN EXPRESSION') && homeCode.includes('OF YOU.'),
    'Must contain brand statement subheadline'
  )
  assert.ok(
    homeCode.includes('Your space should say something about you'),
    'Must contain brand statement supporting copy'
  )
})

// 3. PrelaunchPoster Component Validation
test('3. PrelaunchPoster component has geometric composition, branding, and edition 01/26', () => {
  const posterCode = fs.readFileSync(path.join(root, 'src/components/PrelaunchPoster.tsx'), 'utf-8')
  assert.ok(posterCode.includes('KAVORYN'), 'Must feature KAVORYN branding')
  assert.ok(posterCode.includes('01/26') || posterCode.includes('01 / 26'), 'Must feature edition 01/26')
  assert.ok(posterCode.includes('svg'), 'Must render scalable vector artwork')
  assert.ok(posterCode.includes('#3155E7'), 'Must use cobalt token')
  assert.ok(posterCode.includes('#D6F04A'), 'Must use acid token')
  assert.ok(posterCode.includes('#171717'), 'Must use ink token')
})

// 4. Header.tsx Minimal Top Navigation
test('4. Header.tsx contains wordmark, descriptor, and Instagram link with no product nav', () => {
  const headerCode = fs.readFileSync(path.join(root, 'src/components/Header.tsx'), 'utf-8')
  assert.ok(headerCode.includes('KAVORYN'), 'Header must render KAVORYN wordmark')
  assert.ok(headerCode.includes('INDEPENDENT ART STUDIO · INDIA'), 'Must render studio descriptor')
  assert.ok(headerCode.includes('Instagram'), 'Must render Instagram icon/link')
  assert.ok(!headerCode.includes('collections'), 'Must not render category collections nav')
  assert.ok(!headerCode.includes('ALL PRINTS'), 'Must not render ALL PRINTS link')
})

// 5. Footer.tsx Minimal Pre-launch Footer
test('5. Footer.tsx contains wordmark, copyright, tagline, Instagram, contact, and discreet admin links', () => {
  const footerCode = fs.readFileSync(path.join(root, 'src/components/Footer.tsx'), 'utf-8')
  assert.ok(footerCode.includes('KAVORYN'), 'Footer must render KAVORYN wordmark')
  assert.ok(footerCode.includes('2026 KAVORYN STUDIO'), 'Must render copyright')
  assert.ok(footerCode.includes('MAKE YOUR WALLS SPEAK'), 'Must render brand tagline')
  assert.ok(footerCode.includes('INSTAGRAM'), 'Must render Instagram link')
  assert.ok(footerCode.includes('/contact'), 'Must render contact link')
  assert.ok(footerCode.includes('/admin'), 'Must preserve discreet admin ops link')
  assert.ok(footerCode.includes('/super-admin'), 'Must preserve discreet super-admin link')
})

// 6. SEO & Open Graph Metadata in index.html
test('6. index.html contains updated SEO title, meta description, and Open Graph tags', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8')
  assert.ok(html.includes('KAVORYN — First Collection Dropping Soon'), 'Must have pre-launch title')
  assert.ok(
    html.includes('Original contemporary poster art. A new expression for your walls. The first KAVORYN collection is coming soon.'),
    'Must have pre-launch meta description'
  )
  assert.ok(html.includes('og:title'), 'Must have Open Graph title')
  assert.ok(html.includes('twitter:title'), 'Must have Twitter title')
})

// 7. Critical Administrative Infrastructure Preservation
test('7. App.tsx preserves all administrative routes and auth architecture', () => {
  const appCode = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf-8')
  assert.ok(appCode.includes('path="/admin"'), 'Must preserve /admin route')
  assert.ok(appCode.includes('path="/admin/catalogue"'), 'Must preserve /admin/catalogue route')
  assert.ok(appCode.includes('path="/super-admin"'), 'Must preserve /super-admin route')
  assert.ok(appCode.includes('path="/super-admin/catalogue"'), 'Must preserve /super-admin/catalogue route')
  assert.ok(appCode.includes('RoleBasedAuthNavigator'), 'Must preserve server-side role routing')
})

// 8. Responsive CSS & Reduced Motion
test('8. styles.css contains prelaunch styles, mobile breakpoints, and prefers-reduced-motion', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf-8')
  assert.ok(css.includes('.prelaunch-hero'), 'Must contain .prelaunch-hero')
  assert.ok(css.includes('.prelaunch-poster-frame'), 'Must contain .prelaunch-poster-frame')
  assert.ok(css.includes('@media (max-width: 640px)'), 'Must contain 640px mobile breakpoint')
  assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must respect prefers-reduced-motion')
})

console.log('\n=================================================================')
console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
console.log('=================================================================')

if (failed > 0) process.exit(1)
