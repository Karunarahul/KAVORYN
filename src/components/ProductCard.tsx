import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { collections, formatMoney, prices, type Product } from '../data'
import { Poster } from './Poster'

interface ProductCardProps {
  p: Product
}

export const ProductCard: React.FC<ProductCardProps> = ({ p }) => {
  return (
    <article className="product-card-wrap">
      <Link
        className="product-card"
        to={`/product/${p.slug}`}
        aria-label={`View ${p.name} poster details`}
      >
        <div className="card-media-wrapper">
          <Poster p={p} />
          <div className="card-hover-action">
            <span>EXPLORE PRINT</span>
            <ArrowUpRight size={16} />
          </div>
        </div>

        <div className="card-meta">
          <div className="card-top-row">
            <span className="card-collection">{collections[p.collection]}</span>
            <div className="card-palette" title="Studio color palette">
              {p.colors.map((c, idx) => (
                <span
                  key={idx}
                  className="palette-swatch"
                  style={{ backgroundColor: c }}
                  aria-label={`Color swatch ${c}`}
                />
              ))}
            </div>
          </div>

          <h3 className="card-title">{p.name}</h3>

          <div className="card-bottom-row">
            <div className="card-pricing">
              <span className="price-prefix">FROM</span>
              <span className="price-value">{formatMoney(prices.A4)}</span>
            </div>
            <span className="card-sizes">A4—A1</span>
          </div>
        </div>
      </Link>
    </article>
  )
}
