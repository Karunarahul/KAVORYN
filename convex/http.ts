import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret'

/**
 * Timing-safe string comparison to eliminate side-channel timing attacks.
 */
function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Compute HMAC-SHA256 for Raw Webhook Body
 */
async function computeHmacSha256(message: string, secret: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const msgData = encoder.encode(message)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  try {
    const nodeCrypto = await import('crypto')
    return nodeCrypto.createHmac('sha256', secret).update(message).digest('hex')
  } catch {
    throw new Error('HMAC-SHA256 engine unavailable.')
  }
}

/**
 * HTTP Action: Razorpay Webhook Handler — Phase 3.2 Hardened
 * Endpoint: POST /razorpay-webhook
 * - Validates X-Razorpay-Signature using timing-safe comparison on the exact raw body string.
 * - Extracts durable event ID (payload.event_id || payload.id || composite).
 * - Enforces durable idempotency via webhookEvents table.
 * - STRICT CAPTURE ENFORCEMENT:
 *     - 'payment.authorized' webhook NEVER marks an order as paid.
 *     - Only 'payment.captured' (or verified 'order.paid') transitions order to 'paid'.
 * - Allows safe recovery on retry if prior attempt failed.
 * - Out-of-order lifecycle protection: Never downgrades fulfilled orders.
 */
http.route({
  path: '/razorpay-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get('x-razorpay-signature')
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing X-Razorpay-Signature header' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const rawBody = await request.text()
    const expectedSignature = await computeHmacSha256(rawBody, RAZORPAY_WEBHOOK_SECRET)

    if (!timingSafeEqualStrings(expectedSignature.toLowerCase(), signature.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }

    let payload: {
      event_id?: string
      id?: string
      event?: string
      payload?: {
        payment?: {
          entity?: {
            id?: string
            order_id?: string
            status?: string
            amount?: number
            currency?: string
          }
        }
        order?: {
          entity?: {
            id?: string
            status?: string
            amount?: number
          }
        }
      }
      created_at?: number
    }

    try {
      payload = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const eventType = payload.event
    const paymentEntity = payload.payload?.payment?.entity
    const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id
    const razorpayPaymentId = paymentEntity?.id

    if (!razorpayOrderId) {
      return new Response(JSON.stringify({ received: true, note: 'No order_id present' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    // Stable, durable event identifier: prioritize Razorpay's official event ID
    const eventId =
      payload.event_id ||
      payload.id ||
      `wh_${eventType}_${razorpayPaymentId || razorpayOrderId}_${payload.created_at || 'event'}`

    // 1. CRITICAL: 'payment.authorized' must NEVER mark an order as paid
    if (eventType === 'payment.authorized') {
      return new Response(
        JSON.stringify({
          status: 'acknowledged',
          eventId,
          eventType: 'payment.authorized',
          note: 'Payment authorized but uncaptured. Order status remains pending until payment.captured.',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    }

    // 2. Handle 'payment.captured' or 'order.paid'
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      // Require payment status to be explicitly 'captured' if paymentEntity is present
      if (paymentEntity?.status && paymentEntity.status !== 'captured') {
        return new Response(
          JSON.stringify({
            error: 'Uncaptured payment',
            note: `Payment entity status is '${paymentEntity.status}', expected 'captured'.`,
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          }
        )
      }

      try {
        const result = await ctx.runMutation(api.orders.markPaid, {
          razorpayOrderId,
          paymentId: razorpayPaymentId || `pay_${Date.now()}`,
          eventId,
          paymentStatus: 'captured',
        })

        return new Response(JSON.stringify({ status: 'ok', eventId, result }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      } catch (err: unknown) {
        console.error('Webhook markPaid error:', err)
        // Return 500 so Razorpay retries the webhook delivery later
        return new Response(
          JSON.stringify({
            error: 'Internal processing failure',
            message: err instanceof Error ? err.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }
        )
      }
    }

    return new Response(JSON.stringify({ status: 'ignored', eventType }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }),
})

export default http
