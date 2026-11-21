import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react'
import { collections, formatMoney } from '../data'
import { storeBackend } from '../lib/convex-client'

export const AboutPage: React.FC = () => {
  return (
    <section className="static-page section about-page">
      <div className="static-header">
        <p className="eyebrow">THE KAVORYN STUDIO · MANIFESTO</p>
        <h1 className="static-title">
          WE PRINT
          <br />
          <em>CONVERSATIONS.</em>
        </h1>
        <p className="static-lede">
          KAVORYN is a contemporary art print studio based in India. We design
          visual matter for rooms that refuse the quiet, generic, and expected.
        </p>
      </div>

      <div className="about-content-grid">
        <div className="about-narrative">
          <h2>THE WALL SHOULD NEVER BE AN AFTERTHOUGHT.</h2>
          <p>
            Too much wall art exists merely to blend into the background. It
            matches the curtains, stays polite, and says nothing.
          </p>
          <p>
            We started KAVORYN with an opposite conviction: when someone walks
            into your room, their eyes should halt. The artwork on your wall is
            an index of your curiosity, your taste, and your stubborn refusal of
            the beige and ordinary.
          </p>

          <div className="about-quote-box">
            <blockquote>
              "Art doesn’t exist to reassure the furniture. It exists to stir the
              mind."
            </blockquote>
            <cite>— KAVORYN STUDIO MANIFESTO</cite>
          </div>

          <h2>PRINT ON DEMAND, CRAFTED WITH OBSESSION.</h2>
          <p>
            We don't warehouse dusty stockpiles of mass-manufactured prints.
            Every single poster is printed on demand specifically for you:
          </p>
          <ul className="about-spec-bullets">
            <li>
              <strong>230 GSM Museum-Grade Matte:</strong> Ultra-heavyweight,
              glare-free, 100% acid-free paper stock with velvety tactile depth.
            </li>
            <li>
              <strong>12-Color Archival Pigments:</strong> Mineral inks that
              deliver electric cobalts, deep inky blacks, and vivid acid accents
              with a multi-decade anti-fade guarantee.
            </li>
            <li>
              <strong>Rigid Triangular Tubes:</strong> Never folded, never
              creased. Delivered safely across all Indian pin codes.
            </li>
          </ul>
        </div>

        <div className="about-sidebar">
          <div className="about-stat-card">
            <span className="stat-num">12</span>
            <strong>FIRST EDITION PRINTS</strong>
            <p>Spanning six intentional visual directions.</p>
          </div>

          <div className="about-stat-card">
            <span className="stat-num">230</span>
            <strong>GSM FINE ART PAPER</strong>
            <p>Museum-grade matte stock that holds maximum ink density.</p>
          </div>

          <div className="about-stat-card">
            <span className="stat-num">100%</span>
            <strong>PRINTED IN INDIA</strong>
            <p>Conceived by independent visual artists and printed locally.</p>
          </div>

          <div className="about-explore-box">
            <h4>EXPLORE THE EDITIONS</h4>
            <div className="about-links-list">
              {Object.entries(collections).map(([slug, name]) => (
                <Link key={slug} to={`/collections/${slug}`}>
                  <span>{name}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="static-page section contact-page">
      <div className="static-header">
        <p className="eyebrow">GET IN TOUCH · KAVORYN STUDIO</p>
        <h1 className="static-title">
          TALK TO
          <br />
          <em>US.</em>
        </h1>
        <p className="static-lede">
          Questions about sizing, custom commissions, interior collaborations, or
          wholesale orders? We’re always listening.
        </p>
      </div>

      <div className="contact-layout">
        <div className="contact-info-col">
          <div className="contact-card">
            <MessageCircle size={24} className="contact-icon" />
            <h3>WHATSAPP STUDIO SUPPORT</h3>
            <p>
              Direct chat with our production and sizing team. Quick answers on
              custom sizing and order updates.
            </p>
            <span className="support-hours">
              Hours: Monday — Saturday · 10:00 AM — 6:00 PM IST
            </span>
            <div className="contact-action-box">
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noreferrer"
                className="button acid"
              >
                <span>OPEN STUDIO WHATSAPP</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className="contact-card">
            <Mail size={24} className="contact-icon" />
            <h3>EMAIL INQUIRIES</h3>
            <p>For press, creative collaborations, and bulk interior projects:</p>
            <code className="contact-email">studio@kavoryn.com</code>
          </div>

          <div className="contact-card">
            <MapPin size={24} className="contact-icon" />
            <h3>PRINT & DISPATCH STUDIO</h3>
            <p>Prints are produced on demand and dispatched across India.</p>
            <span className="delivery-timing">
              Pan-India courier transit: 3–5 business days
            </span>
          </div>
        </div>

        <div className="contact-form-col">
          <div className="inquiry-form-card">
            <h3>SEND A MESSAGE</h3>

            {submitted ? (
              <div className="inquiry-success" role="alert">
                <Check size={32} />
                <h4>MESSAGE RECEIVED</h4>
                <p>
                  Thank you, <strong>{form.name}</strong>. Our team will review
                  your note and reply within one business day.
                </p>
                <button
                  type="button"
                  className="button outline"
                  onClick={() => setSubmitted(false)}
                >
                  SEND ANOTHER NOTE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="inquiry-form">
                <label className="form-field">
                  <span>YOUR NAME *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Maya Iyer"
                  />
                </label>

                <label className="form-field">
                  <span>EMAIL ADDRESS *</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="maya@example.com"
                  />
                </label>

                <label className="form-field">
                  <span>SUBJECT *</span>
                  <select
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Sizing & Framing Advice">
                      Sizing & Framing Advice
                    </option>
                    <option value="Custom Typography Brief">
                      Custom Typography Brief
                    </option>
                    <option value="Interior Designer & Wholesale">
                      Interior Designer & Wholesale
                    </option>
                    <option value="Order Tracking Help">
                      Order Tracking Help
                    </option>
                  </select>
                </label>

                <label className="form-field">
                  <span>MESSAGE *</span>
                  <textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="Tell us what you have in mind..."
                  />
                </label>

                <button type="submit" className="button blue">
                  <span>SEND INQUIRY</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export const TrackOrderPage: React.FC = () => {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState<{
    orderNumber: string
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
    createdAt: number
    city: string
    state: string
    itemCount: number
    items: Array<{ name: string; size: string; finish: string; qty: number }>
    total: number
  } | null>(null)

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSearched(true)

    try {
      const result = await storeBackend.trackOrder(orderId, email)
      setTrackedOrder(result)
    } catch {
      setTrackedOrder(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="static-page section track-page">
      <div className="static-header">
        <p className="eyebrow">ORDER LOGISTICS · DATABASE TRACKING</p>
        <h1 className="static-title">
          WHERE’S
          <br />
          <em>MY PRINT?</em>
        </h1>
        <p className="static-lede">
          Enter your order number and checkout email to look up live production
          and dispatch status directly from the studio database.
        </p>
      </div>

      <div className="track-layout">
        <div className="track-form-card">
          <form onSubmit={handleTrack} className="track-form" aria-label="Order tracking lookup form">
            <label className="form-field">
              <span>ORDER NUMBER *</span>
              <div className="track-input-wrap">
                <Search size={18} />
                <input
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value.toUpperCase())}
                  placeholder="e.g. KVR-2026-ABCD"
                />
              </div>
            </label>

            <label className="form-field">
              <span>CHECKOUT EMAIL ADDRESS *</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="The email entered at checkout"
              />
            </label>

            <button type="submit" className="button blue track-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>SEARCHING DATABASE...</span>
                </>
              ) : (
                <>
                  <span>QUERY ORDER STATUS</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {searched && !isLoading && (
            trackedOrder ? (
              <div className="track-result-card" role="status">
                <div className="track-card-head">
                  <div>
                    <span className="order-num-label">ORDER NUMBER:</span>
                    <h3>{trackedOrder.orderNumber}</h3>
                  </div>
                  <span className={`status-pill ${trackedOrder.status}`}>
                    {trackedOrder.status === 'paid' && <CheckCircle2 size={14} />}
                    {trackedOrder.status === 'pending' && <Clock size={14} />}
                    {trackedOrder.status === 'fulfilled' && <PackageCheck size={14} />}
                    {trackedOrder.status.toUpperCase()}
                  </span>
                </div>

                <div className="track-details-grid">
                  <div>
                    <span>ORDER DATE:</span>
                    <strong>{new Date(trackedOrder.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>
                  </div>
                  <div>
                    <span>DESTINATION:</span>
                    <strong>{trackedOrder.city}, {trackedOrder.state}</strong>
                  </div>
                  <div>
                    <span>TOTAL AMOUNT:</span>
                    <strong>{formatMoney(trackedOrder.total)}</strong>
                  </div>
                </div>

                <div className="track-items-summary">
                  <h4>ITEMS IN PRODUCTION ({trackedOrder.itemCount}):</h4>
                  <ul>
                    {trackedOrder.items.map((it, idx) => (
                      <li key={idx}>
                        <strong>{it.name}</strong> — {it.size} ({it.finish}) × {it.qty}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="track-status-message">
                  {trackedOrder.status === 'pending' && (
                    <p>
                      <strong>Status: Payment Pending.</strong> Your order record is registered. Once confirmed by the gateway, it moves immediately to print curation.
                    </p>
                  )}
                  {trackedOrder.status === 'paid' && (
                    <p>
                      <strong>Status: Giclée Print Curation.</strong> Payment verified. Your poster is being printed on 230 GSM matte stock.
                    </p>
                  )}
                  {trackedOrder.status === 'fulfilled' && (
                    <p>
                      <strong>Status: Dispatched in Triangular Tube.</strong> Handed to express courier partners for pan-India delivery.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="track-not-found" role="alert">
                <Info size={20} />
                <div>
                  <strong>NO MATCHING ORDER FOUND</strong>
                  <p>
                    We couldn't find an order with number <code>{orderId}</code> for email <code>{email}</code>. Please double-check your order confirmation note.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        <div className="track-guidance-card">
          <h3>HOW DISPATCH WORKS</h3>
          <div className="dispatch-steps">
            <div className="dispatch-step">
              <Sparkles size={18} />
              <div>
                <strong>Day 1: Print & Cure</strong>
                <p>
                  Your poster is giclée-printed on 230 GSM matte stock and cured
                  in the studio for rich pigment absorption.
                </p>
              </div>
            </div>
            <div className="dispatch-step">
              <PackageCheck size={18} />
              <div>
                <strong>Day 2: Inspection & Tube Packing</strong>
                <p>
                  Hand-checked under balanced studio light, wrapped in glassine
                  tissue, and sealed in heavy triangular tubes.
                </p>
              </div>
            </div>
            <div className="dispatch-step">
              <Truck size={18} />
              <div>
                <strong>Days 3–5: Pan-India Delivery</strong>
                <p>
                  Express transit directly to your doorstep with end-to-end SMS
                  and WhatsApp status updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
