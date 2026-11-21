import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Info, Loader2, Send, Sparkles } from 'lucide-react'
import { products, sizeDimensions } from '../data'
import { Poster } from '../components/Poster'
import { storeBackend } from '../lib/convex-client'

const PRESET_PALETTES: Array<{
  name: string
  colors: [string, string, string]
}> = [
  { name: 'Cobalt & Paper', colors: ['#3155E7', '#F5F1E8', '#D6F04A'] },
  { name: 'Ink & Acid', colors: ['#171717', '#D6F04A', '#F05A3A'] },
  { name: 'Acid & Ink', colors: ['#D6F04A', '#171717', '#3155E7'] },
  { name: 'Vermilion & Paper', colors: ['#F05A3A', '#F5F1E8', '#171717'] },
  { name: 'Paper & Cobalt', colors: ['#F5F1E8', '#3155E7', '#F05A3A'] },
]

export const Customize: React.FC = () => {
  const [customText, setCustomText] = useState('YOUR WORDS HERE')
  const [paletteIndex, setPaletteIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState<'A4' | 'A3' | 'A2' | 'A1'>('A3')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [referenceCode, setReferenceCode] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })

  // Use product 12 ('Your Name') as base template
  const baseProduct = products[11]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const selectedPalette = PRESET_PALETTES[paletteIndex]
      const result = await storeBackend.submitCustomRequest({
        name: form.name,
        email: form.email,
        phone: form.phone,
        customText,
        palette: {
          name: selectedPalette.name,
          colors: selectedPalette.colors,
        },
        size: selectedSize,
        notes: form.notes,
      })

      setReferenceCode(result.referenceCode)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit custom request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="customize-page">
      <section className="customize-hero">
        <div className="customize-copy">
          <div className="customize-eyebrow-wrap">
            <span className="eyebrow">PERSONAL / ONE-OF-ONE COMMISSIONS</span>
            <span className="customize-pill">STUDIO BESPOKE</span>
          </div>

          <h1 className="customize-title">
            PUT YOUR
            <br />
            <em>WORDS</em> UP.
          </h1>

          <p className="lede">
            Have a motto, an unrepeatable phrase, a name, or coordinates you live
            by? We’ll typeset it in KAVORYN’s signature typographic layout and
            print it as a 1-of-1 archival art piece.
          </p>

          <div className="customize-steps-list">
            <div className="step-item">
              <span className="step-num">01</span>
              <div>
                <strong>Interactive On-Screen Preview:</strong> Test your words
                and explore studio color harmonies in real-time.
              </div>
            </div>
            <div className="step-item">
              <span className="step-num">02</span>
              <div>
                <strong>Manual Studio Typesetting:</strong> Our typographer
                hand-crafts letterforms, balances negative space, and sends a
                high-res proof via WhatsApp/email within 24 hours.
              </div>
            </div>
            <div className="step-item">
              <span className="step-num">03</span>
              <div>
                <strong>Archival Print & Delivery:</strong> Once approved,
                printed on 230 GSM matte stock and shipped in a rigid tube
                across India.
              </div>
            </div>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div className="customize-interactive-stage">
          <div className="stage-preview-wrapper">
            <span className="live-preview-tag">
              ON-SCREEN PREVIEW ONLY · NOT PRINT-READY
            </span>
            <Poster
              p={baseProduct}
              large
              customText={customText}
              customColors={PRESET_PALETTES[paletteIndex].colors}
            />
            <div className="preview-disclaimer-box">
              <Info size={14} />
              <span>
                Simulated on-screen preview. The final physical print is manually
                typeset at 300+ DPI with optical kerning by the studio before
                press output.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Customizer Controls & Brief Submission */}
      <section className="section customize-builder-section">
        <div className="builder-grid">
          {/* Controls Box */}
          <div className="builder-controls-card">
            <h2 className="builder-heading">1. CRAFT YOUR VISUAL DIRECTION</h2>

            <div className="control-group">
              <label htmlFor="custom-words-input" className="control-label">
                POSTER TEXT / MANIFESTO PHRASE
              </label>
              <input
                id="custom-words-input"
                className="custom-text-input"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                placeholder="TYPE YOUR PHRASE HERE..."
                maxLength={45}
                aria-describedby="custom-words-hint"
              />
              <small id="custom-words-hint" className="control-hint">
                Recommended: 2–6 impactful words for bold graphic balance.
              </small>
            </div>

            <div className="control-group">
              <span className="control-label">SELECT STUDIO PALETTE</span>
              <div
                className="palette-picker-grid"
                role="radiogroup"
                aria-label="Studio color palette"
              >
                {PRESET_PALETTES.map((pal, idx) => (
                  <button
                    key={pal.name}
                    type="button"
                    role="radio"
                    aria-checked={paletteIndex === idx}
                    className={`palette-pick-btn ${paletteIndex === idx ? 'active' : ''}`}
                    onClick={() => setPaletteIndex(idx)}
                  >
                    <div className="palette-triad">
                      <span style={{ backgroundColor: pal.colors[0] }} />
                      <span style={{ backgroundColor: pal.colors[1] }} />
                      <span style={{ backgroundColor: pal.colors[2] }} />
                    </div>
                    <span className="pal-btn-name">{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <span className="control-label">INTENDED DISPLAY SIZE</span>
              <div
                className="size-pill-row"
                role="radiogroup"
                aria-label="Intended display size"
              >
                {(['A4', 'A3', 'A2', 'A1'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selectedSize === s}
                    className={`size-choice-btn ${selectedSize === s ? 'selected' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    <span>{s}</span>
                    <small className="size-pill-dim">{sizeDimensions[s].cm}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submission Form */}
          <div className="builder-form-card">
            <h2 className="builder-heading">2. SUBMIT YOUR BRIEF TO DATABASE</h2>

            {errorMsg && (
              <div className="form-error-banner" role="alert">
                <Info size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {referenceCode ? (
              <div className="customize-success-card" role="alert">
                <div className="success-icon-wrap" aria-hidden="true">
                  <Sparkles size={28} />
                </div>
                <h3>BRIEF STORED IN DATABASE!</h3>
                <div className="reference-code-badge">
                  <span>REFERENCE CODE:</span>
                  <strong>{referenceCode}</strong>
                </div>
                <p>
                  Thank you, <strong>{form.name}</strong>. Your custom phrase
                  has been queued in the studio production desk:
                  <br />
                  <em className="brief-highlight">"{customText}"</em>
                </p>
                <p className="brief-sub">
                  We will share your high-resolution digital proof via WhatsApp/email at{' '}
                  <strong>{form.phone || form.email}</strong> within 24 hours.
                </p>
                <div className="brief-actions">
                  <button
                    type="button"
                    className="button outline"
                    onClick={() => {
                      setReferenceCode(null)
                      setForm({ name: '', email: '', phone: '', notes: '' })
                    }}
                  >
                    SUBMIT ANOTHER BRIEF
                  </button>
                  <Link to="/admin" className="button acid">
                    VIEW IN STUDIO ADMIN
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="custom-brief-form" aria-label="Custom commission brief form">
                <label className="form-field">
                  <span>YOUR NAME *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="e.g. Diya Sengupta"
                    autoComplete="name"
                  />
                </label>

                <label className="form-field">
                  <span>EMAIL ADDRESS *</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="diya@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="form-field">
                  <span>WHATSAPP NUMBER (FOR PROOFS) *</span>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                  />
                  <small className="field-hint">
                    We will send the layout mockup here for your sign-off before
                    printing.
                  </small>
                </label>

                <label className="form-field">
                  <span>SPECIAL NOTES / DESIGN INSTRUCTIONS</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="e.g. Please emphasize the second word; intended as an anniversary gift."
                  />
                </label>

                <button
                  type="submit"
                  className="button acid submit-brief-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="spinner" />
                      <span>STORING IN DATABASE...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>SUBMIT BRIEF & REQUEST PROOF</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="brief-guarantee">
                  <Check size={14} />
                  <span>
                    Zero commitment until you approve the proof. Custom prints
                    are ₹499 for A3 / ₹699 for A2.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
