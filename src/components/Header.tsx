import React from 'react'
import { Link } from 'react-router-dom'
import { Instagram } from 'lucide-react'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../config'

export interface HeaderProps {
  count?: number
  isMenuOpen: boolean
  onMenu?: () => void
}

/**
 * Pre-Launch Minimal Top Navigation
 * Clean, design-led editorial header with brand wordmark, descriptor, and Instagram link.
 * Product category navigation and shop links are removed from public browsing.
 */
export const Header: React.FC<HeaderProps> = ({ isMenuOpen = false, onMenu }) => {
  return (
    <header className="site-header prelaunch-header" role="banner">
      <div className="header-left">
        {onMenu && (
          <button
            id="menu-trigger-btn"
            type="button"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-drawer"
            className="icon-button mobile-only menu-trigger"
            onClick={onMenu}
            style={{ display: 'none' }}
          >
            <span aria-hidden="true">☰</span>
          </button>
        )}
        <Link className="brand" to="/" aria-label="KAVORYN Studio Homepage">
          KAVORYN<span>.</span>
        </Link>
        <span className="header-descriptor font-mono" aria-hidden="true">
          INDEPENDENT ART STUDIO · INDIA
        </span>
      </div>

      <nav className="header-right" aria-label="Pre-launch social navigation">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="header-instagram-cta font-mono"
          aria-label={`Follow KAVORYN on Instagram at ${INSTAGRAM_HANDLE}`}
        >
          <Instagram size={17} aria-hidden="true" />
          <span>FOLLOW {INSTAGRAM_HANDLE}</span>
        </a>
      </nav>
    </header>
  )
}
