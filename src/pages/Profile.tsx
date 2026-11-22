import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, useUser } from '@clerk/react'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react'
import { formatMoney } from '../data'
import {
  storeBackend,
  type DBAdminRequest,
  type DBCustomerAddress,
  type DBOrder,
  type DBUser,
} from '../lib/convex-client'
import { isClerkConfigured } from '../lib/env'

export const ProfilePage: React.FC = () => {
  const { user: clerkUser } = useUser()
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'tracking' | 'access' | 'security'>('orders')

  // Live state
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [addresses, setAddresses] = useState<DBCustomerAddress[]>([])
  const [adminRequest, setAdminRequest] = useState<DBAdminRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Address Modal/Form State
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false,
  })

  // Admin Request Form State
  const [requestReason, setRequestReason] = useState('')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  // Quick Tracker State
  const [trackOrderNumber, setTrackOrderNumber] = useState('')
  const [trackKey, setTrackKey] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState<{
    orderNumber: string
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
    paymentStatus: string
    createdAt: number
    paidAt?: number
    city: string
    state: string
    postalCode: string
    line1: string
    itemCount: number
    total: number
  } | null>(null)
  const [trackError, setTrackError] = useState<string | null>(null)

  const loadProfileData = async () => {
    setIsLoading(true)
    try {
      // 1. Sync Clerk user into Convex database
      if (clerkUser) {
        await storeBackend.syncUser({
          email: clerkUser?.primaryEmailAddress?.emailAddress,
          name: clerkUser?.fullName || undefined,
        })
      }

      const [currentUser, userOrders, userAddresses, existingReq] = await Promise.all([
        storeBackend.getCurrentUser(),
        storeBackend.listMyOrders(),
        storeBackend.listMyAddresses(),
        storeBackend.getMyAdminRequest(),
      ])

      setDbUser(currentUser)
      setOrders(userOrders)
      setAddresses(userAddresses)
      setAdminRequest(existingReq)
    } catch (err) {
      console.warn('Failed to load profile data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (clerkUser) {
      loadProfileData()
    } else {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser])

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[1-9][0-9]{5}$/.test(addressForm.postalCode.trim())) {
      setActionNotice('Please enter a valid 6-digit Indian PIN code.')
      return
    }

    try {
      await storeBackend.saveAddress({
        name: addressForm.name,
        phone: addressForm.phone,
        line1: addressForm.line1,
        city: addressForm.city,
        state: addressForm.state,
        postalCode: addressForm.postalCode,
        isDefault: addressForm.isDefault,
      })
      setActionNotice('Address saved to your profile.')
      setShowAddressForm(false)
      setAddressForm({
        name: '',
        phone: '',
        line1: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false,
      })
      loadProfileData()
      setTimeout(() => setActionNotice(null), 3000)
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : 'Failed to save address.')
    }
  }

  const handleAdminRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingRequest(true)
    try {
      const res = await storeBackend.requestAdminAccess(requestReason)
      setActionNotice(res.message || 'Administrator request submitted for review.')
      setRequestReason('')
      loadProfileData()
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : 'Failed to submit request.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  const handleInlineTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTracking(true)
    setTrackError(null)
    setTrackedOrder(null)

    try {
      const result = await storeBackend.trackOrderVerified(trackOrderNumber, trackKey)
      if (result) {
        setTrackedOrder(result)
      } else {
        setTrackError('No matching order found for this Order Number and Email/PIN.')
      }
    } catch (err: unknown) {
      setTrackError(err instanceof Error ? err.message : 'Unable to query order database.')
    } finally {
      setIsTracking(false)
    }
  }

  return (
    <section className="static-page section profile-page">
      <div className="static-header">
        <div className="profile-eyebrow-row">
          <p className="eyebrow">KAVORYN CLIENT DASHBOARD</p>
          {dbUser && (
            <span className={`role-pill role-${dbUser.role}`}>
              {dbUser.role.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="static-title">
          MY ACCOUNT &
          <br />
          <em>ORDERS.</em>
        </h1>
        <p className="static-lede">
          Review your First Edition acquisitions, manage delivery destinations,
          and track order fulfillment in real time.
        </p>
      </div>

      {actionNotice && (
        <div className="admin-action-banner" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {isClerkConfigured ? (
        <>
          <Show when="signed-in">
            <div className="profile-layout">
              {/* Profile Sidebar */}
              <aside className="profile-sidebar" aria-label="Customer Profile Navigation">
                <div className="profile-user-card">
                  <div className="profile-avatar">
                    <User size={28} />
                  </div>
                  <div className="profile-meta">
                    <strong>
                      {clerkUser?.fullName || clerkUser?.primaryEmailAddress?.emailAddress}
                    </strong>
                    <span className="profile-email">
                      {clerkUser?.primaryEmailAddress?.emailAddress}
                    </span>
                    <span className="profile-role-subtext">
                      Account Tier: <strong>{(dbUser?.role || 'customer').toUpperCase()}</strong>
                    </span>
                  </div>
                </div>

                <nav className="profile-nav" role="tablist">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'orders'}
                    className={`profile-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    <Package size={16} />
                    <span>MY ORDERS ({orders.length})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'addresses'}
                    className={`profile-tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('addresses')}
                  >
                    <MapPin size={16} />
                    <span>SAVED ADDRESSES ({addresses.length})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'tracking'}
                    className={`profile-tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tracking')}
                  >
                    <Search size={16} />
                    <span>ORDER VERIFICATION</span>
                  </button>

                  {dbUser?.role === 'customer' && (
                    <button
                      role="tab"
                      aria-selected={activeTab === 'access'}
                      className={`profile-tab-btn ${activeTab === 'access' ? 'active' : ''}`}
                      onClick={() => setActiveTab('access')}
                    >
                      <KeyRound size={16} />
                      <span>ADMIN ACCESS REQUEST</span>
                    </button>
                  )}

                  <button
                    role="tab"
                    aria-selected={activeTab === 'security'}
                    className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <ShieldCheck size={16} />
                    <span>SECURITY & ACCESS</span>
                  </button>
                </nav>

                {(dbUser?.role === 'admin' || dbUser?.role === 'super_admin') && (
                  <div className="profile-admin-cta">
                    <span className="admin-cta-eyebrow">PRIVILEGED ACCOUNT</span>
                    <p>You have authorized studio operational rights.</p>
                    <Link to="/admin" className="button blue cta-admin-btn">
                      <span>ENTER STUDIO OPERATIONS</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </aside>

              {/* Profile Main Content Area */}
              <div className="profile-main-panel">
                {isLoading ? (
                  <div className="profile-loading" role="status">
                    <RefreshCw size={24} className="spinner" />
                    <span>SYNCHRONIZING ACCOUNT DATA...</span>
                  </div>
                ) : (
                  <>
                    {/* Tab 1: Orders */}
                    {activeTab === 'orders' && (
                      <div className="profile-tab-content">
                        <div className="tab-header-row">
                          <div>
                            <h3>MY FIRST EDITION ORDERS</h3>
                            <p className="tab-subtext">
                              Permanent records of your prints crafted by KAVORYN.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="button outline refresh-btn"
                            onClick={loadProfileData}
                          >
                            <RefreshCw size={14} />
                            <span>REFRESH</span>
                          </button>
                        </div>

                        {orders.length === 0 ? (
                          <div className="empty-orders-card">
                            <Package size={40} />
                            <h4>NO ORDERS RECORDED YET</h4>
                            <p>
                              You haven’t acquired any fine art prints yet. Explore
                              our First Edition catalog to start your collection.
                            </p>
                            <Link to="/shop" className="button blue">
                              <span>EXPLORE FIRST EDITION</span>
                              <ArrowRight size={16} />
                            </Link>
                          </div>
                        ) : (
                          <div className="orders-list">
                            {orders.map((order) => (
                              <div key={order._id} className="customer-order-card">
                                <div className="order-card-header">
                                  <div>
                                    <span className="order-label">ORDER ID</span>
                                    <h4>{order.orderNumber}</h4>
                                    <span className="order-date">
                                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                        dateStyle: 'medium',
                                      })}
                                    </span>
                                  </div>

                                  <div className="order-pills-wrap">
                                    <span className={`status-pill pill-${order.paymentStatus || 'pending'}`}>
                                      {order.paymentStatus === 'paid' ? 'PAYMENT VERIFIED' : (order.paymentStatus || 'PENDING').toUpperCase()}
                                    </span>
                                    <span className={`status-pill pill-${order.status}`}>
                                      {order.status === 'fulfilled' && <PackageCheck size={13} />}
                                      {order.status === 'paid' && <CheckCircle2 size={13} />}
                                      {order.status === 'pending' && <Clock size={13} />}
                                      {order.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>

                                <div className="order-items-table">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="order-item-row">
                                      <div className="item-info">
                                        <strong className="item-title">{item.productName}</strong>
                                        <span className="item-specs">
                                          SKU: {item.productSku} · Size: {item.size} · Finish: {item.finish}
                                        </span>
                                      </div>
                                      <div className="item-qty-price">
                                        <span>Qty: {item.quantity}</span>
                                        <strong>{formatMoney(item.subtotal)}</strong>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="order-card-footer">
                                  <div className="order-address-summary">
                                    <MapPin size={14} />
                                    <span>
                                      Delivering to: {order.address.city}, {order.address.state} — {order.address.postalCode}
                                    </span>
                                  </div>
                                  <div className="order-total-block">
                                    <span>Total: <strong>{formatMoney(order.total)}</strong></span>
                                    <button
                                      type="button"
                                      className="button outline track-action-btn"
                                      onClick={() => {
                                        setTrackOrderNumber(order.orderNumber)
                                        setTrackKey(order.address.postalCode || clerkUser?.primaryEmailAddress?.emailAddress || '')
                                        setActiveTab('tracking')
                                      }}
                                    >
                                      <Eye size={14} />
                                      <span>TRACK LOGISTICS</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Saved Addresses */}
                    {activeTab === 'addresses' && (
                      <div className="profile-tab-content">
                        <div className="tab-header-row">
                          <div>
                            <h3>DELIVERY DESTINATIONS</h3>
                            <p className="tab-subtext">
                              Manage saved addresses for one-click checkout.
                            </p>
                          </div>
                          {!showAddressForm && (
                            <button
                              type="button"
                              className="button blue"
                              onClick={() => setShowAddressForm(true)}
                            >
                              <Plus size={14} />
                              <span>ADD NEW ADDRESS</span>
                            </button>
                          )}
                        </div>

                        {showAddressForm && (
                          <div className="address-form-modal">
                            <h4>ADD NEW ADDRESS</h4>
                            <form onSubmit={handleSaveAddress} className="address-form">
                              <div className="form-grid-2">
                                <label className="form-field">
                                  <span>RECIPIENT NAME *</span>
                                  <input
                                    required
                                    value={addressForm.name}
                                    onChange={(e) =>
                                      setAddressForm({ ...addressForm, name: e.target.value })
                                    }
                                    placeholder="Full name"
                                  />
                                </label>
                                <label className="form-field">
                                  <span>PHONE NUMBER *</span>
                                  <input
                                    required
                                    type="tel"
                                    value={addressForm.phone}
                                    onChange={(e) =>
                                      setAddressForm({ ...addressForm, phone: e.target.value })
                                    }
                                    placeholder="10-digit phone number"
                                  />
                                </label>
                              </div>

                              <label className="form-field">
                                <span>STREET ADDRESS *</span>
                                <input
                                  required
                                  value={addressForm.line1}
                                  onChange={(e) =>
                                    setAddressForm({ ...addressForm, line1: e.target.value })
                                  }
                                  placeholder="Apartment, building, street name"
                                />
                              </label>

                              <div className="form-grid-3">
                                <label className="form-field">
                                  <span>CITY *</span>
                                  <input
                                    required
                                    value={addressForm.city}
                                    onChange={(e) =>
                                      setAddressForm({ ...addressForm, city: e.target.value })
                                    }
                                    placeholder="City"
                                  />
                                </label>
                                <label className="form-field">
                                  <span>STATE *</span>
                                  <input
                                    required
                                    value={addressForm.state}
                                    onChange={(e) =>
                                      setAddressForm({ ...addressForm, state: e.target.value })
                                    }
                                    placeholder="State"
                                  />
                                </label>
                                <label className="form-field">
                                  <span>6-DIGIT PIN CODE *</span>
                                  <input
                                    required
                                    maxLength={6}
                                    value={addressForm.postalCode}
                                    onChange={(e) =>
                                      setAddressForm({ ...addressForm, postalCode: e.target.value })
                                    }
                                    placeholder="PIN Code"
                                  />
                                </label>
                              </div>

                              <label className="checkbox-field">
                                <input
                                  type="checkbox"
                                  checked={addressForm.isDefault}
                                  onChange={(e) =>
                                    setAddressForm({ ...addressForm, isDefault: e.target.checked })
                                  }
                                />
                                <span>Set as default shipping address</span>
                              </label>

                              <div className="form-button-row">
                                <button
                                  type="button"
                                  className="button outline"
                                  onClick={() => setShowAddressForm(false)}
                                >
                                  CANCEL
                                </button>
                                <button type="submit" className="button blue">
                                  <span>SAVE ADDRESS</span>
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        <div className="addresses-grid">
                          {addresses.map((addr) => (
                            <div key={addr._id} className="address-card">
                              <div className="address-header">
                                <strong>{addr.name}</strong>
                                {addr.isDefault && (
                                  <span className="default-pill">DEFAULT</span>
                                )}
                              </div>
                              <p className="address-line">{addr.line1}</p>
                              <p className="address-city">
                                {addr.city}, {addr.state} — <strong>{addr.postalCode}</strong>
                              </p>
                              <span className="address-phone">Phone: {addr.phone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Order Verification / Logistics */}
                    {activeTab === 'tracking' && (
                      <div className="profile-tab-content">
                        <div className="tab-header-row">
                          <div>
                            <h3>ORDER ID VERIFICATION & TRACKING</h3>
                            <p className="tab-subtext">
                              Query authoritative production state using your Order Number and verified checkout email or PIN code.
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleInlineTrack} className="verify-track-form">
                          <div className="form-grid-2">
                            <label className="form-field">
                              <span>ORDER NUMBER *</span>
                              <input
                                required
                                value={trackOrderNumber}
                                onChange={(e) => setTrackOrderNumber(e.target.value.toUpperCase())}
                                placeholder="e.g. KVR-2026-ABCD"
                              />
                            </label>
                            <label className="form-field">
                              <span>CHECKOUT EMAIL OR PIN CODE *</span>
                              <input
                                required
                                value={trackKey}
                                onChange={(e) => setTrackKey(e.target.value)}
                                placeholder="Email or 6-digit PIN"
                              />
                            </label>
                          </div>

                          <button type="submit" className="button blue verify-submit-btn" disabled={isTracking}>
                            {isTracking ? (
                              <>
                                <RefreshCw size={14} className="spinner" />
                                <span>VERIFYING WITH STUDIO DATABASE...</span>
                              </>
                            ) : (
                              <>
                                <span>VERIFY & TRACK ORDER</span>
                                <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                        </form>

                        {trackError && (
                          <div className="track-error-alert" role="alert">
                            <span>{trackError}</span>
                          </div>
                        )}

                        {trackedOrder && (
                          <div className="verified-track-card" role="status">
                            <div className="track-card-head">
                              <div>
                                <span className="order-num-label">VERIFIED ORDER:</span>
                                <h4>{trackedOrder.orderNumber}</h4>
                              </div>
                              <span className={`status-pill pill-${trackedOrder.status}`}>
                                {trackedOrder.status.toUpperCase()}
                              </span>
                            </div>

                            <div className="tracking-timeline">
                              <div className="timeline-step step-done">
                                <div className="step-dot" />
                                <div className="step-text">
                                  <strong>ORDER PLACED</strong>
                                  <small>{new Date(trackedOrder.createdAt).toLocaleDateString('en-IN')}</small>
                                </div>
                              </div>

                              <div className={`timeline-step ${trackedOrder.status === 'paid' || trackedOrder.status === 'fulfilled' ? 'step-done' : 'step-pending'}`}>
                                <div className="step-dot" />
                                <div className="step-text">
                                  <strong>PAYMENT CAPTURED</strong>
                                  <small>{trackedOrder.paymentStatus?.toUpperCase()}</small>
                                </div>
                              </div>

                              <div className={`timeline-step ${trackedOrder.status === 'fulfilled' ? 'step-done' : 'step-pending'}`}>
                                <div className="step-dot" />
                                <div className="step-text">
                                  <strong>ARCHIVAL DISPATCH</strong>
                                  <small>Triangular Tube Delivery</small>
                                </div>
                              </div>
                            </div>

                            <div className="track-details-grid">
                              <div>
                                <span>DESTINATION:</span>
                                <strong>{trackedOrder.city}, {trackedOrder.state} — {trackedOrder.postalCode}</strong>
                              </div>
                              <div>
                                <span>TOTAL VALUE:</span>
                                <strong>{formatMoney(trackedOrder.total)}</strong>
                              </div>
                              <div>
                                <span>ITEMS COUNT:</span>
                                <strong>{trackedOrder.itemCount} Fine Art Print(s)</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Admin Access Request (Customer only) */}
                    {activeTab === 'access' && dbUser?.role === 'customer' && (
                      <div className="profile-tab-content">
                        <div className="tab-header-row">
                          <div>
                            <h3>REQUEST STUDIO ADMINISTRATOR PRIVILEGES</h3>
                            <p className="tab-subtext">
                              KAVORYN Studio RBAC grants order management and catalog controls only to authorized personnel.
                            </p>
                          </div>
                        </div>

                        {adminRequest ? (
                          <div className="pending-request-notice" role="alert">
                            <Clock size={24} />
                            <div>
                              <h4>REQUEST {adminRequest.status.toUpperCase()}</h4>
                              <p>
                                Submitted on{' '}
                                <strong>
                                  {new Date(adminRequest.requestedAt).toLocaleDateString('en-IN', {
                                    dateStyle: 'medium',
                                  })}
                                </strong>
                                .
                              </p>
                              <blockquote className="request-quote">
                                "{adminRequest.reason}"
                              </blockquote>
                              {adminRequest.status === 'pending' && (
                                <small>
                                  Your request is in the Super Admin review queue. You will receive an update once reviewed.
                                </small>
                              )}
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleAdminRequestSubmit} className="admin-request-form">
                            <label className="form-field">
                              <span>JUSTIFICATION & STUDIO ROLE *</span>
                              <textarea
                                required
                                rows={4}
                                value={requestReason}
                                onChange={(e) => setRequestReason(e.target.value)}
                                placeholder="Explain why you need administrator access (e.g. Gallery curation, production management, print fulfillment partner)..."
                              />
                            </label>

                            <button
                              type="submit"
                              className="button blue"
                              disabled={isSubmittingRequest || requestReason.trim().length < 5}
                            >
                              {isSubmittingRequest ? (
                                <span>SUBMITTING REQUEST...</span>
                              ) : (
                                <>
                                  <Send size={14} />
                                  <span>SUBMIT ACCESS REQUEST</span>
                                </>
                              )}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Tab 5: Security */}
                    {activeTab === 'security' && (
                      <div className="profile-tab-content">
                        <div className="tab-header-row">
                          <div>
                            <h3>ACCOUNT SECURITY & VERIFICATION</h3>
                            <p className="tab-subtext">
                              Managed securely via Clerk Core 3 Authentication.
                            </p>
                          </div>
                        </div>

                        <div className="security-specs-card">
                          <div className="sec-item">
                            <Mail size={18} />
                            <div>
                              <strong>PRIMARY EMAIL</strong>
                              <span>{clerkUser?.primaryEmailAddress?.emailAddress}</span>
                              <small>Verified via Clerk Authentication</small>
                            </div>
                          </div>

                          <div className="sec-item">
                            <ShieldCheck size={18} />
                            <div>
                              <strong>ROLE-BASED AUTHORIZATION (RBAC)</strong>
                              <span>Assigned Role: <strong>{dbUser?.role.toUpperCase()}</strong></span>
                              <small>Enforced server-side on all Convex queries and mutations</small>
                            </div>
                          </div>

                          <div className="sec-item">
                            <Lock size={18} />
                            <div>
                              <strong>SESSION AUTHENTICATION</strong>
                              <span>Clerk JWT Verified Issuer</span>
                              <small>CSRF & anti-tamper protected token lifecycle</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </Show>

          <Show when="signed-out">
            <div className="clerk-locked-card" role="alert">
              <Lock size={44} />
              <h3>CUSTOMER SIGN IN REQUIRED</h3>
              <p>
                Sign in or create an account with your email or Google account to access your KAVORYN
                order history, saved addresses, and print logistics.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                <SignInButton mode="modal">
                  <button className="button blue">
                    <span>SIGN IN TO YOUR ACCOUNT</span>
                    <ArrowRight size={16} />
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="button ghost">
                    <span>CREATE ACCOUNT / SIGN UP</span>
                    <ArrowRight size={16} />
                  </button>
                </SignUpButton>
              </div>
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '4px', maxWidth: '480px', margin: '1.25rem auto 0', textAlign: 'left' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  💡 <strong>Seeing &quot;Couldn&apos;t find your account&quot;?</strong><br />
                  If this is your first time signing in, click <strong>CREATE ACCOUNT / SIGN UP</strong> above (or select <em>&quot;Don&apos;t have an account? Sign up&quot;</em> in the Clerk popup) to register your credentials.
                </p>
              </div>
            </div>
          </Show>
        </>
      ) : (
        <div className="profile-tab-content">
          <p>Clerk Authentication is not currently configured.</p>
        </div>
      )}
    </section>
  )
}
