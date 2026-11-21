import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, ShoppingBag, X } from 'lucide-react'
import type { CartLine } from '../types'

interface ToastProps {
  item: CartLine | null
  onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({ item, onClose }) => {
  useEffect(() => {
    if (!item) return
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [item, onClose])

  if (!item) return null

  return (
    <div className="toast-notification" role="status" aria-live="polite">
      <div className="toast-icon">
        <Check size={18} />
      </div>
      <div className="toast-content">
        <div className="toast-title">ADDED TO YOUR SELECTION</div>
        <div className="toast-desc">
          <strong>{item.product.name}</strong> ({item.size} · {item.finish})
        </div>
      </div>
      <Link to="/cart" className="toast-action" onClick={onClose}>
        <ShoppingBag size={14} />
        <span>VIEW CART</span>
      </Link>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
