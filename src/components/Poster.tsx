import React, { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { Product } from '../data'

interface PosterProps {
  p: Product
  large?: boolean
  customText?: string
  customColors?: [string, string, string]
  className?: string
  objectFit?: 'cover' | 'contain'
}

export const Poster: React.FC<PosterProps> = ({
  p,
  large = false,
  customText,
  customColors,
  className = '',
  objectFit = 'cover',
}) => {
  const [imageError, setImageError] = useState(false)

  // Explicit render mode logic:
  // IF renderMode === 'image' OR (renderMode is omitted but a valid uploaded thumbnail URL exists)
  const isImageMode = p.renderMode === 'image' || (!p.renderMode && Boolean(p.thumbnailUrl))
  const hasArtwork = Boolean(p.thumbnailUrl) && !imageError

  // 1. IMAGE MODE with valid artwork: Render actual uploaded artwork
  if (isImageMode && hasArtwork) {
    return (
      <div
        className={`poster poster-image-mode ${large ? 'poster-large' : ''} ${className}`}
        role="img"
        aria-label={`Art print: ${p.name}`}
      >
        <img
          src={p.thumbnailUrl!}
          alt={p.name}
          className={`poster-image ${objectFit === 'contain' ? 'poster-image-contain' : ''}`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  // 2. IMAGE MODE with missing / failed artwork: Display explicit missing-artwork placeholder
  if (isImageMode && !hasArtwork) {
    return (
      <div
        className={`poster poster-image-mode ${large ? 'poster-large' : ''} ${className}`}
        role="img"
        aria-label={`Artwork missing for: ${p.name}`}
      >
        <div className="poster-missing-placeholder">
          <ImageOff size={large ? 32 : 24} className="missing-icon" />
          <span className="missing-title">ARTWORK REQUIRED</span>
          <span className="missing-meta">{p.sku} · IMAGE MODE</span>
        </div>
      </div>
    )
  }

  // 3. PROCEDURAL MODE: Render existing procedural Poster component
  const bg = customColors ? customColors[0] : p.colors[0]
  const fg = customColors ? customColors[1] : p.colors[1]
  const accent = customColors ? customColors[2] : p.colors[2]

  const displayName = customText && customText.trim().length > 0 ? customText : p.name
  const words = displayName.split(' ')

  return (
    <div
      className={`poster ${large ? 'poster-large' : ''} ${className}`}
      style={{
        backgroundColor: bg,
        color: fg,
        ['--poster-accent' as string]: accent,
      }}
      role="img"
      aria-label={`Art print: ${displayName}`}
    >
      <div className="poster-inner" aria-hidden="true">
        <div className="poster-header">
          <span className="poster-code">{p.sku}</span>
          <span className="poster-badge">230 GSM ARCHIVAL</span>
        </div>

        <div className="poster-body">
          {p.motif === 'type' ? (
            <strong className="poster-type-title">
              {words.map((word, i) => (
                <span key={`${word}-${i}`}>
                  {word}
                  {i < words.length - 1 && <br />}
                </span>
              ))}
            </strong>
          ) : (
            <div className="poster-graphic-container">
              <i className={`motif ${p.motif}`} />
              <b className="poster-graphic-title">{displayName}</b>
            </div>
          )}
        </div>

        <div className="poster-footer">
          <span className="poster-edition">FIRST EDITION</span>
          <span className="poster-index">
            KAVORYN STUDIO
            <br />
            01—26 / IN
          </span>
        </div>
      </div>
    </div>
  )
}
