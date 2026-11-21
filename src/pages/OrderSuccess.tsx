import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Truck } from 'lucide-react'

export const OrderSuccess: React.FC = () => {
  return (
    <section className="success-page section">
      <div className="success-card">
        <div className="success-badge-wrap">
          <CheckCircle2 size={48} className="success-icon" />
        </div>

        <p className="eyebrow">ORDER RECEIVED · STUDIO TRANSMISSION</p>

        <h1 className="success-title">
          YOUR WALL
          <br />
          WILL THANK YOU.
        </h1>

        <p className="success-lede">
          We’ve received your order and sent a confirmation receipt to your
          email. Your print is about to enter our giclée production queue.
        </p>

        <div className="success-perks-box">
          <div className="perk-cell">
            <Sparkles size={20} />
            <strong>Giclée Production</strong>
            <p>Printed on 230 GSM acid-free museum stock</p>
          </div>
          <div className="perk-cell">
            <Truck size={20} />
            <strong>Protective Dispatch</strong>
            <p>Sealed in heavy triangular tubes within 48 hours</p>
          </div>
          <div className="perk-cell">
            <ShieldCheck size={20} />
            <strong>Archival Guarantee</strong>
            <p>Engineered for multi-decade visual vibrancy</p>
          </div>
        </div>

        <div className="success-actions">
          <Link to="/shop" className="button acid">
            <span>KEEP EXPLORING PRINTS</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/track-order" className="button outline">
            <span>TRACKING GUIDANCE</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export const NotFound: React.FC = () => {
  return (
    <section className="not-found-page section">
      <div className="not-found-content">
        <p className="eyebrow">ERROR 404 · OFF THE GRID</p>
        <h1 className="not-found-title">
          THE COMPOSITION
          <br />
          DOESN’T EXIST.
        </h1>
        <p className="not-found-desc">
          The print or page you are looking for has either slipped out of the
          frame or has been relocated to another gallery.
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
