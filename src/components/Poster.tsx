import React from 'react'
import type { Product } from '../data'

interface PosterProps {
  p: Product
  large?: boolean
  customText?: string
  customColors?: [string, string, string]
  className?: string
}

export const Poster: React.FC<PosterProps> = ({
  p,
  large = false,
  customText,
  customColors,
  className = '',
}) => {
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
      aria-label={`Art print: ${displayName}`}
    >
      <div className="poster-inner">
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
