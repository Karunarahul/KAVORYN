import type { Collection, PosterFinish, Product, prices } from './data'

export type { Collection, PosterFinish, Product }
export type PosterSize = keyof typeof prices

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
