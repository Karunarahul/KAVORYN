import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, ShieldCheck, Truck, Frame } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { collections, collectionDescriptions, products as staticProducts, type Collection, type Product } from '../data'
import { Poster } from '../components/Poster'
import { ProductCard } from '../components/ProductCard'

export const Home: React.FC = () => {
  const liveItems = useQuery(api.products.list, {})

  const featured: Product[] = liveItems && liveItems.length > 0
    ? liveItems.slice(0, 6).map((p) => ({
        id: p._id,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        collection: p.collection as Collection,
        description: p.description,
        colors: p.colors as [string, string, string],
        motif: p.motif as Product['motif'],
        renderMode: (p.renderMode as 'image' | 'procedural') || (p.thumbnailUrl ? 'image' : 'procedural'),
        thumbnailUrl: p.thumbnailUrl,
      }))
    : staticProducts.slice(0, 6)

  const heroPosterProduct = featured[5] || staticProducts[5]

  const marqueeText =
    'FORM — FRAME — TYPE — ELSEWHERE — ORGANIC — PERSONAL — 230 GSM ARCHIVAL PAPER — PRINTED IN INDIA — MAKE YOUR WALLS SPEAK — '

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow-wrap">
            <span className="eyebrow">CONTEMPORARY ART STUDIO · INDIA</span>
            <span className="hero-edition-tag">EDITION 01/26</span>
          </div>

          <h1 className="hero-title">
            MAKE YOUR
            <br />
            <em>WALLS</em> SPEAK.
          </h1>

          <p className="lede">
            Contemporary art prints made to start a conversation, not match the
            sofa. Archival pigment inks on 230 GSM museum-grade matte paper.
          </p>

          <div className="hero-actions">
            <Link className="button blue" to="/shop">
              <span>SHOP THE FIRST EDITION</span>
              <ArrowRight size={16} />
            </Link>
            <Link className="button outline" to="/customize">
              <span>CUSTOM PRINT</span>
            </Link>
          </div>

          <div className="hero-perks">
            <div className="perk-item">
              <Truck size={15} />
              <span>Free shipping over ₹499</span>
            </div>
            <div className="perk-item">
              <ShieldCheck size={15} />
              <span>Anti-fade archival inks</span>
            </div>
            <div className="perk-item">
              <Frame size={15} />
              <span>Fits standard frames</span>
            </div>
          </div>
        </div>

        <div className="hero-art">
          <div className="hero-art-frame">
            <Poster large p={heroPosterProduct} />
          </div>
          <div className="hero-sticker" title="Designed and printed in India">
            <span>
              INDIA
              <br />
              TO YOUR
              <br />
              WALL
            </span>
          </div>
        </div>
      </section>

      {/* Infinite Animated Marquee */}
      <section className="marquee-wrapper" aria-hidden="true">
        <div className="marquee-track">
          <span className="marquee-content">{marqueeText}</span>
          <span className="marquee-content">{marqueeText}</span>
          <span className="marquee-content">{marqueeText}</span>
        </div>
      </section>

      {/* Curated Collections Strip */}
      <section className="collections-strip-section">
        <div className="strip-header">
          <span className="eyebrow">EXPLORE BY CURATED THEME</span>
          <h2 className="strip-title">SIX COLLECTIONS. ZERO COMPROMISE.</h2>
        </div>
        <div className="collections-pills-grid">
          {Object.entries(collections).map(([slug, name]) => (
            <Link
              key={slug}
              to={`/collections/${slug}`}
              className="collection-pill-card"
            >
              <div className="pill-head">
                <span className="pill-code">{slug.toUpperCase()}</span>
                <span className="pill-name">{name}</span>
              </div>
              <p className="pill-desc">
                {collectionDescriptions[slug as keyof typeof collections]}
              </p>
              <div className="pill-action">
                <span>VIEW PRINTS</span>
                <ArrowRight size={14} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 01: The First Edition */}
      <section className="section catalog-section">
        <div className="section-head">
          <p className="eyebrow">01 / THE FIRST EDITION</p>
          <h2>
            ART THAT
            <br />
            DOESN’T WHISPER.
          </h2>
          <Link className="section-head-link" to="/shop">
            <span>VIEW ALL 12 PRINTS</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        <div className="catalog-footer-action">
          <Link to="/shop" className="button blue wide-button">
            <span>EXPLORE ALL 12 PRINTS IN THE FIRST EDITION</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Studio Manifesto */}
      <section className="manifesto">
        <div className="manifesto-left">
          <p className="manifesto-heading">
            YOUR SPACE IS A<br />
            <i>BLANK CANVAS.</i>
          </p>
          <div className="manifesto-meta">
            <Sparkles size={20} className="manifesto-icon" />
            <span>
              We make printed matter for the beautifully opinionated. If you
              wanted beige, you wouldn't be here.
            </span>
          </div>
        </div>
        <div className="manifesto-right">
          <p className="manifesto-subcopy">
            Every home has at least one wall begging to break the silence.
            KAVORYN posters are designed in India and printed on demand with
            archival precision so your rooms speak clearly.
          </p>
          <Link className="button acid" to="/customize">
            <span>CUSTOMIZE A PRINT</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Why KAVORYN / Studio Values */}
      <section className="section values">
        <div className="values-header">
          <p className="eyebrow">THE KAVORYN STANDARD</p>
          <h2>BUILT FOR LONGEVITY.</h2>
        </div>
        <div className="values-grid">
          <div className="value-item">
            <span className="value-num">01</span>
            <h3>
              ARCHIVAL
              <br />
              QUALITY
            </h3>
            <p>
              Rich mineral-pigment inks printed on heavyweight 230 GSM matte art
              stock. Built to withstand light and outlast your next room
              rearrangement.
            </p>
          </div>
          <div className="value-item">
            <span className="value-num">02</span>
            <h3>
              DESIGNED
              <br />
              IN INDIA
            </h3>
            <p>
              Born from Indian contemporary graphic culture. No generic stock
              imagery. Every piece is an original composition typeset with
              intent.
            </p>
          </div>
          <div className="value-item">
            <span className="value-num">03</span>
            <h3>
              RIGID TUBE
              <br />
              SHIPPING
            </h3>
            <p>
              Protected in heavy-duty triangular cardboard tubes with protective
              kraft wrapping. Zero edge dents, zero plastic waste, pan-India
              dispatch.
            </p>
          </div>
          <div className="value-item">
            <span className="value-num">04</span>
            <h3>
              UNIVERSAL
              <br />
              FRAME SIZING
            </h3>
            <p>
              Standardized to global A-series dimensions (A4, A3, A2, A1). Slip
              into off-the-shelf frames from Ikea, Amazon, or your neighborhood
              framer without trimming.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
