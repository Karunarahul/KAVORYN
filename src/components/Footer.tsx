import React from 'react'
import { Link } from 'react-router-dom'
import { collections } from '../data'

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-col brand-col">
          <Link className="footer-brand" to="/">
            KAVORYN<span>.</span>
          </Link>
          <p className="footer-tagline">MAKE YOUR WALLS SPEAK.</p>
          <p className="footer-subtext">
            A contemporary art print studio based in India. We design printed
            matter for rooms that refuse the quiet and expected.
          </p>
          <div className="footer-badge-strip">
            <span className="footer-pill">PRINT ON DEMAND</span>
            <span className="footer-pill">230 GSM ARCHIVAL</span>
            <span className="footer-pill">PAN-INDIA DISPATCH</span>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">COLLECTIONS</h4>
          <ul className="footer-links">
            <li>
              <Link to="/shop">ALL PRINTS (FIRST EDITION)</Link>
            </li>
            {Object.entries(collections).map(([slug, name]) => (
              <li key={slug}>
                <Link to={`/collections/${slug}`}>{name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="footer-heading">STUDIO & ORDERS</h4>
          <ul className="footer-links">
            <li>
              <Link to="/about">THE STUDIO</Link>
            </li>
            <li>
              <Link to="/customize">CUSTOM COMMISSIONS</Link>
            </li>
            <li>
              <Link to="/profile">CUSTOMER PROFILE</Link>
            </li>
            <li>
              <Link to="/track-order">TRACK AN ORDER</Link>
            </li>
            <li>
              <Link to="/contact">TALK TO US</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col specs-col">
          <h4 className="footer-heading">ARCHIVAL PROMISE</h4>
          <p className="specs-desc">
            Every piece is printed using archival pigment-based inks on
            heavyweight acid-free stock. Rolled in reinforced triangular tubes to
            ensure zero edge creases in transit.
          </p>
          <div className="specs-box">
            <span className="specs-code">PRINT SPEC 01/26</span>
            <strong>MUSEUM MATTE · 230 GSM</strong>
            <small>FITS STANDARD A4 / A3 / A2 / A1 FRAMES</small>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 KAVORYN STUDIO. PRINTED IN INDIA.</span>
        <span>PRICES IN INR (₹) · ALL TAXES INCLUDED</span>
        <div className="footer-admin-links-wrap">
          <Link to="/admin" className="footer-admin-discreet" title="Authorized Studio Operations">
            STUDIO ADMIN
          </Link>
          <span className="footer-divider-dot">·</span>
          <Link to="/super-admin" className="footer-admin-discreet" title="Authorized KAVORYN Super Admin Access">
            SUPER ADMIN ACCESS
          </Link>
        </div>
      </div>
    </footer>
  )
}
