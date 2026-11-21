import React, { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'
import { collections } from '../data'

interface DrawerProps {
  open: boolean
  onClose: () => void
}

export const Drawer: React.FC<DrawerProps> = ({ open, onClose }) => {
  const location = useLocation()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Close drawer automatically on route changes
  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  // Focus management: focus close button when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 50)
    }
  }, [open])

  // Handle ESC key, body scroll lock, and trap focus
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trap within drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const firstElement = focusables[0]
        const lastElement = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu"
      id="mobile-navigation-drawer"
    >
      <div
        className="drawer"
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <Link to="/" className="drawer-brand" onClick={onClose}>
            KAVORYN<span>.</span>
          </Link>
          <button
            ref={closeButtonRef}
            aria-label="Close navigation menu"
            className="drawer-close-btn"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-section">
            <span className="drawer-eyebrow">COLLECTIONS</span>
            <nav className="drawer-nav" aria-label="Collections mobile navigation">
              <Link to="/shop" className="drawer-link all-prints-link">
                <span>ALL PRINTS</span>
                <span className="drawer-link-badge">12</span>
              </Link>
              {Object.entries(collections).map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/collections/${slug}`}
                  className="drawer-link"
                >
                  <span>{name}</span>
                  <ArrowRight size={18} className="drawer-arrow" aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="drawer-section studio-section">
            <span className="drawer-eyebrow">STUDIO & INFO</span>
            <div className="drawer-sublinks">
              <Link to="/profile">MY ACCOUNT & ORDERS</Link>
              <Link to="/customize">MAKE IT PERSONAL (CUSTOM)</Link>
              <Link to="/about">THE STUDIO (ABOUT)</Link>
              <Link to="/track-order">TRACK YOUR ORDER</Link>
              <Link to="/contact">CONTACT & WHATSAPP</Link>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <p className="drawer-tagline">MAKE YOUR WALLS SPEAK.</p>
          <small>© 2026 KAVORYN / PRINTED IN INDIA</small>
        </div>
      </div>
    </div>
  )
}
