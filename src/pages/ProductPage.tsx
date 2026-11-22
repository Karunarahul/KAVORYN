import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
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
  prices,
  products as staticProducts,
  shippingConfig,
  sizeDimensions,
  type Collection,
  type Product,
} from '../data'
import { Poster } from '../components/Poster'
import { ProductCard } from '../components/ProductCard'
import type { CartLine, PosterFinish, PosterSize } from '../types'

interface ProductPageProps {
  add: (line: CartLine) => void
}

export const ProductPage: React.FC<ProductPageProps> = ({ add }) => {
  const { slug } = useParams<{ slug: string }>()

  // Reactive Convex query for product by slug
  const liveDbProduct = useQuery(api.products.getBySlug, { slug: slug || '' })
  const staticProduct = staticProducts.find((x) => x.slug === slug)

  // Explicit state distinctions: loading vs unavailable vs missing vs found
  const isUnavailable = liveDbProduct && 'isUnavailable' in liveDbProduct && Boolean(liveDbProduct.isUnavailable)
  const isMissing = liveDbProduct === null && !staticProduct
  const isLoading = liveDbProduct === undefined && !staticProduct

  const p: Product | undefined =
    liveDbProduct && !isUnavailable
      ? {
          id: liveDbProduct._id,
          slug: liveDbProduct.slug,
          sku: liveDbProduct.sku,
          name: liveDbProduct.name,
          collection: liveDbProduct.collection as Collection,
          description:
            liveDbProduct.description ||
            'Museum-quality archival giclée print produced with mineral pigment inks on 230 GSM matte fine art paper.',
          colors: (liveDbProduct.colors || ['#171717', '#F5F1E8', '#3155E7']) as [string, string, string],
          motif: (liveDbProduct.motif as Product['motif']) || 'circle',
          renderMode:
            (liveDbProduct.renderMode as 'image' | 'procedural') ||
            (liveDbProduct.thumbnailUrl ? 'image' : 'procedural'),
          thumbnailUrl: liveDbProduct.thumbnailUrl,
          galleryUrls: liveDbProduct.galleryUrls,
          lifestyleUrls: liveDbProduct.lifestyleUrls,
        }
      : staticProduct

  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover')
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null)

  const [size, setSize] = useState<PosterSize>('A3')
  const [finish, setFinish] = useState<PosterFinish>('Matte')
  const [qty, setQty] = useState<number>(1)
  const [isAdded, setIsAdded] = useState<boolean>(false)
  const [openSpec, setOpenSpec] = useState<'paper' | 'frame' | 'shipping' | null>(
    'paper'
  )

  // 1. Loading State: Show full loading skeleton while Convex query resolves
  if (isLoading) {
    return (
      <div className="product-page-container">
        <nav className="product-breadcrumbs" aria-label="Loading breadcrumbs">
          <div className="skeleton-line" style={{ width: '180px', height: '14px' }} />
        </nav>

        <section className="product-page">
          <div className="product-stage">
            <div className="product-stage-inner">
              <div className="pdp-skeleton-frame" aria-hidden="true">
                <div className="pdp-skeleton-shimmer" />
              </div>
            </div>
          </div>

          <div className="product-info">
            <div className="product-header-block">
              <div className="skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '0.75rem' }} />
              <div className="skeleton-line" style={{ width: '70%', height: '36px', marginBottom: '1rem' }} />
              <div className="skeleton-line" style={{ width: '140px', height: '28px', marginBottom: '1rem' }} />
              <div className="skeleton-line" style={{ width: '90%', height: '16px', marginBottom: '0.5rem' }} />
              <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '1.5rem' }} />
            </div>

            <div className="choice-section">
              <div className="skeleton-line" style={{ width: '110px', height: '16px', marginBottom: '0.75rem' }} />
              <div className="pdp-skeleton-grid-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="pdp-skeleton-card" />
                ))}
              </div>
            </div>

            <div className="choice-section" style={{ marginTop: '1.5rem' }}>
              <div className="skeleton-line" style={{ width: '110px', height: '16px', marginBottom: '0.75rem' }} />
              <div className="pdp-skeleton-grid-2">
                {[1, 2].map((i) => (
                  <div key={i} className="pdp-skeleton-card" style={{ height: '70px' }} />
                ))}
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <div className="skeleton-line" style={{ width: '100%', height: '48px' }} />
            </div>
          </div>
        </section>
      </div>
    )
  }

  // 2. Unpublished / Archived State: Show informative curation status notice
  if (isUnavailable) {
    return (
      <section className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="customer-restricted-card" role="alert">
          <span className="restricted-eyebrow">CATALOGUE NOTICE</span>
          <h3>PRINT CURRENTLY UNAVAILABLE</h3>
          <p>
            The artwork &ldquo;{liveDbProduct?.name || 'Requested Print'}&rdquo; is currently under studio curation or has been archived from the active public edition.
          </p>
          <div className="restricted-footer-actions">
            <Link to="/shop" className="button blue">
              <span>EXPLORE ACTIVE PRINTS</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // 3. Genuinely Missing Product: Show proper 404 page (never redirect to /shop)
  if (isMissing || !p) {
    return (
      <section className="not-found-page section" style={{ minHeight: '60vh' }}>
        <div className="not-found-content">
          <p className="eyebrow">ERROR 404 · PRINT NOT FOUND</p>
          <h1 className="not-found-title">
            THE COMPOSITION
            <br />
            DOESN’T EXIST.
          </h1>
          <p className="not-found-desc">
            No archival print was found matching &ldquo;{slug}&rdquo;. It may have been renamed, removed, or relocated to another collection.
          </p>
          <div className="not-found-actions">
            <Link to="/shop" className="button blue">
              <span>RETURN TO THE FIRST EDITION</span>
              <ArrowRight size={16} />
            </Link>
            <Link to="/" className="button outline">
              <span>HOME</span>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  // Dynamic pricing based on authoritative Convex prices or static fallback
  const pricesMap = liveDbProduct?.prices || prices
  const finishSurchargesMap = liveDbProduct?.finishSurcharges || finishPrices
  const unitPrice = (pricesMap[size] || 249) + (finishSurchargesMap[finish] || 0)
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
  const related = staticProducts
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
            <Poster
              p={activeMediaUrl ? { ...p, thumbnailUrl: activeMediaUrl } : p}
              large
              objectFit={fitMode}
            />
          </div>

          {/* Media Views Switcher (if gallery or lifestyle mockups exist) */}
          {((p.galleryUrls && p.galleryUrls.length > 0) || (p.lifestyleUrls && p.lifestyleUrls.length > 0)) && (
            <div className="media-views-row" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                className={`button small ${(!activeMediaUrl || activeMediaUrl === p.thumbnailUrl) ? 'blue' : 'outline'}`}
                onClick={() => setActiveMediaUrl(p.thumbnailUrl || null)}
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              >
                MAIN PRINT
              </button>
              {p.galleryUrls?.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`button small ${activeMediaUrl === url ? 'blue' : 'outline'}`}
                  onClick={() => setActiveMediaUrl(url)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  DETAIL {idx + 1}
                </button>
              ))}
              {p.lifestyleUrls?.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`button small ${activeMediaUrl === url ? 'blue' : 'outline'}`}
                  onClick={() => setActiveMediaUrl(url)}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  ROOM {idx + 1}
                </button>
              ))}
            </div>
          )}

          {/* Fit Toggle for Image Mode */}
          {p.renderMode === 'image' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className={`button ghost small ${fitMode === 'cover' ? 'active' : ''}`}
                onClick={() => setFitMode('cover')}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', opacity: fitMode === 'cover' ? 1 : 0.6 }}
              >
                FRAME FIT
              </button>
              <button
                type="button"
                className={`button ghost small ${fitMode === 'contain' ? 'active' : ''}`}
                onClick={() => setFitMode('contain')}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', opacity: fitMode === 'contain' ? 1 : 0.6 }}
              >
                FULL POSTER
              </button>
            </div>
          )}

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
                const sPrice = (pricesMap[s] || prices[s]) + (finishSurchargesMap[finish] ?? finishPrices[finish] ?? 0)
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
                const finishSurcharge = finishSurchargesMap[f] ?? info.surcharge
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
                        {finishSurcharge > 0
                          ? `+${formatMoney(finishSurcharge)}`
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
