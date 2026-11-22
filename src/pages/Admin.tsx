import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, UserButton, useUser } from "@clerk/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Database,
  History,
  KeyRound,
  Layers,
  Lock,
  Package,
  PackageCheck,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { formatMoney } from '../data'
import {
  storeBackend,
  type DBActivityLog,
  type DBAdminRequest,
  type DBCustomRequest,
  type DBOrder,
  type DBProduct,
  type DBSettings,
  type DBUser,
  type UserRole,
} from '../lib/convex-client'
import { isClerkConfigured } from '../lib/env'

export const AdminPage: React.FC = () => {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<
    'orders' | 'custom' | 'products' | 'settings' | 'requests' | 'roles' | 'logs'
  >('orders')

  // RBAC User state
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [usersList, setUsersList] = useState<DBUser[]>([])
  const [adminRequestsList, setAdminRequestsList] = useState<DBAdminRequest[]>([])
  const [activityLogs, setActivityLogs] = useState<DBActivityLog[]>([])

  // Customer restricted state
  const [customerPendingRequest, setCustomerPendingRequest] = useState<DBAdminRequest | null>(null)
  const [customerRequestReason, setCustomerRequestReason] = useState('')
  const [isSubmittingCustomerRequest, setIsSubmittingCustomerRequest] = useState(false)

  // Live state connected to database / service
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [customRequests, setCustomRequests] = useState<DBCustomRequest[]>([])
  const [products, setProducts] = useState<DBProduct[]>([])
  const [settings, setSettings] = useState<DBSettings>({
    freeShippingThreshold: 499,
    standardShippingFee: 79,
    currency: 'INR',
  })
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Settings form local state
  const [thresholdInput, setThresholdInput] = useState(499)
  const [feeInput, setFeeInput] = useState(79)

  const loadData = async () => {
    try {
      const email = (
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        ''
      ).trim().toLowerCase()
      const name = user?.fullName || undefined
      const isAuthorizedSuperEmail =
        email === 'karunarahul8885@gmail.com' || email === 'admin@kavoryn.com'
      if (user) {
        if (isAuthorizedSuperEmail) {
          try {
            await storeBackend.bootstrapSuperAdmin({ email, name })
          } catch (e) {
            console.warn('Admin bootstrap notice:', e)
          }
        }
        await storeBackend.syncUser({ email, name })
      }
      let currentUser = await storeBackend.getCurrentUser(email)
      if (isAuthorizedSuperEmail && currentUser?.role !== 'super_admin') {
        try {
          await storeBackend.bootstrapSuperAdmin({ email, name })
          await storeBackend.syncUser({ email, name })
          currentUser = await storeBackend.getCurrentUser(email)
        } catch (e) {
          console.warn('Auto-bootstrap retry notice:', e)
        }
      }
      setDbUser(currentUser)

      if (currentUser?.role === 'customer') {
        const myReq = await storeBackend.getMyAdminRequest()
        setCustomerPendingRequest(myReq)
        setIsRefreshing(false)
        return
      }

      const [ordList, reqList, prodList, setts] = await Promise.all([
        storeBackend.getAdminOrders(),
        storeBackend.getAdminCustomRequests(),
        storeBackend.getAllProductsForAdmin(),
        storeBackend.getSettings(),
      ])
      setOrders(ordList)
      setCustomRequests(reqList)
      setProducts(prodList)
      setSettings(setts)
      setThresholdInput(setts.freeShippingThreshold)
      setFeeInput(setts.standardShippingFee)

      if (currentUser?.role === 'super_admin') {
        const [uList, rList, lList] = await Promise.all([
          storeBackend.adminListUsers(),
          storeBackend.adminListRequests(),
          storeBackend.adminGetActivityLogs(),
        ])
        setUsersList(uList)
        setAdminRequestsList(rList)
        setActivityLogs(lList)
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  ) => {
    await storeBackend.updateOrderStatus(orderId, status)
    setActionNotice(`Order ${orderId} status transitioned to: ${status.toUpperCase()}`)
    loadData()
    setTimeout(() => setActionNotice(null), 3000)
  }

  const handleUpdateCustomStatus = async (
    id: string,
    status: 'pending' | 'reviewed' | 'proof_sent' | 'approved' | 'rejected'
  ) => {
    await storeBackend.updateCustomRequestStatus(id, status)
    setActionNotice(`Custom brief status transitioned to: ${status.toUpperCase()}`)
    loadData()
    setTimeout(() => setActionNotice(null), 3000)
  }

  const handleToggleProduct = async (id: string, currentActive: boolean) => {
    await storeBackend.toggleProductActive(id, !currentActive)
    setActionNotice(`Product status updated to: ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`)
    loadData()
    setTimeout(() => setActionNotice(null), 3000)
  }

  const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await storeBackend.adminReviewRequest(requestId, action)
      setActionNotice(`Request ${action === 'approve' ? 'approved (user promoted to Admin)' : 'rejected'}.`)
      loadData()
      setTimeout(() => setActionNotice(null), 3000)
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : 'Failed to review request.')
    }
  }

  const handleUpdateUserRole = async (targetClerkId: string, newRole: UserRole) => {
    try {
      await storeBackend.adminUpdateUserRole(targetClerkId, newRole)
      setActionNotice(`User role updated to ${newRole.toUpperCase()}.`)
      loadData()
      setTimeout(() => setActionNotice(null), 3000)
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : 'Failed to update user role.')
    }
  }

  const handleCustomerRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingCustomerRequest(true)
    try {
      const res = await storeBackend.requestAdminAccess(customerRequestReason)
      setActionNotice(res.message || 'Request submitted to Super Admin.')
      setCustomerRequestReason('')
      loadData()
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err: unknown) {
      setActionNotice(err instanceof Error ? err.message : 'Failed to submit access request.')
    } finally {
      setIsSubmittingCustomerRequest(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    await storeBackend.updateSettings(thresholdInput, feeInput)
    setActionNotice('Store shipping configuration updated in database.')
    loadData()
    setTimeout(() => setActionNotice(null), 3000)
  }

  const handleSeedDatabase = async () => {
    const res = await storeBackend.seedDatabase()
    setActionNotice(
      `Database seeded: ${res.productsCount} products, ${res.collectionsCount} collections initialized.`
    )
    loadData()
    setTimeout(() => setActionNotice(null), 3000)
  }

  // The authenticated admin dashboard contents
  const renderAdminDashboardContent = () => (
    <>
      {/* Top Action Notification */}
      {actionNotice && (
        <div className="admin-action-banner" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Super Admin Executive Shortcut Banner */}
      {dbUser?.role === 'super_admin' && (
        <div className="super-admin-banner-link" role="status">
          <ShieldCheck size={20} />
          <div className="banner-text">
            <strong>SUPER ADMIN PRIVILEGES ACTIVE</strong>
            <span>You have full administrative authority over KAVORYN. Open the executive console for payment diagnostics, role management, and customer metrics.</span>
          </div>
          <Link to="/super-admin" className="button acid banner-link-btn">
            <span>ENTER SUPER ADMIN CONSOLE</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="admin-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">ORDERS REGISTERED</span>
          <strong className="metric-val">{orders.length}</strong>
          <small className="metric-hint">
            {orders.filter((o) => o.status === 'paid').length} paid · {orders.filter((o) => o.status === 'pending').length} pending
          </small>
        </div>

        <div className="metric-card">
          <span className="metric-label">CUSTOM 1-OF-1 BRIEFS</span>
          <strong className="metric-val">{customRequests.length}</strong>
          <small className="metric-hint">
            {customRequests.filter((r) => r.status === 'pending').length} pending review
          </small>
        </div>

        <div className="metric-card">
          <span className="metric-label">CATALOG PRODUCTS</span>
          <strong className="metric-val">{products.length}</strong>
          <small className="metric-hint">
            {products.filter((p) => p.active).length} active on storefront
          </small>
        </div>

        <div className="metric-card">
          <span className="metric-label">FREE SHIPPING THRESHOLD</span>
          <strong className="metric-val">{formatMoney(settings.freeShippingThreshold)}</strong>
          <small className="metric-hint">Standard rate: {formatMoney(settings.standardShippingFee)}</small>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'orders'}
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={16} />
          <span>ORDERS & FULFILLMENT ({orders.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'custom'}
          className={`admin-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          <Layers size={16} />
          <span>CUSTOM BRIEFS ({customRequests.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'products'}
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <SlidersHorizontal size={16} />
          <span>PRODUCT CATALOG ({products.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'settings'}
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>STORE SETTINGS</span>
        </button>

        {dbUser?.role === 'super_admin' && (
          <>
            <button
              role="tab"
              aria-selected={activeTab === 'requests'}
              className={`admin-tab-btn super-tab ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <KeyRound size={16} />
              <span>
                ACCESS REQUESTS (
                {adminRequestsList.filter((r) => r.status === 'pending').length}
                )
              </span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'roles'}
              className={`admin-tab-btn super-tab ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <Users size={16} />
              <span>ROLE MANAGEMENT ({usersList.length})</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === 'logs'}
              className={`admin-tab-btn super-tab ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <History size={16} />
              <span>AUDIT LOGS ({activityLogs.length})</span>
            </button>
          </>
        )}
      </div>

      {/* Panel 1: Orders Queue */}
      {activeTab === 'orders' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>PRODUCTION & DISPATCH QUEUE</h3>
            <div className="toolbar-actions">
              <button
                className="button outline refresh-btn"
                type="button"
                onClick={loadData}
                disabled={isRefreshing}
              >
                <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
                <span>REFRESH</span>
              </button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="admin-empty-panel">
              <Package size={36} />
              <p>No orders currently registered in the database.</p>
              <small>Place a test order through the storefront checkout to populate this view.</small>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ORDER NO.</th>
                    <th>DATE</th>
                    <th>CUSTOMER</th>
                    <th>DESTINATION</th>
                    <th>ITEMS & FINISH</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>FULFILLMENT ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord._id}>
                      <td>
                        <code className="order-id-code">{ord.orderNumber}</code>
                        <br />
                        <small className="rzp-ref">{ord.razorpayOrderId || ord._id}</small>
                        {ord.razorpayPaymentId && (
                          <>
                            <br />
                            <small className="rzp-ref">Pay: {ord.razorpayPaymentId}</small>
                          </>
                        )}
                      </td>
                      <td>
                        {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <strong>{ord.name}</strong>
                        <br />
                        <small className="customer-email">{ord.email}</small>
                        <br />
                        <small className="customer-phone">{ord.phone}</small>
                      </td>
                      <td>
                        {ord.address.city}, {ord.address.state}
                        <br />
                        <small className="postal-code">{ord.address.postalCode}</small>
                      </td>
                      <td>
                        <ul className="order-items-mini-list">
                          {ord.items.map((it, idx) => (
                            <li key={idx}>
                              {it.productName} ({it.size} · {it.finish}) × {it.quantity}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <strong className="order-amount">{formatMoney(ord.total)}</strong>
                      </td>
                      <td>
                        <span className={`status-pill ${ord.status}`}>
                          {ord.status === 'paid' && <CheckCircle2 size={12} />}
                          {ord.status === 'pending' && <Clock size={12} />}
                          {ord.status === 'fulfilled' && <PackageCheck size={12} />}
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="status-actions-group">
                          {ord.status === 'pending' && (
                            <button
                              type="button"
                              className="action-pill-btn mark-paid"
                              onClick={() => handleUpdateOrderStatus(ord._id, 'paid')}
                            >
                              MARK PAID
                            </button>
                          )}
                          {ord.status === 'paid' && (
                            <button
                              type="button"
                              className="action-pill-btn mark-fulfilled"
                              onClick={() => handleUpdateOrderStatus(ord._id, 'fulfilled')}
                            >
                              DISPATCH
                            </button>
                          )}
                          {ord.status !== 'cancelled' && ord.status !== 'fulfilled' && (
                            <button
                              type="button"
                              className="action-pill-btn cancel"
                              onClick={() => handleUpdateOrderStatus(ord._id, 'cancelled')}
                            >
                              CANCEL
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel 2: Custom Briefs */}
      {activeTab === 'custom' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>CUSTOM 1-OF-1 TYPOGRAPHY BRIEFS</h3>
            <button
              className="button outline refresh-btn"
              type="button"
              onClick={loadData}
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
              <span>REFRESH</span>
            </button>
          </div>

          {customRequests.length === 0 ? (
            <div className="admin-empty-panel">
              <Layers size={36} />
              <p>No custom typography briefs submitted yet.</p>
              <small>Submit a custom request on the /customize page to test this workflow.</small>
            </div>
          ) : (
            <div className="custom-briefs-list">
              {customRequests.map((req) => (
                <div key={req._id} className="brief-item-card">
                  <div className="brief-head">
                    <div className="brief-id-block">
                      <span className="brief-ref-pill">{req.referenceCode}</span>
                      <strong className="brief-client-name">{req.name}</strong>
                    </div>
                    <span className={`status-pill ${req.status}`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="brief-quote">"{req.customText}"</p>

                  <div className="brief-meta">
                    <span>
                      <strong>Format:</strong> {req.size}
                    </span>
                    <span>
                      <strong>Palette:</strong> {req.palette.name}
                    </span>
                    <span>
                      <strong>Email:</strong> {req.email}
                    </span>
                    <span>
                      <strong>WhatsApp:</strong> {req.phone}
                    </span>
                    {req.notes && (
                      <span className="brief-notes">
                        <strong>Notes:</strong> {req.notes}
                      </span>
                    )}
                  </div>

                  <div className="brief-actions-row">
                    <span className="actions-label">TRANSITION BRIEF STATUS:</span>
                    <button
                      type="button"
                      className="action-pill-btn"
                      onClick={() => handleUpdateCustomStatus(req._id, 'proof_sent')}
                    >
                      PROOF SENT
                    </button>
                    <button
                      type="button"
                      className="action-pill-btn mark-paid"
                      onClick={() => handleUpdateCustomStatus(req._id, 'approved')}
                    >
                      APPROVE
                    </button>
                    <button
                      type="button"
                      className="action-pill-btn cancel"
                      onClick={() => handleUpdateCustomStatus(req._id, 'rejected')}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Panel 3: Product Catalog */}
      {activeTab === 'products' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>CATALOG ITEMS & ACTIVE STATUS</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Link to="/admin/catalogue" className="button blue">
                <Layers size={14} />
                <span>CATALOGUE MANAGER</span>
              </Link>
              {dbUser?.role === 'super_admin' && (
                <button
                  type="button"
                  className="button acid seed-btn"
                  onClick={handleSeedDatabase}
                >
                  <Database size={14} />
                  <span>RE-SEED CATALOG</span>
                </button>
              )}
            </div>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>TITLE</th>
                  <th>COLLECTION</th>
                  <th>BASE SIZES (A4 · A3 · A2 · A1)</th>
                  <th>FINISH SURCHARGES</th>
                  <th>STOREFRONT VISIBILITY</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.sku}</code>
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>
                      <span className="collection-tag">{p.collection.toUpperCase()}</span>
                    </td>
                    <td>
                      {formatMoney(p.prices.A4)} · {formatMoney(p.prices.A3)} · {formatMoney(p.prices.A2)} · {formatMoney(p.prices.A1)}
                    </td>
                    <td>
                      Matte (0) · Gloss (+{formatMoney(p.finishSurcharges.Gloss)})
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`toggle-visibility-btn ${p.active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleProduct(p.id, p.active)}
                      >
                        {p.active ? (
                          <>
                            <ToggleRight size={18} />
                            <span>ACTIVE ON STORE</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={18} />
                            <span>HIDDEN / DRAFT</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel 4: Store Settings */}
      {activeTab === 'settings' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>STORE CONFIGURATION & LOGISTICS</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="settings-form">
            <div className="form-grid">
              <label className="form-field">
                <span>FREE SHIPPING THRESHOLD (INR)</span>
                <input
                  type="number"
                  min="0"
                  value={thresholdInput}
                  onChange={(e) => setThresholdInput(Number(e.target.value))}
                  required
                />
                <small className="field-hint">
                  Orders above this value automatically unlock free pan-India courier delivery.
                </small>
              </label>

              <label className="form-field">
                <span>STANDARD SHIPPING FEE (INR)</span>
                <input
                  type="number"
                  min="0"
                  value={feeInput}
                  onChange={(e) => setFeeInput(Number(e.target.value))}
                  required
                />
                <small className="field-hint">
                  Applied to orders below the free shipping threshold.
                </small>
              </label>
            </div>

            <button type="submit" className="button blue save-settings-btn">
              <span>UPDATE LOGISTICS CONFIGURATION</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Panel 5: Super Admin Access Requests */}
      {activeTab === 'requests' && dbUser?.role === 'super_admin' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>STUDIO ADMINISTRATOR ACCESS REQUESTS</h3>
            <span className="panel-counter">
              {adminRequestsList.filter((r) => r.status === 'pending').length} PENDING REVIEW
            </span>
          </div>

          {adminRequestsList.length === 0 ? (
            <div className="empty-panel-card">
              <KeyRound size={36} />
              <h4>NO ACCESS REQUESTS</h4>
              <p>No customer accounts have requested studio administrative privileges.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>USER / EMAIL</th>
                    <th>SUBMISSION DATE</th>
                    <th>STATED JUSTIFICATION</th>
                    <th>STATUS</th>
                    <th>REVIEW ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {adminRequestsList.map((req) => (
                    <tr key={req._id}>
                      <td>
                        <strong>{req.name}</strong>
                        <div className="sub-text">{req.email}</div>
                      </td>
                      <td>
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', {
                          dateStyle: 'medium',
                        })}
                      </td>
                      <td>
                        <div className="reason-text">"{req.reason}"</div>
                      </td>
                      <td>
                        <span className={`status-pill pill-${req.status}`}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {req.status === 'pending' ? (
                          <div className="action-buttons-group">
                            <button
                              type="button"
                              className="button acid table-btn"
                              onClick={() => handleReviewRequest(req._id, 'approve')}
                            >
                              <Check size={14} />
                              <span>APPROVE (MAKE ADMIN)</span>
                            </button>
                            <button
                              type="button"
                              className="button outline table-btn"
                              onClick={() => handleReviewRequest(req._id, 'reject')}
                            >
                              <X size={14} />
                              <span>REJECT</span>
                            </button>
                          </div>
                        ) : (
                          <span className="reviewed-by-tag">
                            Reviewed by {req.reviewedBy || 'Super Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Panel 6: Super Admin Role Management */}
      {activeTab === 'roles' && dbUser?.role === 'super_admin' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>USER ROLE MANAGEMENT & PRIVILEGES</h3>
            <span className="panel-counter">{usersList.length} REGISTERED USERS</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>USER PROFILE</th>
                  <th>REGISTERED EMAIL</th>
                  <th>ASSIGNED ROLE</th>
                  <th>JOINED</th>
                  <th>AUTHORIZATION CONTROL</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => {
                  const isSelf = u.clerkId === dbUser.clerkId
                  return (
                    <tr key={u.clerkId}>
                      <td>
                        <strong>{u.name || 'Unnamed User'}</strong>
                        <div className="sub-text">{u.clerkId}</div>
                      </td>
                      <td>
                        <code>{u.email}</code>
                      </td>
                      <td>
                        <span className={`role-pill role-${u.role}`}>
                          {u.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        {isSelf ? (
                          <span className="self-protected-badge">
                            <ShieldCheck size={14} />
                            <span>CURRENT USER (PROTECTED)</span>
                          </span>
                        ) : (
                          <div className="role-actions-wrap">
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                className="button outline table-btn"
                                onClick={() => handleUpdateUserRole(u.clerkId, 'admin')}
                              >
                                MAKE ADMIN
                              </button>
                            )}
                            {u.role !== 'super_admin' && (
                              <button
                                type="button"
                                className="button acid table-btn"
                                onClick={() => handleUpdateUserRole(u.clerkId, 'super_admin')}
                              >
                                MAKE SUPER ADMIN
                              </button>
                            )}
                            {u.role !== 'customer' && (
                              <button
                                type="button"
                                className="button outline table-btn demote-btn"
                                onClick={() => handleUpdateUserRole(u.clerkId, 'customer')}
                              >
                                <UserX size={14} />
                                <span>DEMOTE TO CUSTOMER</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Panel 7: Super Admin Immutable Audit Logs */}
      {activeTab === 'logs' && dbUser?.role === 'super_admin' && (
        <div className="admin-panel">
          <div className="panel-toolbar">
            <h3>IMMUTABLE ADMINISTRATIVE AUDIT LOGS</h3>
            <span className="panel-counter">{activityLogs.length} LOGGED EVENTS</span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="empty-panel-card">
              <History size={36} />
              <h4>NO AUDIT LOGS YET</h4>
              <p>Administrative role changes and request approvals will be recorded here.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>ACTOR (SUPER ADMIN)</th>
                    <th>ACTION PERFORMED</th>
                    <th>TARGET</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="log-timestamp">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <strong>{log.actorEmail}</strong>
                        <div className="sub-text">{log.actorClerkId}</div>
                      </td>
                      <td>
                        <span className="audit-action-tag">{log.action}</span>
                      </td>
                      <td>
                        <code>{log.targetId || 'N/A'}</code>
                      </td>
                      <td>
                        <span className="log-details-text">{log.details || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )

  const renderCustomerRestrictedView = () => (
    <div className="customer-restricted-card" role="alert">
      <div className="restricted-badge-wrap">
        <ShieldAlert size={36} />
      </div>
      <span className="restricted-eyebrow">ACCESS RESTRICTED</span>
      <h3>KAVORYN STUDIO ADMINISTRATOR PORTAL</h3>
      <p>
        Your account (<strong>{user?.primaryEmailAddress?.emailAddress}</strong>) is currently designated as a{' '}
        <span className="role-pill role-customer">CUSTOMER</span>.
        Administrative access to live store orders, custom briefs, and fulfillment operations is reserved for verified studio personnel.
      </p>

      {customerPendingRequest ? (
        <div className="pending-status-box">
          <Clock size={20} />
          <div>
            <strong>REQUEST UNDER REVIEW BY SUPER ADMIN</strong>
            <p>
              Submitted on{' '}
              {new Date(customerPendingRequest.requestedAt).toLocaleDateString('en-IN', {
                dateStyle: 'medium',
              })}
              :
            </p>
            <blockquote className="request-quote">"{customerPendingRequest.reason}"</blockquote>
            <small>
              Status: <strong>{customerPendingRequest.status.toUpperCase()}</strong> · You will be notified once reviewed.
            </small>
          </div>
        </div>
      ) : (
        <div className="request-access-box">
          <h4>REQUEST STUDIO ADMINISTRATOR PRIVILEGES</h4>
          <p>
            If you are a gallery curator, production lead, or fulfillment partner, submit your justification below:
          </p>
          <form onSubmit={handleCustomerRequestAccess} className="request-access-form">
            <textarea
              required
              rows={3}
              value={customerRequestReason}
              onChange={(e) => setCustomerRequestReason(e.target.value)}
              placeholder="State your role and why you require store operations access..."
            />
            <button
              type="submit"
              className="button blue"
              disabled={isSubmittingCustomerRequest || customerRequestReason.trim().length < 5}
            >
              {isSubmittingCustomerRequest ? (
                <span>SUBMITTING REQUEST...</span>
              ) : (
                <>
                  <KeyRound size={14} />
                  <span>SUBMIT PRIVILEGE REQUEST</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="restricted-footer-actions">
        <Link to="/profile" className="button outline">
          <span>GO TO CLIENT PROFILE</span>
        </Link>
        <Link to="/" className="button blue">
          <span>RETURN TO STOREFRONT</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="admin-page section">
      {/* Top Admin Navigation Header */}
      <div className="admin-header">
        <div>
          <div className="admin-eyebrow-row">
            <span className="eyebrow">KAVORYN STUDIO MANAGEMENT</span>
            <span className="admin-portal-badge">RESTRICTED PORTAL</span>
          </div>
          <h1 className="admin-title">
            STUDIO
            <br />
            <em>OPERATIONS.</em>
          </h1>
        </div>

        <div className="admin-auth-status">
          {isClerkConfigured ? (
            <>
              <Show when="signed-in">
                <div className="user-profile-widget">
                  <UserButton />
                  <div className="user-profile-text">
                    <strong>{user?.fullName || user?.primaryEmailAddress?.emailAddress}</strong>
                    <span className="role-tag">
                      {dbUser ? dbUser.role.replace('_', ' ').toUpperCase() : 'STUDIO LEAD'}
                    </span>
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="button blue auth-trigger-btn">
                    <Lock size={14} />
                    <span>SIGN IN VIA CLERK</span>
                  </button>
                </SignInButton>
              </Show>
            </>
          ) : (
            <div className="dev-auth-badge">
              <UserCheck size={14} />
              <span>DEV ADMIN ACCESS (SANDBOX)</span>
            </div>
          )}
        </div>
      </div>

      {/* Security Architecture Notice */}
      <div className="admin-boundary-banner" role="alert">
        <ShieldAlert size={24} className="boundary-icon" />
        <div className="boundary-text">
          <strong>SECURITY BOUNDARY & CLERK ENFORCEMENT</strong>
          <p>
            This portal is strictly segregated from public customer pages. Per
            Rule 10 and Phase 2 architecture, all order mutations (`adminUpdateStatus`),
            custom brief reviews, role updates, and product catalog controls enforce server-side authentication
            checks. No sensitive backend credentials are leaked in client code.
          </p>
        </div>
      </div>

      {/* Conditionally render Clerk gated content if Clerk is active, otherwise render dashboard */}
      {isClerkConfigured ? (
        <>
          <Show when="signed-in">
            {dbUser?.role === 'customer' ? (
              renderCustomerRestrictedView()
            ) : (
              renderAdminDashboardContent()
            )}
          </Show>
          <Show when="signed-out">
            <div className="clerk-locked-card" role="alert">
              <Lock size={44} />
              <h3>AUTHENTICATION REQUIRED</h3>
              <p>
                Sign in with your KAVORYN studio administrative account to access
                production orders, custom requests, and store settings.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                <SignInButton mode="modal">
                  <button className="button blue">
                    <span>SIGN IN TO ADMIN PORTAL</span>
                    <ArrowRight size={16} />
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="button ghost">
                    <span>REGISTER ACCOUNT</span>
                    <ArrowRight size={16} />
                  </button>
                </SignUpButton>
              </div>
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '4px', maxWidth: '480px', margin: '1.25rem auto 0', textAlign: 'left' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  💡 <strong>Seeing &quot;Couldn&apos;t find your account&quot;?</strong><br />
                  Click <strong>REGISTER ACCOUNT</strong> (or <em>&quot;Sign up&quot;</em> in Clerk) if you have not registered your credentials yet.
                </p>
              </div>
            </div>
          </Show>
        </>
      ) : (
        renderAdminDashboardContent()
      )}

      <div className="admin-footer-nav">
        <Link to="/" className="button outline">
          <span>← BACK TO STOREFRONT</span>
        </Link>
        <Link to="/shop" className="button blue">
          <span>CATALOG PREVIEW</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
