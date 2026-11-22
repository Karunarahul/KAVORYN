import React from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  collections,
  collectionDescriptions,
  products as staticProducts,
  type Collection,
  type Product,
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

  // Reactive Convex Storefront Query: Published products only
  const liveItems = useQuery(api.products.list, {
    collection: activeFilter !== 'all' ? activeFilter : undefined,
  })

  // All published products for accurate category tab counts
  const allPublishedItems = useQuery(api.products.list, {})

  const displayedProducts: Product[] = liveItems
    ? liveItems.map((p) => ({
        id: p._id,
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        collection: p.collection as Collection,
        description: p.description,
        colors: p.colors as [string, string, string],
        motif: p.motif as Product['motif'],
        renderMode: (p.renderMode as 'image' | 'procedural') || (p.thumbnailUrl ? 'image' : 'procedural'),
        thumbnailUrl: p.thumbnailUrl,
      }))
    : activeFilter === 'all'
      ? staticProducts
      : staticProducts.filter((p) => p.collection === activeFilter)

  const handleFilterClick = (filter: 'all' | Collection) => {
    if (filter === 'all') {
      navigate('/shop')
    } else {
      navigate(`/collections/${filter}`)
    }
  }

  // Count items per collection (using live data if available, fallback to static)
  const getCount = (col: 'all' | Collection) => {
    if (allPublishedItems) {
      if (col === 'all') return allPublishedItems.length
      return allPublishedItems.filter((p) => p.collection === col).length
    }
    if (col === 'all') return staticProducts.length
    return staticProducts.filter((p) => p.collection === col).length
  }

  const totalArchivalCount = allPublishedItems ? allPublishedItems.length : staticProducts.length

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
          THE FIRST EDITION / {totalArchivalCount} ARCHIVAL PRINTS
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
          SHOWING {displayedProducts.length}{' '}
          {displayedProducts.length === 1 ? 'PRINT' : 'PRINTS'}
          {activeFilter !== 'all' && ` IN ${collections[activeFilter]}`}
        </span>
      </div>

      {displayedProducts.length === 0 ? (
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
            <span>SHOW ALL PRINTS</span>
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {displayedProducts.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  )
}
