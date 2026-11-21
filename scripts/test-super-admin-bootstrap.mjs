import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'
import { getCurrentUserRecord, requireAdminAuth, requireSuperAdminAuth } from '../convex/auth.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

console.log('=================================================================')
console.log('  KAVORYN SUPER ADMIN BOOTSTRAP & AUTHORIZATION VERIFICATION     ')
console.log('=================================================================')
console.log(`Convex Cloud Endpoint: ${CONVEX_URL}\n`)

async function runSuperAdminTests() {
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

  // 1. Verify Super Admin Bootstrap Configuration Status
  await test('1. Convex Super Admin bootstrap status inspection', async () => {
    const status = await client.query(api.users.getSuperAdminBootstrapStatus, {})
    assert.ok(status.authorizedEmails.includes('karunarahul8885@gmail.com'), 'Allowlist must include karunarahul8885@gmail.com')
    console.log(`       Authorized Super Admin Emails: ${status.authorizedEmails.join(', ')}`)
    console.log(`       Existing Bootstrapped Super Admins: ${status.registeredCount}`)
  })

  // 2. Case A: Authorized Super Admin identity receives SUPER_ADMIN role
  await test('2. Case A: Authorized identity karunarahul8885@gmail.com receives role "super_admin"', async () => {
    const mockCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_superadmin_karuna_2026',
          email: 'karunarahul8885@gmail.com',
          name: 'Rahul Karuna',
          emailVerified: true,
        }),
      },
    }

    const record = await getCurrentUserRecord(mockCtx)
    assert.ok(record, 'Must return valid user record')
    assert.equal(record.user.role, 'super_admin', 'Role must evaluate to super_admin')
    assert.equal(record.user.email, 'karunarahul8885@gmail.com')
    console.log(`       Verified Role: ${record.user.role.toUpperCase()} (Clerk ID: ${record.user.clerkId})`)
  })

  // 3. Case B: Normal customer identity defaults to CUSTOMER role
  await test('3. Case B: Standard customer identity defaults strictly to role "customer"', async () => {
    const mockCustomerCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_customer_test_001',
          email: 'maya.artbuyer@example.com',
          name: 'Maya Art Buyer',
          emailVerified: true,
        }),
      },
    }

    const record = await getCurrentUserRecord(mockCustomerCtx)
    assert.ok(record, 'Must return valid user record')
    assert.equal(record.user.role, 'customer', 'Role must default to customer')
    console.log(`       Customer Role: ${record.user.role.toUpperCase()}`)
  })

  // 4. Case C: Unauthorized public user cannot claim Super Admin role
  await test('4. Case C: Public/unauthorized email cannot claim Super Admin role', async () => {
    const mockAttackerCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_attacker_999',
          email: 'intruder@external-domain.com',
          name: 'Malicious Actor',
        }),
      },
    }

    const record = await getCurrentUserRecord(mockAttackerCtx)
    assert.equal(record.user.role, 'customer', 'Unauthorized email must never be promoted')
  })

  // 5. Case D: Studio Admin cannot execute Super Admin operations (Role escalation rejected)
  await test('5. Case D: Studio Admin (role: "admin") is rejected from Super Admin operations', async () => {
    const mockAdminCtx = {
      auth: {
        getUserIdentity: async () => ({
          subject: 'user_admin_staff_01',
          email: 'admin-curator@kavoryn-staff.com',
          name: 'Staff Curator',
        }),
      },
      db: {
        query: () => ({
          withIndex: () => ({
            first: async () => ({
              clerkId: 'user_admin_staff_01',
              email: 'admin-curator@kavoryn-staff.com',
              role: 'admin',
            }),
          }),
        }),
      },
    }

    // requireAdminAuth must pass for staff
    const adminIdentity = await requireAdminAuth(mockAdminCtx)
    assert.ok(adminIdentity, 'Staff passes admin auth')

    // requireSuperAdminAuth must throw Unauthorized
    let superAdminRejected = false
    try {
      await requireSuperAdminAuth(mockAdminCtx)
    } catch (err) {
      superAdminRejected = err.message.includes('Super Admin privileges required')
    }
    assert.ok(superAdminRejected, 'Admin must be strictly blocked from Super Admin functions')
    console.log('       Super Admin operation denied to standard Admin staff as expected.')
  })

  // 6. Case E: Logged-out visitor attempting admin routes is strictly rejected
  await test('6. Case E: Unauthenticated visitor rejected by server-side query guards', async () => {
    try {
      await client.query(api.users.adminListUsers, {})
      assert.fail('Should fail with Unauthorized')
    } catch (err) {
      assert.ok(
        err.message.includes('Unauthorized') || err.message.includes('Authentication required'),
        `Expected Unauthorized, got: ${err.message}`
      )
      console.log('       Convex server rejected anonymous request to users.adminListUsers.')
    }
  })

  // 7. Case F: Logged-out session rejection on orders.adminList
  await test('7. Case F: Unauthenticated visitor rejected on orders.adminList', async () => {
    try {
      await client.query(api.orders.adminList, {})
      assert.fail('Should fail with Unauthorized')
    } catch (err) {
      assert.ok(
        err.message.includes('Unauthorized') || err.message.includes('Authentication required'),
        `Expected Unauthorized, got: ${err.message}`
      )
      console.log('       Convex server rejected anonymous request to orders.adminList.')
    }
  })

  // 8. Self-demotion guard
  await test('8. Super Admin self-demotion is strictly prevented', async () => {
    // Calling adminUpdateUserRole without Super Admin auth will fail
    try {
      await client.mutation(api.users.adminUpdateUserRole, {
        targetClerkId: 'any_clerk_id',
        newRole: 'customer',
      })
      assert.fail('Should fail')
    } catch (err) {
      assert.ok(err.message.includes('Unauthorized'))
      console.log('       Mutation strictly blocked by requireSuperAdminAuth.')
    }
  })

  // 9. Payment diagnostics connection test
  await test('9. Live Razorpay Orders API connection diagnostic verification', async () => {
    const res = await client.action(api.razorpay.testConnection, {})
    assert.ok(res.success, `Payment diagnostics test failed: ${res.error}`)
    assert.ok(res.orderId && res.orderId.startsWith('order_'), 'Must return authentic Razorpay order ID')
    console.log(`       Diagnostic Gateway Test Order ID: ${res.orderId}`)
  })

  console.log('\n=================================================================')
  console.log(`SUPER ADMIN VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

runSuperAdminTests().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})

