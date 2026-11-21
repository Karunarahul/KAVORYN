import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { formatMoney } from '../data'
import { storeBackend } from '../lib/convex-client'

export const TrackOrderPage: React.FC = () => {
  const [orderNumber, setOrderNumber] = useState('')
  const [verificationKey, setVerificationKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState<{
    orderNumber: string
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
    paymentStatus: string
    razorpayOrderId?: string
    createdAt: number
    paidAt?: number
    city: string
    state: string
    postalCode: string
    line1: string
    itemCount: number
    items: Array<{
      name: string
      sku: string
      size: string
      finish: string
      qty: number
      unitPrice: number
      subtotal: number
    }>
    subtotal: number
    shippingFee: number
    total: number
  } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSearched(true)
    setErrorMessage(null)
    setTrackedOrder(null)

    try {
      const result = await storeBackend.trackOrderVerified(orderNumber, verificationKey)
      if (result) {
        setTrackedOrder(result)
      } else {
        setErrorMessage(
          'Order verification failed. No record matches this Order Number and checkout Email or PIN code.'
        )
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Database connection error during lookup.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="static-page section track-page">
      <div className="static-header">
        <p className="eyebrow">ORDER LOGISTICS · VERIFIED DISPATCH STATUS</p>
        <h1 className="static-title">
          WHERE’S
          <br />
          <em>MY PRINT?</em>
        </h1>
        <p className="static-lede">
          Enter your Order Number and checkout Email or 6-digit PIN code to
          verify and inspect production and transit progress directly from the studio.
        </p>
      </div>

      <div className="track-layout">
        <div className="track-form-card">
          <form
            onSubmit={handleTrack}
            className="track-form"
            aria-label="Order tracking lookup form"
          >
            <label className="form-field">
              <span>ORDER NUMBER *</span>
              <div className="track-input-wrap">
                <Search size={18} />
                <input
                  required
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. KVR-2026-ABCD"
                />
              </div>
              <small className="field-hint">
                Found on your order confirmation screen or checkout receipt.
              </small>
            </label>

            <label className="form-field">
              <span>VERIFICATION KEY (CHECKOUT EMAIL OR PIN CODE) *</span>
              <input
                required
                value={verificationKey}
                onChange={(e) => setVerificationKey(e.target.value)}
                placeholder="The email or 6-digit PIN used at checkout"
              />
              <small className="field-hint">
                We verify customer identity before disclosing shipping destination and contents.
              </small>
            </label>

            <button
              type="submit"
              className="button blue track-btn"
              disabled={isLoading || !orderNumber.trim() || !verificationKey.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>QUERYING STUDIO DATABASE...</span>
                </>
              ) : (
                <>
                  <span>VERIFY & TRACK ORDER</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {searched && !isLoading && (
            <>
              {errorMessage && (
                <div className="track-not-found" role="alert">
                  <HelpCircle size={28} />
                  <div>
                    <h4>VERIFICATION MISMATCH</h4>
                    <p>{errorMessage}</p>
                    <small>
                      Need assistance? Contact our studio on WhatsApp or write to{' '}
                      <strong>studio@kavoryn.com</strong>.
                    </small>
                  </div>
                </div>
              )}

              {trackedOrder && (
                <div className="track-result-card" role="status">
                  <div className="track-card-head">
                    <div>
                      <span className="order-num-label">VERIFIED ORDER:</span>
                      <h3>{trackedOrder.orderNumber}</h3>
                    </div>
                    <span className={`status-pill pill-${trackedOrder.status}`}>
                      {trackedOrder.status === 'paid' && <CheckCircle2 size={14} />}
                      {trackedOrder.status === 'pending' && <Clock size={14} />}
                      {trackedOrder.status === 'fulfilled' && <PackageCheck size={14} />}
                      {trackedOrder.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Production & Logistics Visual Timeline */}
                  <div className="logistics-timeline">
                    <div className="timeline-node node-active">
                      <div className="node-icon">
                        <CheckCircle2 size={18} />
                      </div>
                      <div className="node-content">
                        <strong>ORDER RECEIVED</strong>
                        <span>
                          {new Date(trackedOrder.createdAt).toLocaleDateString('en-IN', {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`timeline-node ${
                        trackedOrder.status === 'paid' || trackedOrder.status === 'fulfilled'
                          ? 'node-active'
                          : 'node-pending'
                      }`}
                    >
                      <div className="node-icon">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="node-content">
                        <strong>PAYMENT CAPTURED</strong>
                        <span>
                          {trackedOrder.paidAt
                            ? new Date(trackedOrder.paidAt).toLocaleDateString('en-IN', {
                                dateStyle: 'medium',
                              })
                            : 'Awaiting Settlement'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`timeline-node ${
                        trackedOrder.status === 'paid' || trackedOrder.status === 'fulfilled'
                          ? 'node-active'
                          : 'node-pending'
                      }`}
                    >
                      <div className="node-icon">
                        <Clock size={18} />
                      </div>
                      <div className="node-content">
                        <strong>ARCHIVAL PRINTING</strong>
                        <span>230 GSM Museum Matte</span>
                      </div>
                    </div>

                    <div
                      className={`timeline-node ${
                        trackedOrder.status === 'fulfilled' ? 'node-active' : 'node-pending'
                      }`}
                    >
                      <div className="node-icon">
                        <Truck size={18} />
                      </div>
                      <div className="node-content">
                        <strong>DISPATCHED (TRIANGULAR TUBE)</strong>
                        <span>
                          {trackedOrder.status === 'fulfilled'
                            ? 'In Transit Pan-India'
                            : 'Queue: In Production'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="track-details-grid">
                    <div>
                      <span>ORDER DATE:</span>
                      <strong>
                        {new Date(trackedOrder.createdAt).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </strong>
                    </div>
                    <div>
                      <span>DESTINATION:</span>
                      <strong>
                        {trackedOrder.city}, {trackedOrder.state} — {trackedOrder.postalCode}
                      </strong>
                    </div>
                    <div>
                      <span>ORDER TOTAL:</span>
                      <strong>{formatMoney(trackedOrder.total)}</strong>
                    </div>
                  </div>

                  <div className="track-items-summary">
                    <h4>PRINT SPECIFICATIONS ({trackedOrder.itemCount} PIECES)</h4>
                    <div className="track-items-list">
                      {trackedOrder.items.map((item, idx) => (
                        <div key={idx} className="track-item-line">
                          <div>
                            <strong>{item.name}</strong>
                            <small>
                              SKU: {item.sku} · Size: {item.size} · Finish: {item.finish}
                            </small>
                          </div>
                          <span>
                            {item.qty} × {formatMoney(item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="track-dispatch-note">
                    <MapPin size={16} />
                    <span>
                      Standard courier delivery across India takes 3 to 5 business days from
                      dispatch. All prints are packaged in heavy-gauge triangular tubes with zero edge contact.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="track-help-sidebar">
          <div className="help-card">
            <h4>PRINT SPECIFICATIONS</h4>
            <p>
              Every KAVORYN print is crafted on 230 GSM archival stock using
              pigment-based inks that resist UV degradation.
            </p>
            <div className="help-stat">
              <span>PACKAGING:</span>
              <strong>Heavy-Duty Triangular Tube</strong>
            </div>
            <div className="help-stat">
              <span>DISPATCH LOCATION:</span>
              <strong>Bengaluru / Mumbai Print Studio</strong>
            </div>
          </div>

          <div className="help-card">
            <h4>NEED DIRECT HELP?</h4>
            <p>
              Our production desk can answer questions about sizing, frame compatibility,
              or delivery rerouting.
            </p>
            <Link to="/contact" className="button outline full-width">
              <span>TALK TO STUDIO</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
