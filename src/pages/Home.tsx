import React from 'react'
import { ArrowRight, ArrowUpRight, Instagram, Sparkles, ShieldCheck, Truck, Layers } from 'lucide-react'
import { PrelaunchPoster } from '../components/PrelaunchPoster'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config'

/**
 * Pre-Launch Storefront Landing Page
 * Performance-optimized, design-led editorial coming-soon experience.
 * Zero database calls, zero layout shifts, ultra-fast initial paint.
 */
export const Home: React.FC = () => {
  const marqueeItems = [
    'FIRST COLLECTION DROPPING SOON',
    'ORIGINAL CONTEMPORARY POSTER ART',
    'ARCHIVAL 230 GSM ALPHA-CELLULOSE',
    'PRINTED IN INDIA',
    'FOLLOW @KAVORYN',
    'MAKE YOUR WALLS SPEAK',
  ]

  const marqueeText = marqueeItems.join(' — ') + ' — '

  return (
    <div className="home-page prelaunch-page">
      {/* 1. Hero Section */}
      <section className="prelaunch-hero" aria-labelledby="hero-main-title">
        <div className="prelaunch-hero-grid">
          {/* Left Column: Editorial Headline & Launch Announcement */}
          <div className="prelaunch-hero-copy">
            <div className="prelaunch-status-pill-wrap">
              <span className="prelaunch-status-pulse" aria-hidden="true" />
              <span className="prelaunch-status-tag font-mono">
                FIRST COLLECTION · DROPPING SOON
              </span>
            </div>

            <div className="prelaunch-eyebrow-line font-mono">
              <span>INDEPENDENT ART STUDIO</span>
              <span className="dot" aria-hidden="true">·</span>
              <span>INDIA</span>
              <span className="dot" aria-hidden="true">·</span>
              <span className="edition-badge">EDITION 01/26</span>
            </div>

            <h1 id="hero-main-title" className="prelaunch-hero-title">
              YOUR WALLS
              <br />
              ARE ABOUT
              <br />
              <em>TO CHANGE.</em>
            </h1>

            <p className="prelaunch-hero-lede">
              A new point of view is taking shape. Original poster art, made to
              bring personality to the spaces you call yours. Stay close.
            </p>

            {/* Launch Announcement Badge */}
            <div className="prelaunch-announcement-card">
              <div className="announcement-header font-mono">
                <Sparkles size={16} className="announcement-icon" aria-hidden="true" />
                <span>LAUNCH ANNOUNCEMENT</span>
              </div>
              <strong className="announcement-title">
                FIRST COLLECTION DROPPING SOON.
              </strong>
              <p className="announcement-desc">
                Follow our official studio dispatch for first access, limited edition
                previews, and launch dates.
              </p>
            </div>

            {/* Primary Call to Action */}
            <div className="prelaunch-hero-actions">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="button blue prelaunch-primary-btn"
                aria-label={`Follow the drop on Instagram at ${INSTAGRAM_HANDLE}`}
              >
                <Instagram size={18} aria-hidden="true" />
                <span>FOLLOW THE DROP</span>
                <ArrowRight size={18} className="cta-arrow" aria-hidden="true" />
              </a>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="prelaunch-handle-badge font-mono"
              >
                <span>VIA {INSTAGRAM_HANDLE}</span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>

            {/* Micro Perks Strip */}
            <div className="prelaunch-perks-row font-mono" aria-label="Studio specifications">
              <div className="perk-item">
                <ShieldCheck size={14} aria-hidden="true" />
                <span>230 GSM MUSEUM MATTE</span>
              </div>
              <div className="perk-item">
                <Truck size={14} aria-hidden="true" />
                <span>RIGID TUBE DISPATCH</span>
              </div>
              <div className="perk-item">
                <Layers size={14} aria-hidden="true" />
                <span>LIMITED RUN PRINTING</span>
              </div>
            </div>
          </div>

          {/* Right Column: Large Original Campaign Graphic Poster */}
          <div className="prelaunch-hero-visual">
            <div className="visual-stage-container">
              <PrelaunchPoster priority />
              <div className="visual-sticker-tag" title="Designed and printed in India">
                <span className="font-mono">
                  01 // 26
                  <br />
                  NEW DELHI
                  <br />
                  INDIA
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Infinite Kinetic Brutalist Marquee */}
      <section className="marquee-wrapper prelaunch-marquee" aria-hidden="true">
        <div className="marquee-track">
          <span className="marquee-content">{marqueeText}</span>
          <span className="marquee-content">{marqueeText}</span>
          <span className="marquee-content">{marqueeText}</span>
        </div>
      </section>

      {/* 3. Brand Statement Section */}
      <section className="prelaunch-manifesto-section" aria-labelledby="manifesto-heading">
        <div className="prelaunch-manifesto-inner">
          <div className="manifesto-grid">
            <div className="manifesto-head-col">
              <span className="eyebrow font-mono">THE KAVORYN MANIFESTO</span>
              <h2 id="manifesto-heading" className="manifesto-large-title">
                NOT JUST DECOR.
                <br />
                <em>AN EXPRESSION</em>
                <br />
                OF YOU.
              </h2>
            </div>

            <div className="manifesto-body-col">
              <p className="manifesto-lead-quote">
                &ldquo;Your space should say something about you. We&rsquo;re
                creating something worth putting on your walls.&rdquo;
              </p>
              <p className="manifesto-paragraph">
                Too much wall art exists merely to fill empty square footage.
                We design printed statements rooted in contemporary graphic
                culture, visual balance, and bold typography. Every piece is an
                original design made in India with archival mineral inks on
                museum-grade 230 GSM paper.
              </p>

              <div className="manifesto-author-block">
                <span className="author-studio font-mono">KAVORYN STUDIO</span>
                <span className="author-title">INDEPENDENT CONTEMPORARY ART PRINTS · INDIA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pillars of the First Collection */}
      <section className="prelaunch-pillars-section" aria-labelledby="pillars-title">
        <div className="pillars-container">
          <div className="pillars-head">
            <span className="eyebrow font-mono">01 // THE FIRST EDITION</span>
            <h2 id="pillars-title" className="pillars-section-title">
              WHAT WE&rsquo;RE BUILDING.
            </h2>
          </div>

          <div className="pillars-grid">
            <article className="pillar-card">
              <span className="pillar-num font-mono">01</span>
              <h3 className="pillar-title">
                ORIGINAL
                <br />
                POSTER ART
              </h3>
              <p className="pillar-desc">
                No generic stock imagery or repetitive mass-market graphics.
                Every poster is an original composition shaped by typography,
                geometry, and cultural commentary.
              </p>
            </article>

            <article className="pillar-card">
              <span className="pillar-num font-mono">02</span>
              <h3 className="pillar-title">
                MUSEUM-GRADE
                <br />
                GICLÉE PRINTING
              </h3>
              <p className="pillar-desc">
                Printed using archival mineral pigment inks on heavyweight
                230 GSM alpha-cellulose matte paper. Natural acid-free stock
                engineered to never fade or yellow.
              </p>
            </article>

            <article className="pillar-card">
              <span className="pillar-num font-mono">03</span>
              <h3 className="pillar-title">
                UNIVERSAL
                <br />
                A-SERIES FRAMING
              </h3>
              <p className="pillar-desc">
                Cut to standard international A-series dimensions (A4, A3, A2, A1).
                Fits off-the-shelf Ikea frames or local Indian framers without
                custom matting.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 5. Pre-Launch Drop Callout Strip */}
      <section className="prelaunch-cta-banner" aria-label="Follow the drop announcement">
        <div className="cta-banner-inner">
          <div className="cta-banner-content">
            <span className="eyebrow font-mono">BE THERE FOR THE UNVEILING</span>
            <h2 className="cta-banner-title">
              THE DROP IS HAPPENING
              <br />
              <em>ON INSTAGRAM FIRST.</em>
            </h2>
            <p className="cta-banner-desc">
              Follow our official studio account to see previews of the First
              Collection and receive immediate notification when the store opens.
            </p>
          </div>

          <div className="cta-banner-action">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="button acid large prelaunch-banner-btn"
              aria-label={`Follow @kavoryn on Instagram`}
            >
              <Instagram size={20} aria-hidden="true" />
              <span>FOLLOW @KAVORYN ON INSTAGRAM</span>
              <ArrowRight size={20} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* Archived First Edition Collections Strip (Temporarily hidden for pre-launch): <h2 className="strip-title">SIX COLLECTIONS. ZERO COMPROMISE.</h2> */}
    </div>
  )
}
