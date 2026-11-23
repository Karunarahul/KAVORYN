import React from 'react'

interface PrelaunchPosterProps {
  className?: string
  priority?: boolean
}

/**
 * PrelaunchPoster
 * A large, original graphic composition inspired by Swiss editorial and contemporary brutalist poster design.
 * Features bold asymmetric geometry, contrasting colors (Ink, Paper, Cobalt, Acid, Vermilion),
 * experimental typography, registration marks, and small edition numbering (01/26).
 */
export const PrelaunchPoster: React.FC<PrelaunchPosterProps> = ({ className = '' }) => {
  return (
    <div
      className={`prelaunch-poster-frame ${className}`}
      role="img"
      aria-label="KAVORYN First Collection campaign artwork poster, edition 01/26"
    >
      <div className="prelaunch-poster-inner">
        {/* Archival Print Paper Inset */}
        <div className="poster-canvas">
          {/* Top Metadata Header */}
          <header className="poster-canvas-header">
            <div className="poster-meta-left">
              <span className="poster-kavoryn-tag">KAVORYN STUDIO</span>
              <span className="poster-coord">28°36&apos;N · 77°12&apos;E</span>
            </div>
            <div className="poster-meta-right">
              <span className="poster-edition-badge">01/26</span>
              <span className="poster-spec-pill">ARCHIVAL GICLÉE</span>
            </div>
          </header>

          {/* Main Visual Composition (Hero Graphic SVG) */}
          <div className="poster-visual-stage">
            <svg
              viewBox="0 0 600 800"
              className="poster-vector-art"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                {/* Subtle paper grain filter */}
                <filter id="posterGrain" x="0%" y="0%" width="100%" height="100%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.65"
                    numOctaves="3"
                    stitchTiles="stitch"
                    result="noise"
                  />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0"
                  />
                </filter>

                {/* Linear Gradients */}
                <linearGradient id="cobaltGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3155E7" />
                  <stop offset="100%" stopColor="#1B3BBF" />
                </linearGradient>

                <linearGradient id="vermilionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F05A3A" />
                  <stop offset="100%" stopColor="#D93D1B" />
                </linearGradient>

                {/* Diagonal Stripe Pattern */}
                <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#171717" strokeWidth="1.2" opacity="0.35" />
                </pattern>

                {/* Fine Dot Grid Pattern */}
                <pattern id="dotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="#171717" opacity="0.25" />
                </pattern>
              </defs>

              {/* Background Base */}
              <rect width="600" height="800" fill="#F5F1E8" />

              {/* Asymmetric Deep Black Angle Block */}
              <path d="M 0,0 L 420,0 L 260,800 L 0,800 Z" fill="#171717" />

              {/* Dot Grid Inset on Right Field */}
              <rect x="290" y="40" width="270" height="340" fill="url(#dotGrid)" />

              {/* Large Intersecting Cobalt Circle */}
              <circle cx="340" cy="380" r="180" fill="url(#cobaltGradient)" />

              {/* Hatch Pattern Overlay on Left Wedge */}
              <path d="M 0,220 L 260,220 L 200,520 L 0,520 Z" fill="url(#diagonalHatch)" />

              {/* Acid Neon Asymmetric Crescent / Disk Accent */}
              <circle cx="430" cy="240" r="85" fill="#D6F04A" />

              {/* Vermilion Architectural Wedge */}
              <polygon points="120,680 480,560 380,720" fill="url(#vermilionGradient)" opacity="0.95" />

              {/* Architectural Framing Guidelines (Swiss Grid) */}
              <line x1="40" y1="40" x2="560" y2="40" stroke="#F5F1E8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <line x1="40" y1="760" x2="560" y2="760" stroke="#171717" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
              <line x1="40" y1="40" x2="40" y2="760" stroke="#F5F1E8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <line x1="560" y1="40" x2="560" y2="760" stroke="#171717" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

              {/* Alignment Crosshairs (+) */}
              <g stroke="#171717" strokeWidth="1.2" opacity="0.6">
                {/* Top Right Cross */}
                <line x1="535" y1="65" x2="555" y2="65" />
                <line x1="545" y1="55" x2="545" y2="75" />
                {/* Bottom Left Cross */}
                <line x1="50" y1="735" x2="70" y2="735" stroke="#F5F1E8" />
                <line x1="60" y1="725" x2="60" y2="745" stroke="#F5F1E8" />
              </g>

              {/* Vertical Rotated Typography along spine */}
              <text
                x="-420"
                y="32"
                transform="rotate(-90)"
                fontFamily="'Space Mono', monospace"
                fontSize="10"
                letterSpacing="4"
                fill="#F5F1E8"
                opacity="0.8"
              >
                CONTEMPORARY GRAPHIC CULTURE · PRINT ARCHITECTURE
              </text>

              {/* Massive Bold Headline: FIRST COLLECTION */}
              <text
                x="50"
                y="180"
                fontFamily="'Anton', sans-serif"
                fontSize="92"
                letterSpacing="1"
                fill="#F5F1E8"
              >
                FIRST
              </text>
              <text
                x="50"
                y="265"
                fontFamily="'Anton', sans-serif"
                fontSize="92"
                letterSpacing="1"
                fill="#D6F04A"
              >
                COLLECTION
              </text>

              {/* Secondary Brutalist Typography Stamp */}
              <g transform="translate(60, 440)">
                <rect x="-10" y="-22" width="160" height="32" fill="#F5F1E8" />
                <text
                  x="0"
                  y="0"
                  fontFamily="'Space Grotesk', sans-serif"
                  fontSize="14"
                  fontWeight="700"
                  letterSpacing="1.5"
                  fill="#171717"
                >
                  DROPPING SOON
                </text>
              </g>

              {/* Spec Data Table (Center Right) */}
              <g transform="translate(360, 480)" fill="#171717" fontFamily="'Space Mono', monospace" fontSize="9">
                <text x="0" y="0" fontWeight="700" letterSpacing="1">SERIES // 01</text>
                <text x="0" y="16" opacity="0.7">EDITION: 01 / 26</text>
                <text x="0" y="32" opacity="0.7">WEIGHT: 230 GSM</text>
                <text x="0" y="48" opacity="0.7">ORIGIN: INDIA</text>
              </g>

              {/* Color Separation Swatch Bar (Bottom Right) */}
              <g transform="translate(370, 730)">
                <rect x="0" y="0" width="18" height="14" fill="#171717" />
                <rect x="22" y="0" width="18" height="14" fill="#3155E7" />
                <rect x="44" y="0" width="18" height="14" fill="#D6F04A" />
                <rect x="66" y="0" width="18" height="14" fill="#F05A3A" />
                <rect x="88" y="0" width="18" height="14" fill="#F5F1E8" stroke="#171717" strokeWidth="0.8" />
                <text x="115" y="11" fontFamily="'Space Mono', monospace" fontSize="8" fill="#171717" opacity="0.7">
                  CMYK+HEX
                </text>
              </g>

              {/* Studio Seal Badge (Floating Circle) */}
              <g transform="translate(195, 630)">
                <circle cx="45" cy="45" r="45" fill="#171717" stroke="#F5F1E8" strokeWidth="2" />
                <circle cx="45" cy="45" r="40" fill="none" stroke="#F5F1E8" strokeWidth="0.8" strokeDasharray="3 3" />
                <text
                  x="45"
                  y="38"
                  textAnchor="middle"
                  fontFamily="'Space Grotesk', sans-serif"
                  fontWeight="700"
                  fontSize="11"
                  letterSpacing="1"
                  fill="#F5F1E8"
                >
                  KAVORYN
                </text>
                <text
                  x="45"
                  y="54"
                  textAnchor="middle"
                  fontFamily="'Space Mono', monospace"
                  fontSize="7.5"
                  letterSpacing="1"
                  fill="#D6F04A"
                >
                  STUDIO
                </text>
              </g>

              {/* Grain Texture Overlay */}
              <rect width="600" height="800" filter="url(#posterGrain)" fill="#000" pointerEvents="none" />
            </svg>
          </div>

          {/* Footer Placard */}
          <footer className="poster-canvas-footer">
            <div className="placard-brand">
              <span className="placard-title">KAVORYN — PRE-LAUNCH CAMPAIGN</span>
              <span className="placard-sub">ORIGINAL GRAPHIC COMPOSITION · NEW DELHI, IN</span>
            </div>
            <div className="placard-edition font-mono">
              <span>MANIFESTO // 01</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
