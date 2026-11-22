import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/react'
import { Header } from './components/Header'
import { Drawer } from './components/Drawer'
import { Footer } from './components/Footer'
import { Toast } from './components/Toast'
import { ProductErrorBoundary } from './components/ErrorBoundary'
import { storeBackend } from './lib/convex-client'
import { Home } from './pages/Home'
import type { CartLine } from './types'

// Secondary routes lazy-loaded for optimal initial bundle & chunk splitting
const Shop = lazy(() => import('./pages/Shop').then((m) => ({ default: m.Shop })))
const ProductPage = lazy(() =>
  import('./pages/ProductPage').then((m) => ({ default: m.ProductPage }))
)
const Cart = lazy(() => import('./pages/Cart').then((m) => ({ default: m.Cart })))
const Checkout = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.Checkout })))
const Customize = lazy(() => import('./pages/Customize').then((m) => ({ default: m.Customize })))
const AboutPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({ default: m.AboutPage }))
)
const ContactPage = lazy(() =>
  import('./pages/StaticPages').then((m) => ({ default: m.ContactPage }))
)
const TrackOrderPage = lazy(() =>
  import('./pages/TrackOrder').then((m) => ({ default: m.TrackOrderPage }))
)
const ProfilePage = lazy(() =>
  import('./pages/Profile').then((m) => ({ default: m.ProfilePage }))
)
const AdminPage = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminPage })))
const SuperAdminPage = lazy(() =>
  import('./pages/SuperAdmin').then((m) => ({ default: m.SuperAdminPage }))
)
const AdminCataloguePage = lazy(() =>
  import('./pages/admin/AdminCatalogue').then((m) => ({ default: m.AdminCataloguePage }))
)
const OrderSuccess = lazy(() =>
  import('./pages/OrderSuccess').then((m) => ({ default: m.OrderSuccess }))
)
const NotFound = lazy(() =>
  import('./pages/OrderSuccess').then((m) => ({ default: m.NotFound }))
)

function PageLoadingFallback() {
  return (
    <div className="page-route-loader" role="status" aria-live="polite">
      <div className="loader-inner">
        <span className="loader-brand">
          KAVORYN<span>.</span>
        </span>
        <div className="loader-bar">
          <div className="loader-bar-fill" />
        </div>
      </div>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * Role-Based Auth Navigator:
 * Automatically detects authenticated Clerk session and Convex server-side role.
 * Routes SUPER_ADMIN to /super-admin, ADMIN to /admin, and CUSTOMER to customer experience.
 */
function RoleBasedAuthNavigator() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const handledRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && user) {
      const userKey = `${user.id}_${location.pathname}`
      if (handledRef.current !== userKey) {
        handledRef.current = userKey

        const email = (
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          ''
        ).trim().toLowerCase()
        const name = user.fullName || undefined

        const runAuthRouting = async () => {
          await storeBackend.syncUser({ email, name })
          const currentUser = await storeBackend.getCurrentUser(email)
          if (!currentUser) return
          const path = location.pathname

          // Authoritative server-side role based navigation
          if (currentUser.role === 'super_admin') {
            if (path === '/' || path === '/admin' || path === '/signin' || path === '/login' || path === '/profile') {
              navigate('/super-admin')
            }
          } else if (currentUser.role === 'admin') {
            if (path === '/' || path === '/super-admin' || path === '/signin' || path === '/login') {
              navigate('/admin')
            }
          }
        }

        runAuthRouting().catch((err: unknown) => {
          console.warn('Role navigation error:', err)
        })
      }
    } else {
      handledRef.current = null
    }
  }, [isSignedIn, isLoaded, user, location.pathname, navigate])

  return null
}

export function App() {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const stored = localStorage.getItem('kavoryn-cart')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [recentlyAdded, setRecentlyAdded] = useState<CartLine | null>(null)

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('kavoryn-cart', JSON.stringify(lines))
    } catch {
      // Local storage write error fallback
    }
  }, [lines])

  const addToCart = (newLine: CartLine) => {
    setLines((prev) => {
      // Differentiate products strictly by product ID, size, and finish variant
      const existingIdx = prev.findIndex(
        (l) =>
          l.product.id === newLine.product.id &&
          l.size === newLine.size &&
          l.finish === newLine.finish
      )

      if (existingIdx >= 0) {
        return prev.map((item, idx) =>
          idx === existingIdx
            ? { ...item, qty: item.qty + newLine.qty }
            : item
        )
      }
      return [...prev, newLine]
    })

    setRecentlyAdded(newLine)
  }

  const totalCount = lines.reduce((acc, l) => acc + l.qty, 0)

  return (
    <div className="app-shell">
      {/* Accessible skip link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        SKIP TO MAIN CONTENT
      </a>

      <ScrollToTop />
      <RoleBasedAuthNavigator />

      <Header
        count={totalCount}
        isMenuOpen={drawerOpen}
        onMenu={handleOpenDrawer}
      />

      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />

      <Toast
        item={recentlyAdded}
        onClose={() => setRecentlyAdded(null)}
      />

      <main id="main-content" tabIndex={-1}>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/collections/:slug" element={<Shop />} />
            <Route
              path="/product/:slug"
              element={
                <ProductErrorBoundary>
                  <ProductPage add={addToCart} />
                </ProductErrorBoundary>
              }
            />
            <Route path="/cart" element={<Cart lines={lines} setLines={setLines} />} />
            <Route path="/checkout" element={<Checkout lines={lines} />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/customize" element={<Customize />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Dedicated administrative portals */}
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/catalogue" element={<AdminCataloguePage />} />
            <Route path="/super-admin" element={<SuperAdminPage />} />
            <Route path="/super-admin/catalogue" element={<AdminCataloguePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
