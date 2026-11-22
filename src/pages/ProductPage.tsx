import React, { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Shield,
  Truck,
  Sparkles,
} from 'lucide-react'
import {
  collections,
  finishDetails,
  finishPrices,
  formatMoney,
  getProductPrice,
  prices,
  products,
  shippingConfig,
  sizeDimensions,
} from '../data'
import { Poster } from '../components/Poster'
import { ProductCard } from '../components/ProductCard'
import type { CartLine, PosterFinish, PosterSize } from '../types'

interface ProductPageProps {
  add: (line: CartLine) => void
}

export const ProductPage: React.FC<ProductPageProps> = ({ add }) => {
  const { slug } = useParams<{ slug: string }>()
  const p = products.find((x) => x.slug === slug)

  const [size, setSize] = useState<PosterSize>('A3')
  const [finish, setFinish] = useState<PosterFinish>('Matte')
  const [qty, setQty] = useState<number>(1)
  const [isAdded, setIsAdded] = useState<boolean>(false)
  const [openSpec, setOpenSpec] = useState<'paper' | 'frame' | 'shipping' | null>(
    'paper'
  )

  if (!p) {
    return <Navigate to="/shop" replace />
  }

  // Dynamic pricing based on selected size AND finish
  const unitPrice = getProductPrice(size, finish)
  const totalPrice = unitPrice * qty

  const handleAddToCart = () => {
    add({
      product: p,
      size,
      finish,
      qty,
    })
    setIsAdded(true)
    setTimeout(() => {
      setIsAdded(false)
    }, 2200)
  }

  // Related products from the same or different collections, excluding current
  const related = products
    .filter((x) => x.id !== p.id)
    .sort((a) => (a.collection === p.collection ? -1 : 1))
    .slice(0, 3)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku,
    category: `Art Prints > ${collections[p.collection]}`,
    brand: {
      '@type': 'Brand',
      name: 'KAVORYN Studio',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: prices.A4,
      highPrice: prices.A1 + finishPrices.Gloss,
      offerCount: 8,
      priceValidUntil: '2027-12-31',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'KAVORYN Studio',
      },
    },
  }

  return (
    <div className="product-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Breadcrumb Navigation */}
      <nav className="product-breadcrumbs" aria-label="Breadcrumb navigation">
        <Link to="/">HOME</Link>
        <span aria-hidden="true">/</span>
        <Link to="/shop">THE FIRST EDITION</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/collections/${p.collection}`}>
          {collections[p.collection]}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="current" aria-current="page">{p.name}</span>
      </nav>

      {/* Main PDP Grid */}
      <section className="product-page">
        {/* Left: Poster Stage */}
        <div className="product-stage">
          <div className="product-stage-inner">
            <Poster p={p} large />
          </div>

          <div className="palette-breakdown">
            <span className="palette-label">STUDIO PALETTE</span>
            <div className="palette-items">
              {p.colors.map((hex, idx) => (
                <div key={idx} className="palette-item">
                  <span
                    className="palette-color-block"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="palette-hex">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Product Purchase Console */}
        <div className="product-info">
          <div className="product-header-block">
            <div className="product-collection-row">
              <span className="eyebrow">{collections[p.collection]}</span>
              <span className="product-sku-badge">{p.sku}</span>
            </div>
            <h1 className="product-name">{p.name}</h1>
            <div className="product-pricing-bar">
              <span className="product-active-price" aria-live="polite">
                {formatMoney(totalPrice)}
              </span>
              {qty > 1 && (
                <span className="product-unit-hint">
                  ({formatMoney(unitPrice)} each)
                </span>
              )}
              <span className="tax-inclusive-tag">TAX INCLUDED · UNFRAMED</span>
            </div>
            <p className="product-description-lede">{p.description}</p>
          </div>

          {/* Size Selector with Detailed Dimensions */}
          <div className="choice-section">
            <div className="choice-header">
              <span className="choice-title">
                SELECT SIZE
                <b className="choice-selection-value">{size} ({sizeDimensions[size].cm})</b>
              </span>
            </div>
            <div className="size-selector-grid" role="radiogroup" aria-label="Poster size">
              {(Object.keys(prices) as PosterSize[]).map((s) => {
                const dim = sizeDimensions[s]
                const isSelected = size === s
                const sPrice = getProductPrice(s, finish)
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`size-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    <div className="size-btn-top">
                      <strong className="size-code">{s}</strong>
                      <span className="size-price">{formatMoney(sPrice)}</span>
                    </div>
                    <span className="size-cm">{dim.cm}</span>
                    <span className="size-in">{dim.inches}</span>
                    <small className="size-usage">{dim.label}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Paper Finish Selector with Dynamic Price Adjustment */}
          <div className="choice-section">
            <div className="choice-header">
              <span className="choice-title">
                PAPER FINISH
                <b className="choice-selection-value">
                  {finishDetails[finish].label} ({finishDetails[finish].gsm})
                </b>
              </span>
            </div>
            <div className="finish-selector-grid" role="radiogroup" aria-label="Paper finish">
              {(['Matte', 'Gloss'] as const).map((f) => {
                const info = finishDetails[f]
                const isSelected = finish === f
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`finish-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => setFinish(f)}
                  >
                    <div className="finish-head">
                      <strong>{info.label}</strong>
                      <span className="finish-badge">
                        {info.surcharge > 0
                          ? `+${formatMoney(info.surcharge)}`
                          : 'INCLUDED'}
                      </span>
                    </div>
                    <p className="finish-text">{info.desc}</p>
                    <small className="finish-gsm-tag">{info.gsm}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantity and Add To Cart Bar */}
          <div className="purchase-controls">
            <div className="quantity-selector" role="group" aria-label="Quantity selector">
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                disabled={qty <= 1}
              >
                <Minus size={14} />
              </button>
              <span className="qty-number" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="qty-btn"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              className={`button blue add-to-cart-btn ${isAdded ? 'added' : ''}`}
              onClick={handleAddToCart}
            >
              {isAdded ? (
                <>
                  <Check size={18} />
                  <span>ADDED TO SELECTION ✓</span>
                </>
              ) : (
                <>
                  <span>ADD TO CART — {formatMoney(totalPrice)}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Quick Assurance List */}
          <ul className="assurance-list">
            <li>
              <Check size={16} />
              <span>
                <strong>Museum-Grade Stock:</strong> 100% acid-free fine art
                archival paper.
              </span>
            </li>
            <li>
              <Truck size={16} />
              <span>
                <strong>Pan-India Delivery:</strong> Dispatched in {shippingConfig.estimatedTransit} in protective rigid tubes. Free over {formatMoney(shippingConfig.freeShippingThreshold)}.
              </span>
            </li>
            <li>
              <Shield size={16} />
              <span>
                <strong>Anti-Fade Guarantee:</strong> Archival mineral pigment
                inks engineered to last.
              </span>
            </li>
            <li>
              <Sparkles size={16} />
              <span>
                <strong>Ready to Frame:</strong> Universal standard sizing fits
                Ikea & local framers easily.
              </span>
            </li>
          </ul>

          {/* Specifications Accordion */}
          <div className="specs-accordion">
            <div className="accordion-item">
              <button
                type="button"
                aria-expanded={openSpec === 'paper'}
                className="accordion-trigger"
                onClick={() =>
                  setOpenSpec(openSpec === 'paper' ? null : 'paper')
                }
              >
                <span>PAPER & PRINT ARCHITECTURE</span>
                {openSpec === 'paper' ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {openSpec === 'paper' && (
                <div className="accordion-panel">
                  <p>
                    Each print is produced using fine art giclée reproduction
                    techniques with 12-color archival pigment inks. We print on
                    230 GSM matte alpha-cellulose paper that is naturally acid-
                    and lignin-free to ensure colors do not yellow or fade over
                    time.
                  </p>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                type="button"
                aria-expanded={openSpec === 'frame'}
                className="accordion-trigger"
                onClick={() =>
                  setOpenSpec(openSpec === 'frame' ? null : 'frame')
                }
              >
                <span>FRAMING & DISPLAY RECOMMENDATIONS</span>
                {openSpec === 'frame' ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {openSpec === 'frame' && (
                <div className="accordion-panel">
                  <p>
                    All KAVORYN prints are cut to precise international standard
                    dimensions ({size}: {sizeDimensions[size].cm}). They fit
                    standard picture frames readily available from Ikea (Ribba,
                    Lomviken, Sannahed), Amazon, or local Indian framing shops
                    without custom mat cutting.
                  </p>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                type="button"
                aria-expanded={openSpec === 'shipping'}
                className="accordion-trigger"
                onClick={() =>
                  setOpenSpec(openSpec === 'shipping' ? null : 'shipping')
                }
              >
                <span>SHIPPING & PACKAGING SPECIFICATION</span>
                {openSpec === 'shipping' ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
              {openSpec === 'shipping' && (
                <div className="accordion-panel">
                  <p>
                    Prints are rolled with protective glassine tissue paper and
                    sealed in heavy-duty triangular rigid cardboard tubes.
                    Triangular tubes do not roll off transport belts or get
                    crushed under heavier boxes, guaranteeing pristine,
                    uncreased delivery to your door.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      <section className="section related-section">
        <div className="section-head">
          <p className="eyebrow">CURATED COMPANIONS</p>
          <h2>
            COMPLETE
            <br />
            THE WALL.
          </h2>
          <Link to="/shop" className="section-head-link">
            <span>VIEW ENTIRE CATALOG</span>
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {related.map((item) => (
            <ProductCard key={item.id} p={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
