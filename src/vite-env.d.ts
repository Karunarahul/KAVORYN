/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
  readonly VITE_CONVEX_URL?: string
  readonly VITE_CONVEX_SITE_URL?: string
  readonly VITE_RAZORPAY_KEY_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global window declaration for Razorpay Standard Checkout SDK
interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description?: string
  image?: string
  order_id: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
  }
  handler?: (response: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }) => void
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    animation?: boolean
  }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (response: unknown) => void) => void
}

interface Window {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
}
