import React from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import {
  collections,
  collectionDescriptions,
  products,
  type Collection,
} from '../data'
import { ProductCard } from '../components/ProductCard'

export const Shop: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()

  // Determine active filter: either valid collection slug or 'all'
  const isCollectionValid = slug && slug in collections
  const activeFilter: 'all' | Collection = isCollectionValid
    ? (slug as Collection)
    : 'all'

  const filteredProducts =
    activeFilter === 'all'
      ? products
      : products.filter((p) => p.collection === activeFilter)

  const handleFilterClick = (filter: 'all' | Collection) => {
    if (filter === 'all') {
      navigate('/shop')
    } else {
      navigate(`/collections/${filter}`)
    }
  }

  // Count items per collection
  const getCount = (col: 'all' | Collection) => {
    if (col === 'all') return products.length
    return products.filter((p) => p.collection === col).length
  }

  return (
    <section className="shop section">
      <div className="shop-header">
        <div className="shop-breadcrumbs">
          <Link to="/" className="breadcrumb-link">
            HOME
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            {activeFilter === 'all'
              ? 'THE FIRST EDITION'
              : collections[activeFilter]}
          </span>
        </div>

        <p className="eyebrow">
          THE FIRST EDITION / {products.length} ARCHIVAL PRINTS
        </p>

        <h1 className="shop-title">
          {activeFilter === 'all' ? (
            <>
              FIND YOUR
              <br />
              <em>FREQUENCY.</em>
            </>
          ) : (
            <>
              COLLECTION /
              <br />
              <em>{collections[activeFilter]}.</em>
            </>
          )}
        </h1>

        <p className="shop-collection-desc">
          {activeFilter === 'all'
            ? 'Twelve contemporary compositions typeset for rooms with an opinion. Printed on demand in India on 230 GSM archival matte paper.'
            : collectionDescriptions[activeFilter]}
        </p>
      </div>

      <div className="filters-container">
        <div className="filters-label">
          <SlidersHorizontal size={14} />
          <span>FILTER COLLECTION:</span>
        </div>

        <div className="filters-pills" role="tablist" aria-label="Filter prints by collection">
          <button
            role="tab"
            aria-selected={activeFilter === 'all'}
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterClick('all')}
          >
            ALL PRINTS
            <span className="pill-count">({getCount('all')})</span>
          </button>

          {(Object.keys(collections) as Collection[]).map((colKey) => (
            <button
              key={colKey}
              role="tab"
              aria-selected={activeFilter === colKey}
              className={`filter-pill ${activeFilter === colKey ? 'active' : ''}`}
              onClick={() => handleFilterClick(colKey)}
            >
              {collections[colKey]}
              <span className="pill-count">({getCount(colKey)})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="results-summary">
        <span className="results-count">
          SHOWING {filteredProducts.length}{' '}
          {filteredProducts.length === 1 ? 'PRINT' : 'PRINTS'}
          {activeFilter !== 'all' && ` IN ${collections[activeFilter]}`}
        </span>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No prints found in this selection.</p>
          <p className="empty-desc">
            Try switching to another collection or explore the entire First
            Edition.
          </p>
          <button
            className="button blue"
            onClick={() => handleFilterClick('all')}
          >
            <ArrowLeft size={16} />
            <span>SHOW ALL 12 PRINTS</span>
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  )
}
