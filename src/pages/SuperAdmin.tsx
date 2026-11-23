import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Show, SignInButton, SignUpButton, UserButton, useUser } from '@clerk/react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Database,
  ExternalLink,
  History,
  KeyRound,
  Layers,
  Lock,
  Package,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { formatMoney } from '../data'
import { ProductDeleteModal } from '../components/ProductDeleteModal'
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

export const SuperAdminPage: React.FC = () => {
  const { user, isLoaded } = useUser()
  const navigate = useNavigate()

  const currentEmail = (
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    ''
  ).trim().toLowerCase()
  const isAuthorizedSuperEmail =
    currentEmail === 'karunarahul8885@gmail.com' || currentEmail === 'admin@kavoryn.com'

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'orders'
    | 'products'
    | 'customers'
    | 'admins'
    | 'requests'
    | 'diagnostics'
    | 'settings'
    | 'logs'
  >('overview')

  // Auth & RBAC State
  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [isSyncing, setIsSyncing] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Platform Data
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [, setCustomRequests] = useState<DBCustomRequest[]>([])
  const [products, setProducts] = useState<DBProduct[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DBProduct | null>(null)
  const [customers, setCustomers] = useState<
    Array<{
      _id: string
      clerkId: string
      email: string
      name?: string
      role: UserRole
      createdAt: number
      totalOrders: number
      paidOrders: number
      totalSpent: number
    }>
  >([])
  const [usersList, setUsersList] = useState<DBUser[]>([])
  const [adminRequestsList, setAdminRequestsList] = useState<DBAdminRequest[]>([])
  const [activityLogs, setActivityLogs] = useState<DBActivityLog[]>([])
  const [, setSettings] = useState<DBSettings>({
    freeShippingThreshold: 499,
    standardShippingFee: 79,
    currency: 'INR',
  })

  // Settings form
  const [thresholdInput, setThresholdInput] = useState(499)
  const [feeInput, setFeeInput] = useState(79)

  // Payment Diagnostics
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<{
    success: boolean
    orderId?: string
    error?: string
    testedAt?: number
  } | null>(null)

  // Order filters
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'paid' | 'fulfilled' | 'cancelled'>('all')
  const [orderSearchQuery, setOrderSearchQuery] = useState('')

  const loadAllData = async () => {
    setIsSyncing(true)
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
        try {
          if (isAuthorizedSuperEmail) {
            await storeBackend.bootstrapSuperAdmin({ email, name })
          }
          await storeBackend.syncUser({ email, name })
        } catch (e) {
          console.warn('Sync notice:', e)
        }
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

      // Only fetch full administrative data if authorized as super_admin
      if (currentUser?.role === 'super_admin') {
        const [ordList, reqList, prodList, custList, uList, rList, lList, setts] =
          await Promise.all([
            storeBackend.getAdminOrders(),
            storeBackend.getAdminCustomRequests(),
            storeBackend.getAllProductsForAdmin(),
            storeBackend.adminListCustomers(),
            storeBackend.adminListUsers(),
            storeBackend.adminListRequests(),
            storeBackend.adminGetActivityLogs(),
            storeBackend.getSettings(),
          ])

        setOrders(ordList)
        setCustomRequests(reqList)
        setProducts(prodList)
        setCustomers(custList)
        setUsersList(uList)
        setAdminRequestsList(rList)
        setActivityLogs(lList)
        setSettings(setts)
        setThresholdInput(setts.freeShippingThreshold)
        setFeeInput(setts.standardShippingFee)
      }
    } catch (err: unknown) {
      console.warn('Super Admin data load error:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (isLoaded) {
      void (async () => {
        await loadAllData()
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoaded])

  // Notification helper
  const notify = (msg: string) => {
    setActionNotice(msg)
    setActionError(null)
    setTimeout(() => setActionNotice(null), 4000)
  }

  const notifyErr = (err: unknown) => {
    setActionError(err instanceof Error ? err.message : 'Action failed.')
    setActionNotice(null)
    setTimeout(() => setActionError(null), 6000)
  }

  // --- Administrative Handlers ---
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: 'pending' | 'paid' | 'fulfilled' | 'cancelled'
  ) => {
    try {
      await storeBackend.updateOrderStatus(orderId, status)
      notify(`Order ${orderId} transitioned to: ${status.toUpperCase()}`)
      loadAllData()
    } catch (err: unknown) {
      notifyErr(err)
    }
  }

  const handleToggleProduct = async (id: string, currentActive: boolean) => {
    try {
      await storeBackend.toggleProductActive(id, !currentActive)
      notify(`Product status updated to: ${!currentActive ? 'ACTIVE' : 'INACTIVE'}`)
      loadAllData()
    } catch (err: unknown) {
      notifyErr(err)
    }
  }

  const handleReviewRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await storeBackend.adminReviewRequest(requestId, action)
      notify(`Request ${action === 'approve' ? 'approved (user promoted to Admin)' : 'rejected'}.`)
      loadAllData()
    } catch (err: unknown) {
      notifyErr(err)
    }
  }

  const handleUpdateUserRole = async (targetClerkId: string, newRole: UserRole) => {
    try {
      await storeBackend.adminUpdateUserRole(targetClerkId, newRole)
      notify(`User authorization updated to: ${newRole.toUpperCase()}`)
      loadAllData()
    } catch (err: unknown) {
      notifyErr(err)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await storeBackend.updateSettings(thresholdInput, feeInput)
      notify('Store shipping configuration successfully updated in database.')
      loadAllData()
    } catch (err: unknown) {
      notifyErr(err)
    }
  }

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true)
    try {
      const res = await storeBackend.testRazorpayConnection()
      setDiagnosticResult({ ...res, testedAt: Date.now() })
      if (res.success) {
        notify(`Payment gateway operational. Authentic test order: ${res.orderId}`)
      } else {
        notifyErr(new Error(res.error || 'Gateway test failed'))
      }
    } finally {
      setIsRunningDiagnostic(false)
    }
  }

  // Computed metrics
  const totalRevenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'fulfilled')
    .reduce((sum, o) => sum + o.total, 0)
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length
  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length
  const fulfilledOrdersCount = orders.filter((o) => o.status === 'fulfilled').length
  const pendingRequestsCount = adminRequestsList.filter((r) => r.status === 'pending').length
  const adminStaffCount = usersList.filter(
    (u) => u.role === 'admin' || u.role === 'super_admin'
  ).length

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderFilter === 'all' || o.status === orderFilter
    const matchesSearch =
      !orderSearchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.name.toLowerCase().includes(orderSearchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Denied Views
  const renderCustomerDeniedView = () => {
    const currentEmail = (
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      ''
    ).trim().toLowerCase()
    const isAuthorizedSuperEmail =
      currentEmail === 'karunarahul8885@gmail.com' || currentEmail === 'admin@kavoryn.com'

    if (isAuthorizedSuperEmail) {
      return (
        <div className="customer-restricted-card" role="alert">
          <div className="restricted-badge-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', borderColor: 'var(--color-blue)' }}>
            <ShieldCheck size={36} color="var(--color-blue)" />
          </div>
          <span className="restricted-eyebrow" style={{ color: 'var(--color-blue)' }}>EXECUTIVE IDENTITY RECOGNIZED</span>
          <h3>SUPER ADMIN ACTIVATION</h3>
          <p>
            Authorized Super Admin identity (<strong>{currentEmail}</strong>) confirmed.
            Click below to establish your permanent executive session.
          </p>
          <div className="restricted-footer-actions">
            <button
              type="button"
              className="button blue"
              onClick={async () => {
                setIsSyncing(true)
                try {
                  await storeBackend.bootstrapSuperAdmin({ email: currentEmail, name: user?.fullName || undefined })
                  await storeBackend.syncUser({ email: currentEmail, name: user?.fullName || undefined })
                  await loadAllData()
                  notify('Super Admin executive session successfully established.')
                } catch (err: unknown) {
                  notifyErr(err)
                  setIsSyncing(false)
                }
              }}
            >
              <ShieldCheck size={16} />
              <span>ACTIVATE SUPER ADMIN ROLE</span>
            </button>
            <Link to="/" className="button outline">
              <span>RETURN TO STOREFRONT</span>
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="customer-restricted-card" role="alert">
        <div className="restricted-badge-wrap">
          <ShieldAlert size={36} />
        </div>
        <span className="restricted-eyebrow">UNAUTHORIZED ACCESS</span>
        <h3>SUPER ADMIN CONSOLE RESTRICTED</h3>
        <p>
          Your account (<strong>{currentEmail || 'Anonymous'}</strong>) is currently designated with role{' '}
          <span className="role-pill role-customer">CUSTOMER</span>.
          Super Admin permissions (user roles, access approvals, payment diagnostics, and audit logs) are restricted to authorized studio leadership.
        </p>
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
  }

  const renderAdminDeniedView = () => {
    const currentEmail = (
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      ''
    ).trim().toLowerCase()

    return (
      <div className="customer-restricted-card" role="alert">
        <div className="restricted-badge-wrap">
          <AlertTriangle size={36} />
        </div>
        <span className="restricted-eyebrow">SUPER ADMIN PRIVILEGES REQUIRED</span>
        <h3>STUDIO ADMIN ACCESS LEVEL</h3>
        <p>
          Your account (<strong>{currentEmail}</strong>) has{' '}
          <span className="role-pill role-admin">STUDIO ADMIN</span> privileges.
          Full Super Admin capabilities (role management, audit logs, and gateway diagnostics) require Super Admin clearance.
        </p>
        <div className="restricted-footer-actions">
          <button type="button" className="button blue" onClick={() => navigate('/admin')}>
            <span>GO TO STUDIO OPERATIONS (/admin)</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="super-admin-page section">
      {/* Top Super Admin Header */}
      <header className="super-admin-header">
        <div>
          <div className="admin-eyebrow-row">
            <span className="eyebrow">KAVORYN EXECUTIVE CONTROL</span>
            <span className="super-admin-live-badge">
              <ShieldCheck size={12} />
              <span>SUPER ADMIN CONSOLE · PERMANENT</span>
            </span>
          </div>
          <h1 className="admin-title">
            SUPER
            <br />
            <em>ADMIN.</em>
          </h1>
        </div>

        <div className="super-admin-auth-box">
          {isClerkConfigured ? (
            <>
              <Show when="signed-in">
                <div className="user-profile-widget">
                  <UserButton />
                  <div className="user-profile-text">
                    <strong>{user?.fullName || user?.primaryEmailAddress?.emailAddress}</strong>
                    <span className="role-tag super-admin-tag">
                      {dbUser?.role === 'super_admin' ? 'SUPER ADMIN' : dbUser?.role?.toUpperCase() || 'VERIFYING...'}
                    </span>
                  </div>
                </div>
              </Show>
              <Show when="signed-out">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <SignInButton mode="modal">
                    <button className="button blue auth-trigger-btn">
                      <Lock size={14} />
                      <span>SIGN IN</span>
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="button outline auth-trigger-btn">
                      <span>REGISTER</span>
                    </button>
                  </SignUpButton>
                </div>
              </Show>
            </>
          ) : (
            <div className="dev-auth-badge">
              <UserCheck size={14} />
              <span>SANDBOX ENVIRONMENT</span>
            </div>
          )}
        </div>
      </header>

      {/* Notifications */}
      {actionNotice && (
        <div className="admin-action-banner" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}
      {actionError && (
        <div className="track-error-alert" role="alert">
          <ShieldAlert size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Access Gate */}
      {isClerkConfigured ? (
        <>
          <Show when="signed-out">
            <div className="clerk-locked-card" role="alert">
              <Lock size={44} />
              <h3>SUPER ADMIN AUTHENTICATION REQUIRED</h3>
              <p>
                Sign in or register with your authorized Super Admin account (<strong>karunarahul8885@gmail.com</strong>) to access
                full system control, user authorization, and payment diagnostics.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                <SignInButton mode="modal">
                  <button className="button blue">
                    <span>SIGN IN</span>
                    <ArrowRight size={16} />
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="button ghost">
                    <span>CREATE / REGISTER ACCOUNT</span>
                    <ArrowRight size={16} />
                  </button>
                </SignUpButton>
              </div>
              <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '4px', maxWidth: '480px', margin: '1.25rem auto 0', textAlign: 'left' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  💡 <strong>Seeing &quot;Couldn&apos;t find your account&quot;?</strong><br />
                  That means this email has not been registered in the Clerk directory yet. Click <strong>CREATE / REGISTER ACCOUNT</strong> above (or click <em>&quot;Sign up&quot;</em> in the Clerk popup) with <strong>karunarahul8885@gmail.com</strong>. Once created, you will automatically receive the <code>SUPER_ADMIN</code> role.
                </p>
              </div>
            </div>
          </Show>

          <Show when="signed-in">
            {isSyncing || (isAuthorizedSuperEmail && dbUser?.role !== 'super_admin') ? (
              <div className="profile-loading" role="status">
                <RefreshCw size={24} className="spinner" />
                <span>VERIFYING SUPER ADMIN AUTHORIZATION...</span>
              </div>
            ) : dbUser?.role === 'customer' ? (
              renderCustomerDeniedView()
            ) : dbUser?.role === 'admin' ? (
              renderAdminDeniedView()
            ) : (
              /* Authorized Super Admin Dashboard */
              <>
                {/* Executive KPI Summary */}
                <div className="admin-metrics-grid">
                  <div className="metric-card highlight-card">
                    <span className="metric-label">GROSS REVENUE (SETTLED)</span>
                    <strong className="metric-val">{formatMoney(totalRevenue)}</strong>
                    <small className="metric-hint">
                      {paidOrdersCount + fulfilledOrdersCount} captured transactions
                    </small>
                  </div>

                  <div className="metric-card">
                    <span className="metric-label">TOTAL ORDERS</span>
                    <strong className="metric-val">{orders.length}</strong>
                    <small className="metric-hint">
                      {paidOrdersCount} paid · {pendingOrdersCount} pending · {fulfilledOrdersCount} fulfilled
                    </small>
                  </div>

                  <div className="metric-card">
                    <span className="metric-label">REGISTERED CUSTOMERS</span>
                    <strong className="metric-val">{customers.length}</strong>
                    <small className="metric-hint">
                      {customers.filter((c) => c.paidOrders > 0).length} repeat acquiring clients
                    </small>
                  </div>

                  <div className="metric-card">
                    <span className="metric-label">ADMINISTRATIVE STAFF</span>
                    <strong className="metric-val">{adminStaffCount}</strong>
                    <small className="metric-hint">
                      {pendingRequestsCount > 0 ? (
                        <span className="alert-text">{pendingRequestsCount} pending requests!</span>
                      ) : (
                        'All requests resolved'
                      )}
                    </small>
                  </div>
                </div>

                {/* Super Admin Navigation Tabs */}
                <div className="admin-tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'overview'}
                    className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <Activity size={16} />
                    <span>SYSTEM OVERVIEW</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'orders'}
                    className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    <Package size={16} />
                    <span>ORDERS & PAYMENTS ({orders.length})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'products'}
                    className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                  >
                    <SlidersHorizontal size={16} />
                    <span>CATALOG ({products.length})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'customers'}
                    className={`admin-tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                  >
                    <Users size={16} />
                    <span>CUSTOMERS ({customers.length})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'admins'}
                    className={`admin-tab-btn super-tab ${activeTab === 'admins' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admins')}
                  >
                    <ShieldCheck size={16} />
                    <span>ADMIN MANAGEMENT ({adminStaffCount})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'requests'}
                    className={`admin-tab-btn super-tab ${activeTab === 'requests' ? 'active' : ''}`}
                    onClick={() => setActiveTab('requests')}
                  >
                    <KeyRound size={16} />
                    <span>ACCESS REQUESTS ({pendingRequestsCount})</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'diagnostics'}
                    className={`admin-tab-btn super-tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('diagnostics')}
                  >
                    <Server size={16} />
                    <span>PAYMENT DIAGNOSTICS</span>
                  </button>

                  <button
                    role="tab"
                    aria-selected={activeTab === 'settings'}
                    className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings size={16} />
                    <span>SETTINGS</span>
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
                </div>

                {/* PANEL 1: OVERVIEW & SYSTEM HEALTH */}
                {activeTab === 'overview' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>EXECUTIVE SYSTEM HEALTH & CONTROL</h3>
                      <button
                        type="button"
                        className="button outline refresh-btn"
                        onClick={loadAllData}
                        disabled={isSyncing}
                      >
                        <RefreshCw size={14} className={isSyncing ? 'spinner' : ''} />
                        <span>REFRESH DATA</span>
                      </button>
                    </div>

                    <div className="health-grid">
                      <div className="health-card active">
                        <div className="health-head">
                          <ShieldCheck size={20} />
                          <strong>SUPER ADMIN IDENTITY</strong>
                        </div>
                        <p>Authenticated: <code>{dbUser?.email}</code></p>
                        <span className="health-status-tag">VERIFIED CLERK JWT</span>
                      </div>

                      <div className="health-card active">
                        <div className="health-head">
                          <CreditCard size={20} />
                          <strong>RAZORPAY PAYMENT GATEWAY</strong>
                        </div>
                        <p>Key ID: <code>rzp_test_U2x730Z4HcGdMR</code></p>
                        <span className="health-status-tag">TEST MODE ACTIVE</span>
                      </div>

                      <div className="health-card active">
                        <div className="health-head">
                          <Database size={20} />
                          <strong>CONVEX CLOUD BACKEND</strong>
                        </div>
                        <p>Deployment: <code>resolute-bison-903</code></p>
                        <span className="health-status-tag">PRODUCTION READY</span>
                      </div>
                    </div>

                    <div className="quick-actions-bar">
                      <h4>EXECUTIVE ACTIONS</h4>
                      <div className="action-button-strip">
                        <button
                          type="button"
                          className="button acid"
                          onClick={() => setActiveTab('requests')}
                        >
                          <KeyRound size={14} />
                          <span>REVIEW ACCESS REQUESTS ({pendingRequestsCount})</span>
                        </button>
                        <button
                          type="button"
                          className="button blue"
                          onClick={handleRunDiagnostic}
                          disabled={isRunningDiagnostic}
                        >
                          <Server size={14} />
                          <span>TEST RAZORPAY ORDERS API</span>
                        </button>
                        <Link to="/admin" className="button outline">
                          <span>GO TO STUDIO OPERATIONS</span>
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 2: ORDERS & PAYMENTS */}
                {activeTab === 'orders' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>ORDERS & PAYMENT MANAGEMENT</h3>
                      <div className="order-filter-strip">
                        {(['all', 'pending', 'paid', 'fulfilled', 'cancelled'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            className={`filter-pill-btn ${orderFilter === st ? 'active' : ''}`}
                            onClick={() => setOrderFilter(st)}
                          >
                            {st.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="search-wrap">
                      <Search size={16} />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="Search by order number, customer name, or email..."
                      />
                    </div>

                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ORDER ID / DATE</th>
                            <th>CUSTOMER</th>
                            <th>DESTINATION</th>
                            <th>VALUE</th>
                            <th>GATEWAY STATUS</th>
                            <th>FULFILLMENT CONTROL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((ord) => (
                            <tr key={ord._id}>
                              <td>
                                <strong>{ord.orderNumber}</strong>
                                <div className="sub-text">
                                  {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                    dateStyle: 'medium',
                                  })}
                                </div>
                              </td>
                              <td>
                                <strong>{ord.name}</strong>
                                <div className="sub-text">{ord.email}</div>
                                <small className="phone-text">{ord.phone}</small>
                              </td>
                              <td>
                                <div>{ord.address.city}, {ord.address.state}</div>
                                <small className="pin-text">PIN: {ord.address.postalCode}</small>
                              </td>
                              <td>
                                <strong>{formatMoney(ord.total)}</strong>
                                <div className="sub-text">{ord.items.length} print(s)</div>
                              </td>
                              <td>
                                <span className={`status-pill pill-${ord.paymentStatus || 'pending'}`}>
                                  {(ord.paymentStatus || 'pending').toUpperCase()}
                                </span>
                                {ord.razorpayOrderId && (
                                  <div className="sub-text">RZP: {ord.razorpayOrderId}</div>
                                )}
                              </td>
                              <td>
                                <div className="action-buttons-group">
                                  {ord.status !== 'fulfilled' && (
                                    <button
                                      type="button"
                                      className="button acid table-btn"
                                      onClick={() => handleUpdateOrderStatus(ord._id, 'fulfilled')}
                                    >
                                      MARK FULFILLED
                                    </button>
                                  )}
                                  {ord.status !== 'cancelled' && (
                                    <button
                                      type="button"
                                      className="button outline table-btn demote-btn"
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
                  </div>
                )}

                {/* PANEL 3: CATALOG & COLLECTIONS */}
                {activeTab === 'products' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>PRODUCT CATALOG & DESIGN EDITIONS</h3>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Link to="/super-admin/catalogue" className="button blue">
                          <Layers size={14} />
                          <span>FULL CATALOGUE MANAGER</span>
                        </Link>
                        <span className="panel-counter">{products.length} FIRST EDITION PRINTS</span>
                      </div>
                    </div>

                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>TITLE & SKU</th>
                            <th>COLLECTION</th>
                            <th>MOTIF</th>
                            <th>PRICING (A4 / A3 / A2 / A1)</th>
                            <th>STOREFRONT VISIBILITY</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.name}</strong>
                                <div className="sub-text">SKU: {p.sku} · Slug: {p.slug}</div>
                              </td>
                              <td>
                                <span className="collection-tag">{p.collection.toUpperCase()}</span>
                              </td>
                              <td>
                                <span className="motif-text">{p.motif}</span>
                              </td>
                              <td>
                                <code>
                                  {formatMoney(p.prices.A4)} · {formatMoney(p.prices.A3)} · {formatMoney(p.prices.A2)} · {formatMoney(p.prices.A1)}
                                </code>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`toggle-active-btn ${p.active ? 'is-active' : 'is-inactive'}`}
                                  onClick={() => handleToggleProduct(p.id, p.active)}
                                >
                                  {p.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                  <span>{p.active ? 'ACTIVE' : 'HIDDEN'}</span>
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="button ghost small"
                                  title="Permanently delete or archive print"
                                  style={{ color: '#ef4444' }}
                                  onClick={() => setDeleteTarget(p)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PANEL 4: CUSTOMER DIRECTORY */}
                {activeTab === 'customers' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>CUSTOMER DIRECTORY & PURCHASING METRICS</h3>
                      <span className="panel-counter">{customers.length} REGISTERED CLIENTS</span>
                    </div>

                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>CLIENT PROFILE</th>
                            <th>EMAIL</th>
                            <th>ORDERS PLACED</th>
                            <th>PAID ORDERS</th>
                            <th>TOTAL SPEND</th>
                            <th>JOINED</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customers.map((c) => (
                            <tr key={c._id}>
                              <td>
                                <strong>{c.name || 'Client'}</strong>
                                <div className="sub-text">{c.clerkId}</div>
                              </td>
                              <td>
                                <code>{c.email}</code>
                              </td>
                              <td>
                                <strong>{c.totalOrders}</strong>
                              </td>
                              <td>
                                <span className={`status-pill ${c.paidOrders > 0 ? 'pill-paid' : 'pill-pending'}`}>
                                  {c.paidOrders} PAID
                                </span>
                              </td>
                              <td>
                                <strong>{formatMoney(c.totalSpent)}</strong>
                              </td>
                              <td>
                                {new Date(c.createdAt).toLocaleDateString('en-IN', {
                                  dateStyle: 'medium',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* PANEL 5: ADMINISTRATOR MANAGEMENT */}
                {activeTab === 'admins' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>STUDIO ADMINISTRATORS & PERMISSIONS</h3>
                      <span className="panel-counter">{usersList.length} TOTAL USERS</span>
                    </div>

                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>USER</th>
                            <th>EMAIL</th>
                            <th>ROLE</th>
                            <th>JOINED</th>
                            <th>AUTHORIZATION ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((u) => {
                            const isSelf = Boolean(dbUser && u.clerkId === dbUser.clerkId)
                            return (
                              <tr key={u.clerkId}>
                                <td>
                                  <strong>{u.name || 'Studio Member'}</strong>
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
                                      <span>CURRENT SUPER ADMIN (PROTECTED)</span>
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

                {/* PANEL 6: ACCESS REQUESTS */}
                {activeTab === 'requests' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>PENDING ADMINISTRATOR ACCESS REQUESTS</h3>
                      <span className="panel-counter">{pendingRequestsCount} PENDING</span>
                    </div>

                    {adminRequestsList.length === 0 ? (
                      <div className="empty-panel-card">
                        <KeyRound size={36} />
                        <h4>NO ACCESS REQUESTS</h4>
                        <p>No customer accounts have submitted requests for administrative privileges.</p>
                      </div>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>CANDIDATE</th>
                              <th>SUBMITTED</th>
                              <th>JUSTIFICATION</th>
                              <th>STATUS</th>
                              <th>REVIEW</th>
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

                {/* PANEL 7: PAYMENT DIAGNOSTICS */}
                {activeTab === 'diagnostics' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>RAZORPAY PAYMENT GATEWAY DIAGNOSTICS</h3>
                      <button
                        type="button"
                        className="button acid"
                        onClick={handleRunDiagnostic}
                        disabled={isRunningDiagnostic}
                      >
                        {isRunningDiagnostic ? (
                          <>
                            <RefreshCw size={14} className="spinner" />
                            <span>QUERYING RAZORPAY SERVERS...</span>
                          </>
                        ) : (
                          <>
                            <Server size={14} />
                            <span>EXECUTE ORDERS API TEST</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="diagnostics-summary-card">
                      <div className="diag-item">
                        <span>GATEWAY MODE:</span>
                        <strong>TEST MODE</strong>
                      </div>
                      <div className="diag-item">
                        <span>PUBLIC KEY ID:</span>
                        <code>rzp_test_U2x730Z4HcGdMR</code>
                      </div>
                      <div className="diag-item">
                        <span>CAPTURE METHOD:</span>
                        <strong>AUTOMATIC SERVER CAPTURE</strong>
                      </div>
                      <div className="diag-item">
                        <span>WEBHOOK SIGNATURE VERIFICATION:</span>
                        <strong>HMAC-SHA256 (CONSTANT-TIME)</strong>
                      </div>
                    </div>

                    {diagnosticResult && (
                      <div
                        className={`diagnostic-result-banner ${
                          diagnosticResult.success ? 'diag-success' : 'diag-fail'
                        }`}
                        role="status"
                      >
                        {diagnosticResult.success ? (
                          <>
                            <CheckCircle2 size={24} />
                            <div>
                              <h4>RAZORPAY ORDERS API: OPERATIONAL</h4>
                              <p>
                                Authentic Razorpay Order generated: <code>{diagnosticResult.orderId}</code>
                              </p>
                              <small>
                                HTTP Basic Auth verified. Target: https://api.razorpay.com/v1/orders
                              </small>
                            </div>
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={24} />
                            <div>
                              <h4>DIAGNOSTIC TEST FAILED</h4>
                              <p>{diagnosticResult.error}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PANEL 8: WEBSITE SETTINGS */}
                {activeTab === 'settings' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>LOGISTICS & STORE CONFIGURATION</h3>
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
                        <span>SAVE CONFIGURATION</span>
                        <ArrowRight size={16} />
                      </button>
                    </form>
                  </div>
                )}

                {/* PANEL 9: AUDIT LOGS */}
                {activeTab === 'logs' && (
                  <div className="admin-panel">
                    <div className="panel-toolbar">
                      <h3>IMMUTABLE ADMINISTRATIVE AUDIT LOGS</h3>
                      <span className="panel-counter">{activityLogs.length} LOGGED EVENTS</span>
                    </div>

                    {activityLogs.length === 0 ? (
                      <div className="empty-panel-card">
                        <History size={36} />
                        <h4>NO AUDIT LOGS RECORDED</h4>
                        <p>Administrative actions will be permanently recorded here.</p>
                      </div>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>TIMESTAMP</th>
                              <th>ACTOR</th>
                              <th>ACTION</th>
                              <th>TARGET ID</th>
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
            )}
          </Show>
        </>
      ) : (
        <div className="profile-tab-content">
          <p>Clerk Authentication is not currently configured.</p>
        </div>
      )}

      {/* Footer Return Navigation */}
      <div className="admin-footer-nav">
        <Link to="/" className="button outline">
          <span>← BACK TO STOREFRONT</span>
        </Link>
        <Link to="/admin" className="button outline">
          <span>STUDIO OPERATIONS (/admin)</span>
        </Link>
        <Link to="/shop" className="button blue">
          <span>CATALOG PREVIEW</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Super Admin Protected Delete & Safe Archival Modal */}
      {deleteTarget && (
        <ProductDeleteModal
          isOpen={!!deleteTarget}
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={async (msg) => {
            notify(msg)
            setDeleteTarget(null)
            await loadAllData()
          }}
          onArchived={async (msg) => {
            notify(msg)
            setDeleteTarget(null)
            await loadAllData()
          }}
        />
      )}
    </div>
  )
}
