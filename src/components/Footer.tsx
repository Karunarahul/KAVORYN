import React from 'react'
import { Link } from 'react-router-dom'
import { Instagram, ArrowUpRight } from 'lucide-react'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config'

/**
 * Pre-Launch Minimal Footer
 * Editorial Swiss layout with wordmark, copyright, tagline, Instagram link, and contact link.
 * Discreet admin links are preserved at the bottom for authorized studio operators.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="site-footer prelaunch-footer" role="contentinfo">
      <div className="prelaunch-footer-inner">
        <div className="footer-top-row">
          <div className="footer-brand-wrap">
            <Link className="footer-brand" to="/" aria-label="KAVORYN Homepage">
              KAVORYN<span>.</span>
            </Link>
            <p className="footer-tagline">MAKE YOUR WALLS SPEAK.</p>
            <p className="footer-subtext">
              Independent contemporary art print studio based in India.
              First collection dropping soon.
            </p>
          </div>

          <div className="footer-nav-links font-mono">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-nav-item"
              aria-label={`Follow KAVORYN on Instagram at ${INSTAGRAM_HANDLE}`}
            >
              <Instagram size={16} aria-hidden="true" />
              <span>INSTAGRAM {INSTAGRAM_HANDLE}</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>

            <Link to="/contact" className="footer-nav-item">
              <span>TALK TO US</span>
            </Link>
          </div>
        </div>

        <div className="footer-divider-rule" aria-hidden="true" />

        <div className="footer-bottom-row">
          <span className="footer-copy font-mono">
            © 2026 KAVORYN STUDIO. ALL RIGHTS RESERVED. PRINTED IN INDIA.
          </span>

          <div className="footer-admin-discreet-wrap">
            <Link to="/admin" className="footer-admin-discreet" title="Studio Admin Console">
              STUDIO OPS
            </Link>
            <span className="footer-divider-dot">·</span>
            <Link to="/super-admin" className="footer-admin-discreet" title="Super Admin Portal">
              SUPER ADMIN
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
