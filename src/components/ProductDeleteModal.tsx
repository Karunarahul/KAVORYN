import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Clock,
  FileText,
  Lock,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { storeBackend, type DBProduct } from '../lib/convex-client'
import type { DeleteEligibilityResult } from '../types'

export interface ProductDeleteModalProps {
  isOpen: boolean
  product: DBProduct
  onClose: () => void
  onDeleted: (message: string) => Promise<void> | void
  onArchived: (message: string) => Promise<void> | void
}

/**
 * Format expected business and backend errors cleanly for administrators without raw Convex stack traces.
 */
function formatCleanErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred.'
  const rawMsg = err instanceof Error ? err.message : String(err)

  if (rawMsg.includes('referenced in historical customer order') || rawMsg.includes('financial audit history')) {
    return 'Permanent deletion blocked: This product is referenced by historical customer orders and must be archived instead to preserve audit records.'
  }
  if (rawMsg.includes('active customer checkout') || rawMsg.includes('referenced_by_active_carts')) {
    return 'Permanent deletion blocked: This product is part of active customer checkout sessions.'
  }
  if (rawMsg.includes('Unauthorized') || rawMsg.includes('Super Admin privileges required') || rawMsg.includes('Access restricted')) {
    return 'Permission denied: Super Admin authorization is required for permanent deletion.'
  }
  if (rawMsg.includes('Product not found')) {
    return 'Product not found in catalogue.'
  }
  // Strip Convex internal metadata / request IDs if present
  const clean = rawMsg.replace(/\[Request ID: [a-zA-Z0-9_-]+\]\s*/g, '').replace(/Server Error\s*/g, '').trim()
  return clean || 'Action failed. Please try again.'
}

