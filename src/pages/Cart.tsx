import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react'
import {
  collections,
  finishDetails,
  formatMoney,
  getProductPrice,
  shippingConfig,
  sizeDimensions,
} from '../data'
import { Poster } from '../components/Poster'
import type { CartLine } from '../types'

interface CartProps {
  lines: CartLine[]
  setLines: (updater: (prev: CartLine[]) => CartLine[]) => void
}

export const Cart: React.FC<CartProps> = ({ lines, setLines }) => {
  const subtotal = lines.reduce(
    (acc, line) => acc + getProductPrice(line.size, line.finish) * line.qty,
    0
  )

  const isFreeShipping = subtotal >= shippingConfig.freeShippingThreshold
  const shippingFee = lines.length === 0 ? 0 : isFreeShipping ? 0 : shippingConfig.standardShippingFee
  const grandTotal = subtotal + shippingFee
  const amountToFreeShipping = Math.max(0, shippingConfig.freeShippingThreshold - subtotal)

  const updateQuantity = (index: number, delta: number) => {
    setLines((prev) =>
      prev
        .map((item, idx) => {
          if (idx !== index) return item
          const newQty = item.qty + delta
          return newQty > 0 ? { ...item, qty: newQty } : null
        })
        .filter((item): item is CartLine => item !== null)
    )
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index))
  }

  return (
    <section className="cart-page section" aria-label="Shopping cart">
      <div className="cart-header">
        <p className="eyebrow">YOUR SELECTION · {lines.reduce((a, l) => a + l.qty, 0)} ITEMS</p>
        <h1 className="cart-title">
          THE WALL
          <br />
          IS WAITING.
        </h1>
      </div>

      {lines.length === 0 ? (
        <div className="cart-empty-view">
          <div className="empty-icon-wrap" aria-hidden="true">
            <ShoppingBag size={42} />
          </div>
          <h2>YOUR CART IS CURRENTLY A BLANK CANVAS.</h2>
          <p className="empty-subtext">
            No prints selected yet. Explore our curated First Edition of 12
            contemporary compositions designed to start conversations.
          </p>

          <div className="empty-collection-shortcuts">
            <span className="shortcuts-label">QUICK EXPLORE BY THEME:</span>
            <div className="shortcuts-pills">
              {Object.entries(collections).map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/collections/${slug}`}
                  className="shortcut-pill"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>

          <Link className="button blue empty-cta" to="/shop">
            <span>EXPLORE THE FIRST EDITION</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Main items column */}
          <div className="cart-items-column">
            {/* Configurable Shipping Threshold Progress Meter */}
            <div className="shipping-progress-banner" role="status" aria-live="polite">
              <div className="shipping-progress-header">
                <Truck size={18} aria-hidden="true" />
                {isFreeShipping ? (
                  <span className="shipping-unlocked-text">
                    <strong>FREE SHIPPING UNLOCKED!</strong> Your order qualifies
                    for complimentary pan-India courier delivery.
                  </span>
                ) : (
                  <span>
                    Add <strong>{formatMoney(amountToFreeShipping)}</strong> more
                    to unlock <strong>FREE Express Shipping</strong> across India!
                  </span>
                )}
              </div>
              <div
                className="shipping-meter-bar"
                role="progressbar"
                aria-valuenow={Math.min(100, Math.round((subtotal / shippingConfig.freeShippingThreshold) * 100))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward free shipping"
              >
                <div
                  className="shipping-meter-fill"
                  style={{
                    width: `${Math.min(100, (subtotal / shippingConfig.freeShippingThreshold) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="cart-lines-list">
              {lines.map((l, i) => {
                const itemUnitPrice = getProductPrice(l.size, l.finish)
                const lineTotal = itemUnitPrice * l.qty
                const dim = sizeDimensions[l.size]
                const finishInfo = finishDetails[l.finish]

                return (
                  <article
                    key={`${l.product.id}-${l.size}-${l.finish}-${i}`}
                    className="cart-line-card"
                    aria-label={`${l.product.name} - ${l.size} ${l.finish}`}
                  >
                    <div className="cart-line-thumb">
                      <Poster p={l.product} />
                    </div>

                    <div className="cart-line-details">
                      <div className="cart-line-top">
                        <span className="cart-line-collection">
                          {collections[l.product.collection]} · {l.product.sku}
                        </span>
                        <button
                          type="button"
                          className="cart-line-remove"
                          onClick={() => removeLine(i)}
                          aria-label={`Remove ${l.product.name} ${l.size} ${l.finish} from cart`}
                        >
                          <Trash2 size={15} />
                          <span>REMOVE</span>
                        </button>
                      </div>

                      <h3 className="cart-line-title">
                        <Link to={`/product/${l.product.slug}`}>
                          {l.product.name}
                        </Link>
                      </h3>

                      <div className="cart-line-specs">
                        <span className="spec-badge size-badge">
                          SIZE: {l.size} ({dim.cm})
                        </span>
                        <span className="spec-badge finish-badge">
                          FINISH: {finishInfo.label.toUpperCase()} ({finishInfo.gsm})
                        </span>
                      </div>

                      <div className="cart-line-bottom">
                        <div className="quantity-controls" role="group" aria-label={`Quantity for ${l.product.name}`}>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => updateQuantity(i, -1)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="qty-val" aria-live="polite">{l.qty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => updateQuantity(i, 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="cart-line-pricing">
                          {l.qty > 1 && (
                            <span className="unit-price-hint">
                              {formatMoney(itemUnitPrice)} each
                            </span>
                          )}
                          <strong className="line-total-price">
                            {formatMoney(lineTotal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="cart-actions-row">
              <Link to="/shop" className="continue-shopping-link">
                ← CONTINUE BROWSING PRINTS
              </Link>
            </div>
          </div>

          {/* Sidebar summary */}
          <aside className="cart-summary-aside" aria-label="Order summary">
            <div className="summary-box">
              <h2 className="summary-title">ORDER SUMMARY</h2>

              <div className="summary-row">
                <span>SUBTOTAL ({lines.reduce((a, l) => a + l.qty, 0)} items)</span>
                <b>{formatMoney(subtotal)}</b>
              </div>

              <div className="summary-row">
                <span>
                  PAN-INDIA SHIPPING
                  {isFreeShipping && <small className="free-tag"> FREE</small>}
                </span>
                <b>{shippingFee === 0 ? 'FREE' : formatMoney(shippingFee)}</b>
              </div>

              <div className="summary-row">
                <span>ESTIMATED TAXES</span>
                <b>INCLUDED</b>
              </div>

              <hr className="summary-divider" />

              <div className="summary-row summary-total">
                <strong>ESTIMATED TOTAL</strong>
                <strong className="grand-total-amount">
                  {formatMoney(grandTotal)}
                </strong>
              </div>

              <p className="summary-note">
                Prices in Indian Rupees (INR). Duties and taxes included.
              </p>

              <Link className="button blue checkout-btn" to="/checkout">
                <span>PROCEED TO SECURE CHECKOUT</span>
                <ArrowRight size={16} />
              </Link>

              <div className="summary-guarantees">
                <div className="guarantee-item">
                  <span>✦ 100% Archival 230 GSM Paper</span>
                </div>
                <div className="guarantee-item">
                  <span>✦ Triangular Tube Packaging — No Creases</span>
                </div>
                <div className="guarantee-item">
                  <span>✦ Pan-India Tracked Courier Dispatch</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
