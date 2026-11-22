import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useUser } from '@clerk/react'
import {
  storeBackend,
  type DBProduct,
  type DBUser,
} from '../../lib/convex-client'
import { formatMoney } from '../../data'
import { ProductEditorModal } from './ProductEditorModal'

export const AdminCataloguePage: React.FC = () => {
  const { user } = useUser()

  const [dbUser, setDbUser] = useState<DBUser | null>(null)
  const [products, setProducts] = useState<DBProduct[]>([])
  const [collectionsList, setCollectionsList] = useState<
    Array<{ slug: string; name: string; description: string; displayOrder: number }>
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [collectionFilter, setCollectionFilter] = useState<string>('all')
  const [renderModeFilter, setRenderModeFilter] = useState<'all' | 'image' | 'procedural'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null)

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

  const loadData = async () => {
    try {
      const email = (
        user?.primaryEmailAddress?.emailAddress ||
        user?.emailAddresses?.[0]?.emailAddress ||
        ''
      ).trim().toLowerCase()

      const currentUser = await storeBackend.getCurrentUser(email)
      setDbUser(currentUser)

      if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
        const [prods, cols] = await Promise.all([
          storeBackend.getAllProductsForAdmin(),
          storeBackend.getCollections(),
        ])
        setProducts(prods)
        setCollectionsList(cols)
      }
    } catch (err) {
      notifyErr(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let ignore = false
    const init = async () => {
      try {
        const email = (
          user?.primaryEmailAddress?.emailAddress ||
          user?.emailAddresses?.[0]?.emailAddress ||
          ''
        ).trim().toLowerCase()

        const currentUser = await storeBackend.getCurrentUser(email)
        if (ignore) return
        setDbUser(currentUser)

        if (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
          const [prods, cols] = await Promise.all([
            storeBackend.getAllProductsForAdmin(),
            storeBackend.getCollections(),
          ])
          if (ignore) return
          setProducts(prods)
          setCollectionsList(cols)
        }
      } catch (err) {
        if (!ignore) notifyErr(err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    void init()
    return () => {
      ignore = true
    }
  }, [user])

  const openNewProductModal = () => {
    setEditingProduct(null)
    setIsEditModalOpen(true)
  }

  const openEditProductModal = (prod: DBProduct) => {
    setEditingProduct(prod)
    setIsEditModalOpen(true)
  }

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive '${name}'? It will be immediately removed from the active storefront.`)) return
    try {
      await storeBackend.adminArchiveProduct(id)
      notify(`'${name}' archived.`)
      await loadData()
    } catch (err) {
      notifyErr(err)
    }
  }

  const handleRestore = async (id: string, name: string) => {
    try {
      await storeBackend.adminRestoreProduct(id, 'published')
      notify(`'${name}' restored to published catalogue.`)
      await loadData()
    } catch (err) {
      notifyErr(err)
    }
  }

  const handleDuplicate = async (id: string, name: string) => {
    try {
      await storeBackend.adminDuplicateProduct(id)
      notify(`Duplicated '${name}' as a new draft.`)
      await loadData()
    } catch (err) {
      notifyErr(err)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete '${name}'? This action cannot be undone and will fail if the print is part of historical customer orders.`)) return
    try {
      await storeBackend.adminDeleteProduct(id)
      notify(`'${name}' permanently deleted.`)
      await loadData()
    } catch (err) {
      notifyErr(err)
    }
  }

  // Access Control Gates
  if (isLoading) {
    return (
      <div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="profile-loading">
          <RefreshCw size={24} className="spinner" />
          <span>VERIFYING ADMINISTRATIVE ACCESS...</span>
        </div>
      </div>
    )
  }

  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
    return (
      <div className="section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="customer-restricted-card" role="alert">
          <ShieldAlert size={36} />
          <span className="restricted-eyebrow">UNAUTHORIZED</span>
          <h3>ADMINISTRATIVE ACCESS RESTRICTED</h3>
          <p>The catalogue management console requires studio administrator authorization.</p>
          <div className="restricted-footer-actions">
            <Link to="/" className="button blue">RETURN TO STOREFRONT</Link>
          </div>
        </div>
      </div>
    )
  }

  // Metrics
  const totalCount = products.length
  const publishedCount = products.filter((p) => p.status === 'published' || (!p.status && p.active)).length
  const draftCount = products.filter((p) => p.status === 'draft' || (!p.status && !p.active)).length
  const archivedCount = products.filter((p) => p.status === 'archived').length

  // Filtered Items
  const filtered = products.filter((p) => {
    const effectiveStatus = p.status || (p.active ? 'published' : 'draft')
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter
    const matchesCollection = collectionFilter === 'all' || p.collection === collectionFilter
    const effectiveRenderMode = p.renderMode || (p.thumbnailUrl ? 'image' : 'procedural')
    const matchesRenderMode = renderModeFilter === 'all' || effectiveRenderMode === renderModeFilter
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesCollection && matchesRenderMode && matchesSearch
  })

  return (
    <div className="admin-page section">
      {/* Header */}
      <header className="super-admin-header">
        <div>
          <div className="admin-eyebrow-row">
            <Link to={dbUser.role === 'super_admin' ? '/super-admin' : '/admin'} className="breadcrumb-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <ArrowLeft size={14} />
              <span>{dbUser.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN'} CONSOLE</span>
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="eyebrow">CATALOGUE MANAGER</span>
          </div>
          <h1 className="admin-title">
            STUDIO
            <br />
            <em>CATALOGUE.</em>
          </h1>
          <p className="section-subtitle" style={{ margin: '0.5rem 0 0', maxWidth: '600px' }}>
            Authoritative product inventory, artwork media storage, pricing matrix, and publication lifecycle.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="button outline"
            onClick={() => loadData()}
            title="Refresh catalogue data"
          >
            <RefreshCw size={14} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            className="button blue"
            onClick={openNewProductModal}
          >
            <Plus size={16} />
            <span>NEW PRODUCT</span>
          </button>
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

      {/* Metrics Row */}
      <div className="admin-metrics-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card">
          <span className="metric-label">TOTAL PRODUCTS</span>
          <strong className="metric-val">{totalCount}</strong>
          <small className="metric-hint">Across all lifecycle states</small>
        </div>
        <div className="metric-card highlight-card">
          <span className="metric-label">PUBLISHED & ACTIVE</span>
          <strong className="metric-val">{publishedCount}</strong>
          <small className="metric-hint">Live on customer storefront</small>
        </div>
        <div className="metric-card">
          <span className="metric-label">DRAFT DESIGNS</span>
          <strong className="metric-val">{draftCount}</strong>
          <small className="metric-hint">Under studio curation</small>
        </div>
        <div className="metric-card">
          <span className="metric-label">ARCHIVED EDITIONS</span>
          <strong className="metric-val">{archivedCount}</strong>
          <small className="metric-hint">Preserved for historical orders</small>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              {st.toUpperCase()}
            </button>
          ))}
          <span style={{ color: 'var(--color-border)', margin: '0 0.25rem' }}>|</span>
          {(['all', 'image', 'procedural'] as const).map((rm) => (
            <button
              key={rm}
              type="button"
              className={`filter-pill ${renderModeFilter === rm ? 'active' : ''}`}
              onClick={() => setRenderModeFilter(rm)}
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            >
              {rm === 'all' ? 'ALL MODES' : rm === 'image' ? 'IMAGE MODE' : 'PROCEDURAL'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            className="admin-filter-select"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'inherit' }}
          >
            <option value="all">ALL COLLECTIONS</option>
            {collectionsList.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input
              type="text"
              placeholder="Search prints or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.5rem 0.75rem 0.5rem 2.25rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'inherit', width: '220px' }}
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU / ARTWORK TITLE</th>
              <th>RENDER MODE</th>
              <th>COLLECTION</th>
              <th>LIFECYCLE STATUS</th>
              <th>PRICE RANGE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  No catalogue products matched the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((prod) => {
                const effectiveStatus = prod.status || (prod.active ? 'published' : 'draft')
                const effectiveRenderMode = prod.renderMode || (prod.thumbnailUrl ? 'image' : 'procedural')

                return (
                  <tr key={prod.id || prod.sku}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {effectiveRenderMode === 'image' && prod.thumbnailUrl ? (
                          <img
                            src={prod.thumbnailUrl}
                            alt={prod.name}
                            style={{
                              width: '40px',
                              height: '52px',
                              objectFit: 'cover',
                              borderRadius: '2px',
                              border: '1px solid var(--color-border)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '52px',
                              backgroundColor: prod.colors[0],
                              border: '1px solid var(--color-border)',
                              borderRadius: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: '0.55rem', color: prod.colors[1], fontWeight: 700 }}>
                              {prod.sku.substring(4, 7)}
                            </span>
                          </div>
                        )}
                        <div>
                          <strong>{prod.name}</strong>
                          {prod.printMasterStorageId && (
                            <span
                              title="Print Master on Archive"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                fontSize: '0.65rem',
                                color: '#10b981',
                                marginLeft: '6px',
                                fontWeight: 700,
                              }}
                            >
                              <Check size={10} /> MASTER
                            </span>
                          )}
                          <br />
                          <small style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{prod.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`role-pill ${
                          effectiveRenderMode === 'image' ? 'role-admin' : 'role-customer'
                        }`}
                        style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                      >
                        {effectiveRenderMode === 'image' ? 'ARTWORK IMAGE' : 'PROCEDURAL'}
                      </span>
                    </td>
                    <td>
                      <span className="role-tag" style={{ textTransform: 'uppercase' }}>{prod.collection}</span>
                    </td>
                    <td>
                      <span
                        className={`role-pill ${
                          effectiveStatus === 'published'
                            ? 'role-super-admin'
                            : effectiveStatus === 'draft'
                              ? 'role-admin'
                              : 'role-customer'
                        }`}
                      >
                        {effectiveStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {formatMoney(prod.prices?.A4 || 149)} — {formatMoney(prod.prices?.A1 || 699)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="button ghost small"
                          title="Edit product"
                          onClick={() => openEditProductModal(prod)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          className="button ghost small"
                          title="Duplicate as new draft"
                          onClick={() => prod._id && handleDuplicate(prod._id, prod.name)}
                        >
                          <Copy size={14} />
                        </button>
                        {effectiveStatus === 'archived' ? (
                          <button
                            type="button"
                            className="button outline small"
                            title="Restore product"
                            onClick={() => prod._id && handleRestore(prod._id, prod.name)}
                          >
                            <RotateCcw size={14} />
                            <span>RESTORE</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="button ghost small"
                            title="Archive product"
                            onClick={() => prod._id && handleArchive(prod._id, prod.name)}
                          >
                            <Archive size={14} />
                          </button>
                        )}
                        {dbUser.role === 'super_admin' && (
                          <button
                            type="button"
                            className="button ghost small"
                            title="Permanently delete"
                            style={{ color: '#ef4444' }}
                            onClick={() => prod._id && handleDelete(prod._id, prod.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <Link
                          to={`/product/${prod.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="button ghost small"
                          title="View live PDP"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Redesigned Premium Product Editor Modal */}
      {isEditModalOpen && (
        <ProductEditorModal
          isOpen={isEditModalOpen}
          key={editingProduct?._id || 'new-product'}
          onClose={() => setIsEditModalOpen(false)}
          editingProduct={editingProduct}
          collectionsList={collectionsList}
          onSaveSuccess={(msg) => {
            notify(msg)
            loadData()
          }}
          notifyErr={notifyErr}
          isSuperAdmin={dbUser.role === 'super_admin'}
          onArchive={handleArchive}
        />
      )}
    </div>
  )
}
