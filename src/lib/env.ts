export const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

export const isClerkConfigured = Boolean(
  clerkPubKey &&
  clerkPubKey.startsWith('pk_') &&
  clerkPubKey.length > 20 &&
  !clerkPubKey.includes('placeholder')
)

export const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

export const isConvexConfigured = Boolean(
  convexUrl &&
  convexUrl.startsWith('http') &&
  !convexUrl.includes('placeholder')
)

export const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined

export const isRazorpayConfigured = Boolean(
  razorpayKeyId &&
  razorpayKeyId.startsWith('rzp_test_')
)

export const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined
