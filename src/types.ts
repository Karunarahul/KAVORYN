import type { Collection, PosterFinish, Product, prices } from './data'

export type { Collection, PosterFinish, Product }
export type PosterSize = keyof typeof prices

export type ProductRenderMode = 'image' | 'procedural'

export interface CartLine {
  product: Product
  size: PosterSize
  finish: PosterFinish
  qty: number
}

export interface SizeDimension {
  cm: string
  inches: string
  label: string
}

export type DeleteEligibilityType =
  | 'deletable'
  | 'referenced_by_orders'
  | 'referenced_by_active_carts'
  | 'already_archived'
  | 'not_found'

export interface ReferencingOrderSummary {
  orderNumber: string
  status: string
  paymentStatus: string
  createdAt: number
  itemCount: number
}

export interface DeleteEligibilityResult {
  eligibility: DeleteEligibilityType
  canDelete: boolean
  canArchive: boolean
  isArchived: boolean
  reason: string
  product?: {
    id: string
    name: string
    sku: string
    status: 'draft' | 'published' | 'archived'
  }
  referencingOrdersCount: number
  referencingOrders: ReferencingOrderSummary[]
}

