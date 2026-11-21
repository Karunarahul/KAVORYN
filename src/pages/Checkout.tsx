import React, { useState, useId } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
} from 'lucide-react'
import { formatMoney, getProductPrice, shippingConfig } from '../data'
import { Poster } from '../components/Poster'
import {
  storeBackend,
  type DBOrder,
} from '../lib/convex-client'
import type { CartLine } from '../types'

interface CheckoutProps {
  lines: CartLine[]
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi NCR',
  'Chandigarh',
]

/**
 * Dynamically loads Razorpay checkout.js script
 */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const existing = document.getElementById('razorpay-sdk')
    if (existing) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'razorpay-sdk'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export const Checkout: React.FC<CheckoutProps> = ({ lines }) => {
  const sessionKey = useId()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Order state
  const [createdOrder, setCreatedOrder] = useState<{
    orderId: string
    orderNumber: string
    subtotal: number
    shippingFee: number
    total: number
  } | null>(null)

  // Razorpay payment lifecycle state
  const [isOpeningRazorpay, setIsOpeningRazorpay] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentDismissed, setPaymentDismissed] = useState(false)
  const [verifiedPaidOrder, setVerifiedPaidOrder] = useState<DBOrder | null>(null)
  const [, setActiveRzpOrder] = useState<{
    razorpayOrderId: string
    amount: number
    currency: string
    keyId: string
  } | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    pinCode: '',
    address: '',
    city: '',
    state: 'Maharashtra',
  })

  if (!lines.length && !createdOrder && !verifiedPaidOrder) {
    return <Navigate to="/cart" replace />
  }

  // Client preview calculation
  const previewSubtotal = lines.reduce(
    (acc, l) => acc + getProductPrice(l.size, l.finish) * l.qty,
    0
  )
  const previewFreeShipping = previewSubtotal >= shippingConfig.freeShippingThreshold
  const previewShippingFee = previewFreeShipping ? 0 : shippingConfig.standardShippingFee
  const previewGrandTotal = previewSubtotal + previewShippingFee

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Step 1: Create Authoritative Order in Database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const result = await storeBackend.createPendingOrder({
        email: formData.email,
        name: formData.fullName,
        phone: formData.phone,
        address: {
          line1: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.pinCode,
        },
        items: lines.map((l) => ({
          productId: l.product.id,
          size: l.size,
          finish: l.finish,
          quantity: l.qty,
        })),
        idempotencyKey: `idemp_${sessionKey}_${formData.email}`,
      })

      setCreatedOrder(result)
      // Automatically initiate Razorpay order creation
      await handleLaunchRazorpay(result.orderId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Step 2: Create Razorpay Order on Backend & Open Standard Checkout
  const handleLaunchRazorpay = async (orderId: string) => {
    setIsOpeningRazorpay(true)
    setPaymentError(null)
    setPaymentDismissed(false)

    try {
      const rzpData = await storeBackend.createRazorpayOrder(orderId)
      setActiveRzpOrder({
        razorpayOrderId: rzpData.razorpayOrderId,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId: rzpData.keyId,
      })

      const scriptLoaded = await loadRazorpayScript()

      if (scriptLoaded && window.Razorpay) {
        const rzp = new window.Razorpay({
          key: rzpData.keyId,
          amount: rzpData.amount,
          currency: rzpData.currency,
          name: 'KAVORYN',
          description: `Art Print Order ${rzpData.orderNumber}`,
          order_id: rzpData.razorpayOrderId,
          prefill: {
            name: rzpData.customer.name,
            email: rzpData.customer.email,
            contact: rzpData.customer.phone,
          },
          theme: {
            color: '#171717',
          },
          handler: async (response) => {
            await handleVerifyPayment(
              orderId,
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            )
          },
          modal: {
            ondismiss: async () => {
              setPaymentDismissed(true)
              await storeBackend.recordPaymentFailure(
                orderId,
                'Customer dismissed Razorpay checkout modal.'
              )
            },
          },
        })

        rzp.open()
      }
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Could not initialize Razorpay checkout.'
      )
    } finally {
      setIsOpeningRazorpay(false)
    }
  }

  // Step 3: Verify Payment Cryptographic Signature on Backend
  const handleVerifyPayment = async (
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ) => {
    setIsVerifying(true)
    setPaymentError(null)

    try {
      const verified = await storeBackend.verifyRazorpayPayment({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      })

      const fullOrder = await storeBackend.getOrderById(verified.orderId)
      setVerifiedPaidOrder(fullOrder)
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Cryptographic verification failed.'
      )
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <section className="checkout-page section" aria-label="Checkout process">
      <div className="checkout-nav">
        <Link to="/cart" className="checkout-back-link">
          <ArrowLeft size={16} />
          <span>RETURN TO CART</span>
        </Link>
      </div>

      <div className="checkout-header">
        <p className="eyebrow">
          {verifiedPaidOrder
            ? 'ORDER CONFIRMED · PAYMENT CAPTURED'
            : createdOrder
              ? 'STEP 2 OF 2 · RAZORPAY STANDARD CHECKOUT'
              : 'STEP 1 OF 2 · AUTHORITATIVE ORDER CREATION'}
        </p>
        <h1 className="checkout-title">
          {verifiedPaidOrder ? (
            <>
              WALLS READY.
              <br />
              ORDER PAID.
            </>
          ) : createdOrder ? (
            <>
              COMPLETE
              <br />
              PAYMENT.
            </>
          ) : (
            <>
              WHERE SHOULD
              <br />
              WE SEND IT?
            </>
          )}
        </h1>
      </div>

      <div className="checkout-layout">
        {/* Left Form / State column */}
        <div className="checkout-main">
          {errorMsg && (
            <div className="form-error-banner" role="alert">
              <Info size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STATE 3: Payment Verified & Confirmed */}
          {verifiedPaidOrder ? (
            <div className="checkout-notice-card success" role="alert">
              <div className="notice-icon success" aria-hidden="true">
                <CheckCircle size={32} />
              </div>
              <div className="notice-content">
                <div className="created-order-badge">
                  <span>ORDER NUMBER:</span>
                  <strong>{verifiedPaidOrder.orderNumber}</strong>
                </div>

                <div className="security-badge-pill">
                  <ShieldCheck size={14} />
                  <span>PAYMENT VERIFIED VIA RAZORPAY (HMAC-SHA256)</span>
                </div>

                <h3>PAYMENT SUCCESSFUL & CONFIRMED</h3>
                <p>
                  Your payment has been cryptographically verified on our backend.
                  Your order is registered in the production queue for fine-art printing.
                </p>

                <div className="order-price-breakdown">
                  <div>
                    <span>Authoritative Total:</span>{' '}
                    <strong>{formatMoney(verifiedPaidOrder.total)}</strong>
                  </div>
                  <div>
                    <span>Razorpay Order ID:</span>{' '}
                    <code>{verifiedPaidOrder.razorpayOrderId}</code>
                  </div>
                  <div>
                    <span>Razorpay Payment ID:</span>{' '}
                    <code>{verifiedPaidOrder.razorpayPaymentId}</code>
                  </div>
                  <div>
                    <span>Payment Status:</span>{' '}
                    <span className="status-pill paid">PAID</span>
                  </div>
                </div>

                <div className="notice-actions">
                  <Link to="/profile" className="button blue">
                    <span>VIEW IN MY ORDERS</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link to="/track-order" className="button outline">
                    <span>TRACK SHIPMENT</span>
                  </Link>
                  <Link to="/shop" className="button outline">
                    <span>CONTINUE BROWSING</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : createdOrder ? (
            /* STATE 2: Order Created, Awaiting Razorpay Completion */
            <div className="checkout-notice-card" role="alert">
              <div className="notice-icon" aria-hidden="true">
                <Lock size={28} />
              </div>
              <div className="notice-content">
                <div className="created-order-badge">
                  <span>ORDER NUMBER:</span>
                  <strong>{createdOrder.orderNumber}</strong>
                </div>

                <h3>ORDER REGISTERED (STATUS: PENDING PAYMENT)</h3>
                <p>
                  Your order record is registered with server-verified pricing.
                  Complete payment via Razorpay Standard Checkout below.
                </p>

                <div className="order-price-breakdown">
                  <div>
                    <span>Authoritative Subtotal:</span>{' '}
                    <strong>{formatMoney(createdOrder.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Shipping Fee:</span>{' '}
                    <strong>
                      {createdOrder.shippingFee === 0
                        ? 'FREE'
                        : formatMoney(createdOrder.shippingFee)}
                    </strong>
                  </div>
                  <div>
                    <span>Order Total:</span>{' '}
                    <strong>{formatMoney(createdOrder.total)}</strong>
                  </div>
                </div>

                {/* Verification in Progress Spinner */}
                {isVerifying && (
                  <div className="form-verifying-banner" role="status" aria-live="polite">
                    <Loader2 size={18} className="spinner" />
                    <span>Verifying HMAC-SHA256 signature with Razorpay backend...</span>
                  </div>
                )}

                {/* Error Banner */}
                {paymentError && (
                  <div className="form-error-banner" role="alert">
                    <AlertCircle size={18} />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Dismissed Banner */}
                {paymentDismissed && !paymentError && (
                  <div className="form-warning-banner" role="alert">
                    <AlertCircle size={18} />
                    <span>
                      Checkout modal closed before completing payment.
                      You can retry payment without creating a duplicate order.
                    </span>
                  </div>
                )}

                {/* Primary Payment Action: Razorpay Standard Checkout */}
                <div className="razorpay-action-box">
                  <button
                    type="button"
                    className="button blue full-width-btn"
                    onClick={() => handleLaunchRazorpay(createdOrder.orderId)}
                    disabled={isOpeningRazorpay || isVerifying}
                  >
                    {isOpeningRazorpay ? (
                      <>
                        <Loader2 size={16} className="spinner" />
                        <span>OPENING RAZORPAY STANDARD CHECKOUT...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>PAY WITH RAZORPAY — {formatMoney(createdOrder.total)}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div className="security-notice">
                    <ShieldCheck size={16} />
                    <span>
                      Razorpay Standard Checkout · 256-bit SSL encryption.
                      Supports UPI, Cards, NetBanking, and Wallets.
                    </span>
                  </div>
                </div>

                <div className="notice-actions secondary">
                  <Link to="/cart" className="button outline">
                    <span>EDIT ORDER & RETURN TO CART</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 1: Contact & Address Entry Form */
            <form onSubmit={handleSubmit} className="checkout-form" aria-label="Shipping address form">
              <div className="form-card">
                <h3 className="form-card-title">1. CONTACT INFORMATION</h3>
                <div className="form-grid">
                  <label className="form-field">
                    <span>FULL NAME *</span>
                    <input
                      required
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Aarav Sharma"
                      autoComplete="name"
                    />
                  </label>

                  <label className="form-field">
                    <span>EMAIL ADDRESS *</span>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@domain.com"
                      autoComplete="email"
                    />
                    <small className="field-hint">
                      For dispatch notices and order tracking
                    </small>
                  </label>

                  <label className="form-field wide">
                    <span>PHONE NUMBER (FOR DELIVERY) *</span>
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      autoComplete="tel"
                    />
                    <small className="field-hint">
                      Courier partner requires this for delivery coordination
                    </small>
                  </label>
                </div>
              </div>

              <div className="form-card">
                <h3 className="form-card-title">2. SHIPPING ADDRESS (INDIA)</h3>
                <div className="form-grid">
                  <label className="form-field wide">
                    <span>STREET ADDRESS / FLAT / BUILDING *</span>
                    <input
                      required
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Flat 4B, Hill View Apts, 14th Cross"
                      autoComplete="street-address"
                    />
                  </label>

                  <label className="form-field">
                    <span>PIN CODE (6 DIGITS) *</span>
                    <input
                      required
                      inputMode="numeric"
                      pattern="[1-9][0-9]{5}"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleChange}
                      placeholder="e.g. 400050"
                      maxLength={6}
                      autoComplete="postal-code"
                    />
                  </label>

                  <label className="form-field">
                    <span>CITY *</span>
                    <input
                      required
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai"
                      autoComplete="address-level2"
                    />
                  </label>

                  <label className="form-field wide">
                    <span>STATE *</span>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="form-select"
                      required
                      autoComplete="address-level1"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="checkout-submit-bar">
                <button
                  type="submit"
                  className="button blue submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>VALIDATING & CREATING ORDER...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>CONTINUE TO RAZORPAY — {formatMoney(previewGrandTotal)}</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
                <div className="security-notice">
                  <ShieldCheck size={16} />
                  <span>
                    Payment is created and verified securely on the server.
                    Razorpay credentials are never exposed in frontend code.
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Right Order Summary sidebar */}
        <aside className="checkout-sidebar" aria-label="Items in order">
          <div className="sidebar-box">
            <h3 className="sidebar-title">YOUR SELECTION ({lines.length} items)</h3>

            <div className="checkout-items-list">
              {lines.map((l, i) => (
                <div key={i} className="checkout-mini-item">
                  <div className="mini-thumb">
                    <Poster p={l.product} />
                  </div>
                  <div className="mini-info">
                    <h4>{l.product.name}</h4>
                    <span className="mini-meta">
                      {l.size} · {l.finish} · Qty {l.qty}
                    </span>
                    <strong className="mini-price">
                      {formatMoney(getProductPrice(l.size, l.finish) * l.qty)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            <hr className="sidebar-divider" />

            <div className="summary-row">
              <span>SUBTOTAL</span>
              <b>{formatMoney(previewSubtotal)}</b>
            </div>

            <div className="summary-row">
              <span>SHIPPING</span>
              <b>{previewShippingFee === 0 ? 'FREE' : formatMoney(previewShippingFee)}</b>
            </div>

            <div className="summary-row">
              <span>TAXES</span>
              <b>INCLUDED</b>
            </div>

            <hr className="sidebar-divider" />

            <div className="summary-row grand-total-row">
              <strong>ESTIMATED TOTAL</strong>
              <strong>{formatMoney(previewGrandTotal)}</strong>
            </div>

            <div className="checkout-trust-points">
              <span>✦ Museum-grade 230 GSM matte print</span>
              <span>✦ Delivered in rigid triangular tube</span>
              <span>✦ Dispatched from Mumbai studio</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
