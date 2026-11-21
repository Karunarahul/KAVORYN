import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, ShoppingBag, User } from 'lucide-react'
import { Show, SignInButton, UserButton } from "@clerk/react";
import { collections } from '../data'
import { isClerkConfigured } from '../lib/env'

interface HeaderProps {
  count: number
  onMenu: () => void
}

export const Header: React.FC<HeaderProps> = ({ count, onMenu }) => {
  return (
    <header className="site-header" role="banner">
      <div className="header-left">
        <button
          aria-label="Open mobile navigation menu"
          aria-expanded={false}
          aria-controls="mobile-navigation-drawer"
          className="icon-button mobile-only menu-trigger"
          onClick={onMenu}
        >
          <Menu size={22} />
        </button>
        <Link className="brand" to="/" aria-label="KAVORYN Studio Homepage">
          KAVORYN<span>.</span>
        </Link>
      </div>

      <nav className="desktop-nav" aria-label="Main store navigation">
        <NavLink
          to="/shop"
          end
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          ALL
        </NavLink>
        {Object.entries(collections).map(([slug, name]) => (
          <NavLink
            key={slug}
            to={`/collections/${slug}`}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {name}
          </NavLink>
        ))}
        <span className="nav-divider" aria-hidden="true">/</span>
        <NavLink
          to="/customize"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          CUSTOM
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          STUDIO
        </NavLink>
      </nav>

      <div className="nav-actions">
        {isClerkConfigured && (
          <div className="auth-nav-action">
            <Show when="signed-in">
              <Link to="/profile" className="header-profile-link" aria-label="Customer Profile & Account">
                <User size={15} />
                <span className="auth-header-text">PROFILE</span>
              </Link>
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="auth-header-btn" aria-label="Sign In">
                  <User size={15} />
                  <span className="auth-header-text">SIGN IN</span>
                </button>
              </SignInButton>
            </Show>
          </div>
        )}

        <Link
          aria-label={`Shopping cart with ${count} ${count === 1 ? 'item' : 'items'}`}
          className="cart-link"
          to="/cart"
        >
          <div className="cart-icon-wrap">
            <ShoppingBag size={20} aria-hidden="true" />
            {count > 0 && (
              <span className="cart-count-badge" aria-hidden="true">
                {count}
              </span>
            )}
          </div>
          <span className="cart-label">CART ({count})</span>
        </Link>
      </div>
    </header>
  );
}
