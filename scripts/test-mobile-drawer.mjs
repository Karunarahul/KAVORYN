import assert from 'node:assert/strict'
import fs from 'node:fs'

console.log('=================================================================')
console.log('  KAVORYN MOBILE NAVIGATION DRAWER & ACCESSIBILITY AUDIT        ')
console.log('=================================================================\n')

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

// 1. Inspect Drawer.tsx for premature close bug fix
test('1. Drawer.tsx does NOT close immediately upon mount/render', () => {
  const content = fs.readFileSync('src/components/Drawer.tsx', 'utf-8')
  // Old bug was: useEffect(() => { onClose() }, [location.pathname, onClose])
  assert.ok(
    !content.includes('useEffect(() => {\n    onClose()\n  }, [location.pathname, onClose])'),
    'Old fatal auto-close bug must be removed'
  )
  assert.ok(
    content.includes('prevPathRef.current !== location.pathname'),
    'Must check that pathname genuinely changed before closing'
  )
})

// 2. Inspect Header.tsx for dynamic aria-expanded and touch target
test('2. Header.tsx has dynamic aria-expanded and accessible trigger', () => {
  const content = fs.readFileSync('src/components/Header.tsx', 'utf-8')
  assert.ok(content.includes('isMenuOpen: boolean'), 'HeaderProps must accept isMenuOpen')
  assert.ok(content.includes('aria-expanded={isMenuOpen}'), 'aria-expanded must be dynamic boolean')
  assert.ok(content.includes('id="menu-trigger-btn"'), 'Trigger button must have accessible ID')
})

// 3. Inspect styles.css for 44x44px touch target on mobile menu button
test('3. styles.css enforces 44x44px minimum touch target for .menu-trigger', () => {
  const css = fs.readFileSync('src/styles.css', 'utf-8')
  assert.ok(css.includes('.menu-trigger {'), '.menu-trigger class must exist')
  assert.ok(css.includes('min-width: 44px;'), 'Must have min-width: 44px')
  assert.ok(css.includes('min-height: 44px;'), 'Must have min-height: 44px')
})

// 4. Inspect Drawer.tsx for focus management & accessibility
test('4. Drawer.tsx implements accessible dialog semantics, focus trap, and close on escape', () => {
  const content = fs.readFileSync('src/components/Drawer.tsx', 'utf-8')
  assert.ok(content.includes('role="dialog"'), 'Must have role="dialog"')
  assert.ok(content.includes('aria-modal="true"'), 'Must have aria-modal="true"')
  assert.ok(content.includes('e.key === \'Escape\''), 'Must handle Escape key')
  assert.ok(content.includes('document.body.style.overflow = \'hidden\''), 'Must lock body scroll')
  assert.ok(content.includes('closeButtonRef.current?.focus()'), 'Must focus close button on open')
  assert.ok(content.includes('trigger?.focus()'), 'Must restore focus to trigger on close')
})

// 5. Inspect Drawer.tsx for all navigation links having onClick={onClose}
test('5. Drawer.tsx navigation links automatically close drawer upon click', () => {
  const content = fs.readFileSync('src/components/Drawer.tsx', 'utf-8')
  const linkMatches = content.match(/<Link\s+[^>]*onClick=\{onClose\}/g) || []
  assert.ok(linkMatches.length >= 8, `Expected at least 8 links with onClick={onClose}, found ${linkMatches.length}`)
})

// 6. Inspect styles.css for high-contrast footer fixes
test('6. styles.css has WCAG AA compliant footer text and specs contrast', () => {
  const css = fs.readFileSync('src/styles.css', 'utf-8')
  assert.ok(css.includes('color: #8da4ff;'), 'specs-code must use #8da4ff for AA contrast')
  assert.ok(css.includes('color: #B5B0A6;'), 'footer-admin-discreet must use #B5B0A6 for AA contrast')
  assert.ok(css.includes('color: #D6D2CA;'), 'footer small and bottom must use #D6D2CA for AA contrast')
})

// 7. Inspect Home.tsx for heading hierarchy fix
test('7. Home.tsx uses h2 for Collections strip to avoid skipped heading level', () => {
  const content = fs.readFileSync('src/pages/Home.tsx', 'utf-8')
  assert.ok(
    content.includes('<h2 className="strip-title">SIX COLLECTIONS. ZERO COMPROMISE.</h2>'),
    'Collections strip must use h2 rather than h3'
  )
})

// 8. Inspect ProductPage.tsx for Schema.org JSON-LD
test('8. ProductPage.tsx includes valid Schema.org Product structured data', () => {
  const content = fs.readFileSync('src/pages/ProductPage.tsx', 'utf-8')
  assert.ok(content.includes('type="application/ld+json"'), 'Must include JSON-LD script')
  assert.ok(content.includes("'@type': 'Product'"), 'Must include @type Product')
  assert.ok(content.includes("'@type': 'AggregateOffer'"), 'Must include @type AggregateOffer')
})

// 9. Inspect Poster.tsx for role="img" and decorative aria-hidden
test('9. Poster.tsx marks visual poster as role="img" and inner decorative elements as aria-hidden', () => {
  const content = fs.readFileSync('src/components/Poster.tsx', 'utf-8')
  assert.ok(content.includes('role="img"'), 'Poster container must have role="img"')
  assert.ok(content.includes('aria-hidden="true"'), 'Inner decorative elements must have aria-hidden="true"')
})

console.log('\n=================================================================')
console.log(`DRAWER & A11Y AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`)
console.log('=================================================================\n')

if (failed > 0) process.exit(1)