export const ProductDeleteModal: React.FC<ProductDeleteModalProps> = ({
  isOpen,
  product,
  onClose,
  onDeleted,
  onArchived,
}) => {
  const [eligibilityData, setEligibilityData] = useState<DeleteEligibilityResult | null>(null)
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch deletion eligibility from authoritative backend on open
  useEffect(() => {
    let isMounted = true

    async function evaluateEligibility() {
      if (!product?._id) return
      setIsChecking(true)
      setErrorMessage(null)
      try {
        const result: DeleteEligibilityResult = await storeBackend.checkProductDeleteEligibility(product._id)
        if (isMounted) {
          setEligibilityData(result)
        }
      } catch (err: unknown) {
        console.error('Failed to evaluate delete eligibility:', err)
        if (isMounted) {
          setErrorMessage(formatCleanErrorMessage(err))
        }
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    if (isOpen && product?._id) {
      evaluateEligibility()
    }

    return () => {
      isMounted = false
    }
  }, [isOpen, product?._id])

  // Handle Escape key to safely close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  // Handle Archival Action
  const handleExecuteArchive = async () => {
    if (!product._id) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await storeBackend.adminArchiveProduct(product._id)
      const successMsg = `Product '${product.name}' (${product.sku}) archived successfully.`
      await onArchived(successMsg)
      onClose()
    } catch (err: unknown) {
      console.error('Archival failed:', err)
      setErrorMessage(formatCleanErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Permanent Deletion Action
  const handleExecutePermanentDelete = async () => {
    if (!product._id) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await storeBackend.adminDeleteProduct(product._id)
      const successMsg = `Product '${product.name}' (${product.sku}) permanently deleted.`
      await onDeleted(successMsg)
      onClose()
    } catch (err: unknown) {
      console.error('Permanent delete failed:', err)
      setErrorMessage(formatCleanErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const eligibility = eligibilityData?.eligibility
  const isOrderReferenced = eligibility === 'referenced_by_orders'
  const isAlreadyArchived = eligibility === 'already_archived' || (product.status === 'archived' && isOrderReferenced)
  const isCartReferenced = eligibility === 'referenced_by_active_carts'
  const isDeletable = eligibility === 'deletable'

  return (
    <div
      className="catalogue-modal-overlay delete-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="catalogue-modal-container delete-modal-container">
        {/* Modal Header */}
        <header className="delete-modal-header">
          <div className="delete-modal-header-left">
            {isChecking ? (
              <span className="delete-badge-pill checking">
                <RefreshCw size={12} className="spinner" />
                <span>CHECKING REFERENCES</span>
              </span>
            ) : isOrderReferenced || isAlreadyArchived ? (
              <span className="delete-badge-pill audit-locked">
                <Lock size={12} />
                <span>FINANCIAL AUDIT LOCK</span>
              </span>
            ) : isCartReferenced ? (
              <span className="delete-badge-pill cart-locked">
                <Clock size={12} />
                <span>ACTIVE CHECKOUT LOCK</span>
              </span>
            ) : isDeletable ? (
              <span className="delete-badge-pill danger-badge">
                <Trash2 size={12} />
                <span>PERMANENT REMOVAL</span>
              </span>
            ) : (
              <span className="delete-badge-pill neutral-badge">
                <FileText size={12} />
                <span>CATALOGUE GOVERNANCE</span>
              </span>
            )}

            <h2 id="delete-dialog-title" className="delete-modal-title">
              {isChecking
                ? 'Verifying deletion eligibility...'
                : isOrderReferenced || isAlreadyArchived || isCartReferenced
                  ? 'Permanent deletion unavailable'
                  : 'Confirm permanent deletion'}
            </h2>
          </div>

          <button
            type="button"
            className="catalogue-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>

        {/* Modal Body */}
        <div className="delete-modal-body">
          {/* Loading State */}
          {isChecking && (
            <div className="delete-modal-loading-box">
              <RefreshCw size={24} className="spinner" />
              <p>Analyzing historical customer orders, active checkouts, and financial audit references...</p>
            </div>
          )}

          {/* Inline Error Alert */}
          {errorMessage && (
            <div className="delete-modal-alert-box error" role="alert">
              <AlertTriangle size={18} className="alert-icon" />
              <div className="alert-content">
                <strong>Action restricted</strong>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {!isChecking && (
            <>
              {/* Product Info Summary Card */}
              <div className="delete-product-summary-card">
                <div className="summary-card-row">
                  <div className="summary-card-meta">
                    <span className="summary-label font-mono">TARGET PRODUCT</span>
                    <h3 className="summary-product-name">{product.name}</h3>
                    <div className="summary-sku-row font-mono">
                      <span>SKU: {product.sku}</span>
                      <span className="summary-dot">·</span>
                      <span>COLLECTION: {product.collection.toUpperCase()}</span>
                      <span className="summary-dot">·</span>
                      <span className={`summary-status-tag status-${product.status || 'published'}`}>
                        {(product.status || 'published').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenario 1: Referenced by Historical Orders */}
              {isOrderReferenced && !isAlreadyArchived && (
                <div className="delete-reason-panel warning-theme">
                  <div className="reason-header">
                    <ShieldAlert size={20} className="reason-icon warning" />
                    <div>
                      <h4 className="reason-title">Linked to historical customer orders</h4>
                      <p className="reason-desc">
                        This product is linked to historical customer orders. To preserve order
                        history and financial records, it cannot be permanently deleted.
                      </p>
                    </div>
                  </div>

                  {eligibilityData && eligibilityData.referencingOrdersCount > 0 && (
                    <div className="referenced-orders-section font-mono">
                      <div className="orders-section-header">
                        <span>PROTECTED ORDER REFERENCES ({eligibilityData.referencingOrdersCount})</span>
                      </div>
                      <div className="orders-pill-list">
                        {eligibilityData.referencingOrders.map((order) => (
                          <div key={order.orderNumber} className="order-reference-pill">
                            <span className="order-pill-num">#{order.orderNumber}</span>
                            <span className={`order-pill-status status-${order.status}`}>
                              {order.status.toUpperCase()}
                            </span>
                            <span className="order-pill-qty">
                              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="safe-archival-callout">
                    <strong>Recommended action: Safe Archival</strong>
                    <p>
                      Archiving safely removes this print from the public storefront and prevents future
                      purchases while preserving historical fulfillment receipts, accounting ledgers, and artwork masters.
                    </p>
                  </div>
                </div>
              )}

              {/* Scenario 2: Already Archived */}
              {isAlreadyArchived && (
                <div className="delete-reason-panel info-theme">
                  <div className="reason-header">
                    <Archive size={20} className="reason-icon info" />
                    <div>
                      <h4 className="reason-title">Product is already archived</h4>
                      <p className="reason-desc">
                        This product is already archived. To preserve order history and financial records for{' '}
                        {eligibilityData?.referencingOrdersCount || 1} historical customer order(s), permanent deletion
                        is permanently disabled.
                      </p>
                    </div>
                  </div>

                  {eligibilityData && eligibilityData.referencingOrdersCount > 0 && (
                    <div className="referenced-orders-section font-mono">
                      <div className="orders-section-header">
                        <span>HISTORICAL ORDERS PRESERVED</span>
                      </div>
                      <div className="orders-pill-list">
                        {eligibilityData.referencingOrders.map((order) => (
                          <div key={order.orderNumber} className="order-reference-pill">
                            <span className="order-pill-num">#{order.orderNumber}</span>
                            <span className={`order-pill-status status-${order.status}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scenario 3: Referenced by Active Carts / Pending Orders */}
              {isCartReferenced && (
                <div className="delete-reason-panel warning-theme">
                  <div className="reason-header">
                    <Clock size={20} className="reason-icon warning" />
                    <div>
                      <h4 className="reason-title">Referenced in active checkout sessions</h4>
                      <p className="reason-desc">
                        This product is currently part of active customer checkout sessions. It cannot be permanently
                        deleted while checkouts are pending. You may archive it instead to block new orders.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Scenario 4: Deletable (Zero Protected References) */}
              {isDeletable && (
                <div className="delete-reason-panel danger-theme">
                  <div className="reason-header">
                    <Trash2 size={20} className="reason-icon danger" />
                    <div>
                      <h4 className="reason-title">Zero protected references detected</h4>
                      <p className="reason-desc">
                        This product is not referenced in any historical customer orders or active checkouts.
                        Permanently deleting it will permanently remove the record from the database.
                      </p>
                    </div>
                  </div>
                  <div className="danger-warning-note">
                    <AlertTriangle size={15} />
                    <span>This action is immediate and cannot be undone.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <footer className="delete-modal-footer">
          <button
            type="button"
            className="button outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {isAlreadyArchived ? 'CLOSE' : 'CANCEL'}
          </button>

          {!isChecking && isOrderReferenced && !isAlreadyArchived && (
            <button
              type="button"
              className="button acid"
              onClick={handleExecuteArchive}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="spinner" />
                  <span>ARCHIVING...</span>
                </>
              ) : (
                <>
                  <Archive size={14} />
                  <span>ARCHIVE PRODUCT</span>
                </>
              )}
            </button>
          )}

          {!isChecking && isCartReferenced && (
            <button
              type="button"
              className="button acid"
              onClick={handleExecuteArchive}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="spinner" />
                  <span>ARCHIVING...</span>
                </>
              ) : (
                <>
                  <Archive size={14} />
                  <span>ARCHIVE PRODUCT</span>
                </>
              )}
            </button>
          )}

          {!isChecking && isDeletable && (
            <button
              type="button"
              className="button danger-btn"
              onClick={handleExecutePermanentDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="spinner" />
                  <span>DELETING...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>PERMANENTLY DELETE PRODUCT</span>
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
