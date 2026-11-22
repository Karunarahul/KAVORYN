import React, { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Check,
  Download,
  Eye,
  FileCheck,
  Image as ImageIcon,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Tag,
  Upload,
  X,
} from 'lucide-react'
import {
  storeBackend,
  type DBProduct,
} from '../../lib/convex-client'
import { type Collection, type Product } from '../../data'
import { Poster } from '../../components/Poster'

export interface ProductEditorModalProps {
  isOpen: boolean
  onClose: () => void
  editingProduct: DBProduct | null
  collectionsList: Array<{ slug: string; name: string; description: string; displayOrder: number }>
  onSaveSuccess: (message: string) => void
  notifyErr: (err: unknown) => void
  isSuperAdmin: boolean
  onArchive?: (id: string, name: string) => Promise<void>
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  onClose,
  editingProduct,
  collectionsList,
  onSaveSuccess,
  notifyErr,
  isSuperAdmin,
  onArchive,
}) => {
  // Form Field State Initializers
  const effectiveMode = editingProduct?.renderMode || (editingProduct?.thumbnailUrl ? 'image' : 'procedural')

  const [name, setName] = useState(editingProduct?.name || '')
  const [sku, setSku] = useState(editingProduct?.sku || '')
  const [slug, setSlug] = useState(editingProduct?.slug || '')
  const [collection, setCollection] = useState<string>(editingProduct?.collection || 'form')
  const [description, setDescription] = useState(editingProduct?.description || '')
  const [renderMode, setRenderMode] = useState<'image' | 'procedural'>(effectiveMode)
  const [motif, setMotif] = useState<'circle' | 'grid' | 'wave' | 'window' | 'sun' | 'type'>(
    (editingProduct?.motif as 'circle' | 'grid' | 'wave' | 'window' | 'sun' | 'type') || 'circle'
  )
  const [colors, setColors] = useState<[string, string, string]>(
    editingProduct?.colors || ['#171717', '#F5F1E8', '#3155E7']
  )
  const [prices, setPrices] = useState(
    editingProduct?.prices || { A4: 999, A3: 1499, A2: 2499, A1: 3999 }
  )
  const [finishSurcharges, setFinishSurcharges] = useState(
    editingProduct?.finishSurcharges || { Matte: 0, Gloss: 200 }
  )
  const [status, setStatus] = useState<'draft' | 'published'>(
    editingProduct?.status === 'archived' ? 'draft' : editingProduct?.status || 'published'
  )
  const [active, setActive] = useState(editingProduct?.active ?? true)
  const [tags, setTags] = useState<string[]>(editingProduct?.tags || [])
  const [tagInput, setTagInput] = useState('')

  // Media state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [localThumbnailPreview, setLocalThumbnailPreview] = useState<string | null>(null)
  const existingThumbnailUrl = editingProduct?.thumbnailUrl || null

  const [printMasterFile, setPrintMasterFile] = useState<File | null>(null)
  const existingPrintMasterUrl = editingProduct?.printMasterUrl || null
  const [isDownloadingMaster, setIsDownloadingMaster] = useState(false)

  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const existingGalleryUrls = editingProduct?.galleryUrls || []
  const [lifestyleFiles, setLifestyleFiles] = useState<File[]>([])
  const existingLifestyleUrls = editingProduct?.lifestyleUrls || []

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [isThumbnailDragging, setIsThumbnailDragging] = useState(false)
  const [isMasterDragging, setIsMasterDragging] = useState(false)
  const [previewFit, setPreviewFit] = useState<'cover' | 'contain'>('cover')
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!editingProduct?.slug)

  // Track initial state to detect changes
  const isDirtyRef = useRef(false)
  const initialDataRef = useRef<string>(
    JSON.stringify({
      name: editingProduct?.name || '',
      sku: editingProduct?.sku || '',
      slug: editingProduct?.slug || '',
      collection: editingProduct?.collection || 'form',
      description: editingProduct?.description || '',
      renderMode: effectiveMode,
      prices: editingProduct?.prices || { A4: 999, A3: 1499, A2: 2499, A1: 3999 },
      status: editingProduct?.status === 'archived' ? 'draft' : editingProduct?.status || 'published',
    })
  )

  // Auto-generate slug when name changes (if not manually detached)
  const handleNameChange = (val: string) => {
    setName(val)
    isDirtyRef.current = true
    if (!isSlugManuallyEdited && !editingProduct) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      setSlug(generated)
    }
  }

  // Check dirty state
  const checkIsDirty = (): boolean => {
    if (thumbnailFile || printMasterFile || galleryFiles.length > 0 || lifestyleFiles.length > 0) {
      return true
    }
    const currentSnapshot = JSON.stringify({
      name,
      sku,
      slug,
      collection,
      description,
      renderMode,
      prices,
      status,
    })
    return currentSnapshot !== initialDataRef.current
  }

  // Handle Close / Cancel with unsaved check
  const handleSafeClose = () => {
    if (isSubmitting) return
    if (checkIsDirty()) {
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false)
        } else {
          handleSafeClose()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, showDiscardConfirm])

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  // Tag Management
  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean])
      setTagInput('')
      isDirtyRef.current = true
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
    isDirtyRef.current = true
  }

  // Thumbnail File Handlers
  const handleThumbnailFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notifyErr(new Error('Please select an image file (JPG, PNG, WEBP).'))
      return
    }
    setThumbnailFile(file)
    const previewUrl = URL.createObjectURL(file)
    setLocalThumbnailPreview(previewUrl)
    isDirtyRef.current = true
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleThumbnailFile(file)
  }

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsThumbnailDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleThumbnailFile(file)
  }

  // Print Master File Handlers
  const handlePrintMasterFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|tif|tiff|pdf)$/i)) {
      notifyErr(new Error('Print master must be a high-resolution JPG, PNG, WEBP, TIFF, or PDF.'))
      return
    }
    setPrintMasterFile(file)
    isDirtyRef.current = true
  }

  const handlePrintMasterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handlePrintMasterFile(file)
  }

  const handlePrintMasterDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsMasterDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handlePrintMasterFile(file)
  }

  // Download Print Master (Admin Vault Action)
  const handleDownloadMaster = async () => {
    if (!editingProduct?._id) return
    setIsDownloadingMaster(true)
    try {
      const downloadUrl = await storeBackend.getPrintMasterDownloadUrl(editingProduct._id)
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      } else {
        notifyErr(new Error('Print master download URL could not be resolved.'))
      }
    } catch (err) {
      notifyErr(err)
    } finally {
      setIsDownloadingMaster(false)
    }
  }

  // Live WYSIWYG Product Object
  const previewProduct: Product = {
    id: editingProduct?._id || 'preview',
    sku: sku || 'KVR-PREVIEW',
    slug: slug || 'preview',
    name: name || 'Untitled Fine Art Print',
    collection: collection as Collection,
    description: description || 'Editorial commentary and paper finish specifications.',
    colors,
    motif,
    renderMode,
    thumbnailUrl: localThumbnailPreview || existingThumbnailUrl || null,
  }

  // Submission Pipeline
  const handleSubmit = async (targetStatus?: 'draft' | 'published') => {
    if (isSubmitting) return

    // Form Validation
    if (!name.trim()) {
      notifyErr(new Error('Product title is required.'))
      return
    }
    if (!sku.trim()) {
      notifyErr(new Error('Product SKU is required.'))
      return
    }
    if (!slug.trim()) {
      notifyErr(new Error('URL Slug is required.'))
      return
    }

    const finalStatus = targetStatus || status

    // Validation: Image mode must have an artwork image
    if (renderMode === 'image' && !thumbnailFile && !existingThumbnailUrl && !editingProduct?.thumbnailStorageId) {
      notifyErr(new Error('Uploaded Artwork Mode requires a Catalogue Thumbnail file. Please upload a poster image.'))
      return
    }

    setIsSubmitting(true)

    try {
      let thumbnailStorageId: string | undefined = editingProduct?.thumbnailStorageId
      let printMasterStorageId: string | undefined = editingProduct?.printMasterStorageId
      const galleryStorageIds: string[] = editingProduct?.galleryStorageIds ? [...editingProduct.galleryStorageIds] : []
      const lifestyleStorageIds: string[] = editingProduct?.lifestyleStorageIds ? [...editingProduct.lifestyleStorageIds] : []

      // 1. Upload Thumbnail file to Convex File Storage if selected
      if (thumbnailFile) {
        setUploadProgress('Uploading Catalogue Thumbnail to archival storage...')
        const uploadUrl = await storeBackend.generateProductUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': thumbnailFile.type },
          body: thumbnailFile,
        })
        if (!uploadRes.ok) {
          throw new Error(`Catalogue thumbnail upload failed with status ${uploadRes.status}`)
        }
        const json = await uploadRes.json()
        if (!json.storageId) {
          throw new Error('Storage failed to return a valid thumbnail storage ID.')
        }
        thumbnailStorageId = json.storageId
      }

      // 2. Upload Print Master file if selected
      if (printMasterFile) {
        setUploadProgress('Uploading High-Resolution Print Master to secure vault...')
        const uploadUrl = await storeBackend.generateProductUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': printMasterFile.type },
          body: printMasterFile,
        })
        if (!uploadRes.ok) {
          throw new Error(`Print master upload failed with status ${uploadRes.status}`)
        }
        const json = await uploadRes.json()
        if (!json.storageId) {
          throw new Error('Storage failed to return a valid print master storage ID.')
        }
        printMasterStorageId = json.storageId
      }

      // 3. Upload Gallery files
      for (let i = 0; i < galleryFiles.length; i++) {
        const file = galleryFiles[i]
        setUploadProgress(`Uploading gallery image ${i + 1} of ${galleryFiles.length}...`)
        const uploadUrl = await storeBackend.generateProductUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (uploadRes.ok) {
          const json = await uploadRes.json()
          if (json.storageId) galleryStorageIds.push(json.storageId)
        }
      }

      // 4. Upload Lifestyle mockup files
      for (let i = 0; i < lifestyleFiles.length; i++) {
        const file = lifestyleFiles[i]
        setUploadProgress(`Uploading lifestyle mockup ${i + 1} of ${lifestyleFiles.length}...`)
        const uploadUrl = await storeBackend.generateProductUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        if (uploadRes.ok) {
          const json = await uploadRes.json()
          if (json.storageId) lifestyleStorageIds.push(json.storageId)
        }
      }

      setUploadProgress('Persisting product record in Convex...')

      if (editingProduct && editingProduct._id) {
        await storeBackend.adminUpdateProduct(editingProduct._id, {
          name,
          collection,
          description,
          motif,
          colors,
          prices,
          finishSurcharges,
          status: finalStatus,
          renderMode,
          tags,
          thumbnailStorageId,
          printMasterStorageId,
          galleryStorageIds,
          lifestyleStorageIds,
        })
        onSaveSuccess(`Print '${name}' updated successfully (${renderMode.toUpperCase()} mode · ${finalStatus.toUpperCase()}).`)
      } else {
        await storeBackend.adminCreateProduct({
          name,
          slug,
          sku,
          collection,
          description,
          motif,
          colors,
          prices,
          finishSurcharges,
          status: finalStatus,
          renderMode,
          tags,
          thumbnailStorageId,
          printMasterStorageId,
          galleryStorageIds,
          lifestyleStorageIds,
        })
        onSaveSuccess(`New print '${name}' created successfully (${renderMode.toUpperCase()} mode · ${finalStatus.toUpperCase()}).`)
      }

      onClose()
    } catch (err) {
      notifyErr(err)
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="catalogue-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-editor-title"
    >
      <div className="catalogue-modal-container">
        {/* Sticky Header */}
        <header className="catalogue-modal-header">
          <div className="catalogue-modal-header-left">
            <div className="catalogue-modal-title-row">
              <span className="catalogue-modal-eyebrow">
                {editingProduct ? 'STUDIO CATALOGUE · EDIT PRODUCT' : 'STUDIO CATALOGUE · NEW PRODUCT'}
              </span>
              <span
                className={`catalogue-status-badge status-${editingProduct?.status || status}`}
              >
                {editingProduct?.status === 'archived'
                  ? 'ARCHIVED'
                  : status === 'published'
                    ? 'PUBLISHED'
                    : 'DRAFT'}
              </span>
              <span className={`catalogue-mode-badge mode-${renderMode}`}>
                {renderMode === 'image' ? 'UPLOADED ARTWORK' : 'PROCEDURAL'}
              </span>
            </div>
            <h2 id="product-editor-title" className="catalogue-modal-heading">
              {editingProduct ? editingProduct.name : 'CREATE NEW FINE ART PRINT'}
            </h2>
            <p className="catalogue-modal-subtitle">
              Authoritative inventory configuration, media asset storage, and pricing matrix.
            </p>
          </div>

          <div className="catalogue-modal-header-right">
            {editingProduct && (
              <a
                href={`/product/${editingProduct.slug}`}
                target="_blank"
                rel="noreferrer"
                className="button outline small catalogue-header-pdp-btn"
                title="Preview live product page"
              >
                <Eye size={13} />
                <span>STOREFRONT PDP</span>
              </a>
            )}
            <button
              type="button"
              className="catalogue-modal-close-btn"
              onClick={handleSafeClose}
              disabled={isSubmitting}
              aria-label="Close product editor"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Modal Body: Two-Column Workspace */}
        <div className="catalogue-modal-body">
          <div className="catalogue-modal-grid">
            {/* LEFT COLUMN: Editor Form Sections */}
            <div className="catalogue-form-column">
              {/* SECTION A: Basic Information */}
              <section className="catalogue-section-card">
                <div className="catalogue-section-header">
                  <span className="section-step-badge">SECTION A</span>
                  <h3>BASIC IDENTIFICATION</h3>
                </div>

                <div className="catalogue-field-grid-2">
                  <div className="catalogue-field-group">
                    <label className="catalogue-field-label">
                      PRINT TITLE <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="catalogue-input"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Spiderman, Shape Language, After Hours"
                    />
                  </div>

                  <div className="catalogue-field-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="catalogue-field-label" style={{ marginBottom: 0 }}>
                        SKU CODE <span className="required-star">*</span>
                      </label>
                      <button
                        type="button"
                        className="button ghost small"
                        style={{ padding: '2px 6px', height: 'auto', fontSize: '0.65rem', gap: '3px' }}
                        title="Auto-generate SKU"
                        onClick={() => {
                          const prefix = collection ? collection.substring(0, 3).toUpperCase() : 'ART'
                          const rand = Math.floor(100 + Math.random() * 900)
                          setSku(`KVR-${prefix}-${rand}`)
                          isDirtyRef.current = true
                        }}
                      >
                        <RefreshCw size={10} />
                        <span>AUTO-SKU</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      className="catalogue-input font-mono"
                      value={sku}
                      onChange={(e) => {
                        setSku(e.target.value.toUpperCase())
                        isDirtyRef.current = true
                      }}
                      placeholder="e.g. KVR-FOR-001"
                    />
                  </div>
                </div>

                <div className="catalogue-field-grid-2">
                  <div className="catalogue-field-group">
                    <label className="catalogue-field-label">
                      URL SLUG <span className="required-star">*</span>
                    </label>
                    <div className="catalogue-slug-input-wrap">
                      <span className="slug-prefix">/product/</span>
                      <input
                        type="text"
                        required
                        className="catalogue-input slug-input font-mono"
                        value={slug}
                        onChange={(e) => {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                          setIsSlugManuallyEdited(true)
                          isDirtyRef.current = true
                        }}
                        placeholder="shape-language"
                      />
                    </div>
                  </div>

                  <div className="catalogue-field-group">
                    <label className="catalogue-field-label">COLLECTION</label>
                    <select
                      className="catalogue-select"
                      value={collection}
                      onChange={(e) => {
                        setCollection(e.target.value)
                        isDirtyRef.current = true
                      }}
                    >
                      {collectionsList.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name.toUpperCase()} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tags input */}
                <div className="catalogue-field-group">
                  <label className="catalogue-field-label">
                    <span>PRODUCT TAGS & DISCOVERY KEYWORDS</span>
                    <small className="field-hint">Press Enter or click + to add tag</small>
                  </label>
                  <div className="catalogue-tag-composer">
                    <div className="tag-input-row">
                      <Tag size={14} className="tag-icon" />
                      <input
                        type="text"
                        className="tag-input"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag()
                          }
                        }}
                        placeholder="e.g. superhero, minimalist, brutalism"
                      />
                      <button
                        type="button"
                        className="button outline small tag-add-btn"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        <Plus size={12} />
                        <span>ADD</span>
                      </button>
                    </div>

                    {tags.length > 0 && (
                      <div className="catalogue-tag-chips">
                        {tags.map((t) => (
                          <span key={t} className="catalogue-tag-chip">
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="tag-remove-btn"
                              aria-label={`Remove tag ${t}`}
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION B: Artwork & Live Preview Controls */}
              <section className="catalogue-section-card highlight-section">
                <div className="catalogue-section-header">
                  <span className="section-step-badge">SECTION B</span>
                  <h3>ARTWORK & ASSET PIPELINE</h3>
                </div>

                {/* Render Mode Selector */}
                <div className="catalogue-render-mode-panel">
                  <span className="render-mode-label">RENDERING ARCHITECTURE</span>
                  <div className="render-mode-toggle-group">
                    <button
                      type="button"
                      className={`render-mode-btn ${renderMode === 'image' ? 'active' : ''}`}
                      onClick={() => {
                        setRenderMode('image')
                        isDirtyRef.current = true
                      }}
                    >
                      <ImageIcon size={16} />
                      <div className="render-mode-btn-text">
                        <strong>UPLOADED ARTWORK</strong>
                        <small>Natural aspect ratio · Zero motif overlay</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className={`render-mode-btn ${renderMode === 'procedural' ? 'active' : ''}`}
                      onClick={() => {
                        setRenderMode('procedural')
                        isDirtyRef.current = true
                      }}
                    >
                      <Layers size={16} />
                      <div className="render-mode-btn-text">
                        <strong>PROCEDURAL ARTWORK</strong>
                        <small>Generative geometry · Dynamic motifs</small>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Asset 1: Catalogue Thumbnail (Dropzone) */}
                <div className="catalogue-asset-card">
                  <div className="asset-card-header">
                    <div className="asset-card-title">
                      <span className="asset-step">1</span>
                      <div>
                        <strong>CATALOGUE THUMBNAIL (PUBLIC STOREFRONT)</strong>
                        <small>Optimized web display image · Visible in Shop, PDP, and Cart</small>
                      </div>
                    </div>
                    {(localThumbnailPreview || existingThumbnailUrl) && (
                      <span className="asset-verified-badge">
                        <Check size={12} />
                        <span>ARTWORK ACTIVE</span>
                      </span>
                    )}
                  </div>

                  <div
                    className={`catalogue-dropzone ${isThumbnailDragging ? 'drag-over' : ''} ${
                      localThumbnailPreview || existingThumbnailUrl ? 'has-file' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsThumbnailDragging(true)
                    }}
                    onDragLeave={() => setIsThumbnailDragging(false)}
                    onDrop={handleThumbnailDrop}
                  >
                    {localThumbnailPreview || existingThumbnailUrl ? (
                      <div className="dropzone-file-preview">
                        <img
                          src={localThumbnailPreview || existingThumbnailUrl!}
                          alt="Thumbnail preview"
                          className="dropzone-thumb-img"
                        />
                        <div className="dropzone-file-info">
                          <span className="dropzone-status-text">
                            {thumbnailFile ? `New file queued: ${thumbnailFile.name}` : 'Archived fine art thumbnail'}
                          </span>
                          {thumbnailFile && (
                            <span className="dropzone-size-text font-mono">
                              {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB · {thumbnailFile.type.toUpperCase()}
                            </span>
                          )}
                          <div className="dropzone-actions">
                            <label className="button outline small dropzone-replace-btn">
                              <Upload size={12} />
                              <span>REPLACE ARTWORK</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleThumbnailSelect}
                                style={{ display: 'none' }}
                              />
                            </label>
                            {localThumbnailPreview && (
                              <button
                                type="button"
                                className="button ghost small dropzone-clear-btn"
                                onClick={() => {
                                  setThumbnailFile(null)
                                  setLocalThumbnailPreview(null)
                                  isDirtyRef.current = true
                                }}
                              >
                                <X size={12} />
                                <span>REVERT</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="dropzone-empty">
                        <Upload size={28} className="dropzone-icon" />
                        <span className="dropzone-prompt">
                          Drag & drop poster artwork here, or <strong>browse files</strong>
                        </span>
                        <span className="dropzone-hint">
                          Supported formats: JPG, JPEG, PNG, WEBP (Up to 40 MB)
                        </span>
                        <label className="button blue small dropzone-browse-btn">
                          <Upload size={12} />
                          <span>CHOOSE IMAGE</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleThumbnailSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset 2: High-Resolution Print Master (Vault) */}
                <div className="catalogue-asset-card vault-card">
                  <div className="asset-card-header">
                    <div className="asset-card-title">
                      <span className="asset-step vault-step">
                        <Lock size={12} />
                      </span>
                      <div>
                        <strong>PRODUCTION PRINT MASTER (ARCHIVAL VAULT)</strong>
                        <small>High-resolution TIFF / PDF / 300DPI raster for museum giclée printing</small>
                      </div>
                    </div>
                    {editingProduct?.printMasterStorageId && (
                      <span className="asset-vault-badge">
                        <FileCheck size={12} />
                        <span>VAULT SECURED</span>
                      </span>
                    )}
                  </div>

                  <div
                    className={`catalogue-dropzone vault-dropzone ${isMasterDragging ? 'drag-over' : ''} ${
                      printMasterFile || editingProduct?.printMasterStorageId ? 'has-file' : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsMasterDragging(true)
                    }}
                    onDragLeave={() => setIsMasterDragging(false)}
                    onDrop={handlePrintMasterDrop}
                  >
                    {printMasterFile || editingProduct?.printMasterStorageId ? (
                      <div className="dropzone-vault-status">
                        <div className="vault-status-indicator">
                          <div className="vault-badge-pill">
                            <Lock size={14} />
                            <span>
                              {printMasterFile
                                ? `NEW MASTER QUEUED: ${printMasterFile.name}`
                                : '300 DPI PRODUCTION MASTER ON ARCHIVE'}
                            </span>
                          </div>
                          <span className="vault-shield-notice">
                            Strictly shielded from public client queries · Available only to authorized studio operators
                          </span>
                        </div>

                        <div className="vault-actions">
                          {existingPrintMasterUrl && (
                            <a
                              href={existingPrintMasterUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="button ghost small"
                              title="Open master file in new tab"
                            >
                              <Eye size={12} />
                              <span>VIEW MASTER</span>
                            </a>
                          )}
                          {editingProduct?.printMasterStorageId && (
                            <button
                              type="button"
                              className="button outline small"
                              disabled={isDownloadingMaster}
                              onClick={handleDownloadMaster}
                            >
                              <Download size={12} />
                              <span>{isDownloadingMaster ? 'DOWNLOADING...' : 'DOWNLOAD MASTER'}</span>
                            </button>
                          )}
                          <label className="button outline small">
                            <Upload size={12} />
                            <span>{editingProduct?.printMasterStorageId ? 'REPLACE MASTER' : 'RE-SELECT MASTER'}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.tif,.tiff"
                              onChange={handlePrintMasterSelect}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="dropzone-empty">
                        <Lock size={24} className="vault-icon" />
                        <span className="dropzone-prompt">
                          Upload high-res production file (TIFF, PDF, 300 DPI raster)
                        </span>
                        <label className="button outline small dropzone-browse-btn">
                          <Upload size={12} />
                          <span>ATTACH PRINT MASTER</span>
                          <input
                            type="file"
                            accept="image/*,.pdf,.tif,.tiff"
                            onChange={handlePrintMasterSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset 3 & 4: Multi-Angle Gallery & Lifestyle Mockups */}
                <div className="catalogue-field-grid-2">
                  <div className="catalogue-asset-compact-card">
                    <label className="catalogue-field-label">
                      <span>PRODUCT GALLERY (DETAIL VIEWS)</span>
                      <small className="field-hint">{existingGalleryUrls.length + galleryFiles.length} file(s)</small>
                    </label>
                    {existingGalleryUrls.length > 0 && (
                      <div className="catalogue-mini-gallery">
                        {existingGalleryUrls.map((url, idx) => (
                          <img key={idx} src={url} alt={`Gallery ${idx + 1}`} className="mini-thumb" />
                        ))}
                      </div>
                    )}
                    <label className="button outline small compact-upload-btn">
                      <Upload size={12} />
                      <span>{galleryFiles.length > 0 ? `ADD MORE (${galleryFiles.length} queued)` : 'ADD GALLERY IMAGES'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setGalleryFiles([...galleryFiles, ...files])
                          isDirtyRef.current = true
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div className="catalogue-asset-compact-card">
                    <label className="catalogue-field-label">
                      <span>LIFESTYLE MOCKUPS (ROOM PREVIEWS)</span>
                      <small className="field-hint">{existingLifestyleUrls.length + lifestyleFiles.length} file(s)</small>
                    </label>
                    {existingLifestyleUrls.length > 0 && (
                      <div className="catalogue-mini-gallery">
                        {existingLifestyleUrls.map((url, idx) => (
                          <img key={idx} src={url} alt={`Lifestyle ${idx + 1}`} className="mini-thumb" />
                        ))}
                      </div>
                    )}
                    <label className="button outline small compact-upload-btn">
                      <Upload size={12} />
                      <span>{lifestyleFiles.length > 0 ? `ADD MORE (${lifestyleFiles.length} queued)` : 'ADD MOCKUPS'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setLifestyleFiles([...lifestyleFiles, ...files])
                          isDirtyRef.current = true
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* SECTION C: Editorial Description */}
              <section className="catalogue-section-card">
                <div className="catalogue-section-header">
                  <span className="section-step-badge">SECTION C</span>
                  <h3>EDITORIAL DESCRIPTION</h3>
                </div>

                <div className="catalogue-field-group">
                  <div className="textarea-label-row">
                    <label className="catalogue-field-label">
                      CURATORIAL & ARCHITECTURAL COMMENTARY
                    </label>
                    <span className={`char-counter ${description.length > 450 ? 'near-limit' : ''}`}>
                      {description.length} / 500 characters
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    className="catalogue-textarea"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      isDirtyRef.current = true
                    }}
                    placeholder="Brief architectural commentary, curation rationale, and paper finish recommendations."
                  />
                </div>
              </section>

              {/* SECTION D: Pricing Matrix & Finish Surcharges */}
              <section className="catalogue-section-card">
                <div className="catalogue-section-header">
                  <span className="section-step-badge">SECTION D</span>
                  <h3>PRICING & SIZES MATRIX</h3>
                </div>

                <div className="catalogue-pricing-cards-grid">
                  {(
                    [
                      { key: 'A4', dim: '21.0 × 29.7 cm', label: 'COMPACT DESK' },
                      { key: 'A3', dim: '29.7 × 42.0 cm', label: 'STUDIO WALL' },
                      { key: 'A2', dim: '42.0 × 59.4 cm', label: 'GALLERY EDITION' },
                      { key: 'A1', dim: '59.4 × 84.1 cm', label: 'EXHIBITION MASTER' },
                    ] as const
                  ).map((sz) => (
                    <div key={sz.key} className="pricing-card">
                      <div className="pricing-card-header">
                        <strong className="pricing-size-code">{sz.key}</strong>
                        <span className="pricing-size-dim">{sz.dim}</span>
                      </div>
                      <span className="pricing-size-label">{sz.label}</span>
                      <div className="pricing-input-wrap">
                        <span className="currency-symbol">₹</span>
                        <input
                          type="number"
                          min={1}
                          required
                          className="pricing-input font-mono"
                          value={prices[sz.key]}
                          onChange={(e) => {
                            setPrices({ ...prices, [sz.key]: Number(e.target.value) })
                            isDirtyRef.current = true
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Finish Surcharges */}
                <div className="catalogue-finish-surcharges-panel">
                  <span className="finish-panel-title">PAPER FINISH SURCHARGES</span>
                  <div className="finish-panel-grid">
                    <div className="finish-surcharge-item">
                      <span className="finish-name">ARCHIVAL MATTE (300 GSM)</span>
                      <div className="pricing-input-wrap finish-input">
                        <span className="currency-symbol">+₹</span>
                        <input
                          type="number"
                          min={0}
                          className="pricing-input font-mono"
                          value={finishSurcharges.Matte}
                          onChange={(e) => {
                            setFinishSurcharges({ ...finishSurcharges, Matte: Number(e.target.value) })
                            isDirtyRef.current = true
                          }}
                        />
                      </div>
                    </div>

                    <div className="finish-surcharge-item">
                      <span className="finish-name">PEARL GLOSS REFLECTIVE</span>
                      <div className="pricing-input-wrap finish-input">
                        <span className="currency-symbol">+₹</span>
                        <input
                          type="number"
                          min={0}
                          className="pricing-input font-mono"
                          value={finishSurcharges.Gloss}
                          onChange={(e) => {
                            setFinishSurcharges({ ...finishSurcharges, Gloss: Number(e.target.value) })
                            isDirtyRef.current = true
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION E: Design Configuration (Procedural Only) */}
              {renderMode === 'procedural' && (
                <section className="catalogue-section-card procedural-section">
                  <div className="catalogue-section-header">
                    <span className="section-step-badge">SECTION E</span>
                    <h3>PROCEDURAL DESIGN ENGINE</h3>
                  </div>

                  <div className="catalogue-field-grid-2">
                    <div className="catalogue-field-group">
                      <label className="catalogue-field-label">MOTIF GRAPHIC</label>
                      <select
                        className="catalogue-select"
                        value={motif}
                        onChange={(e) => {
                          setMotif(e.target.value as typeof motif)
                          isDirtyRef.current = true
                        }}
                      >
                        <option value="circle">Geometric Circle</option>
                        <option value="grid">Bauhaus Grid</option>
                        <option value="wave">Sinusoidal Wave</option>
                        <option value="window">Architectural Window</option>
                        <option value="sun">Solstice Sun</option>
                        <option value="type">Editorial Typography</option>
                      </select>
                    </div>

                    <div className="catalogue-field-group">
                      <label className="catalogue-field-label">STUDIO COLOR PALETTE (3 HEX)</label>
                      <div className="catalogue-color-inputs-row">
                        {colors.map((color, idx) => (
                          <div key={idx} className="color-swatch-control">
                            <input
                              type="color"
                              className="color-picker-input"
                              value={color}
                              onChange={(e) => {
                                const updated = [...colors] as [string, string, string]
                                updated[idx] = e.target.value
                                setColors(updated)
                                isDirtyRef.current = true
                              }}
                            />
                            <input
                              type="text"
                              className="color-hex-input font-mono"
                              value={color}
                              onChange={(e) => {
                                const updated = [...colors] as [string, string, string]
                                updated[idx] = e.target.value
                                setColors(updated)
                                isDirtyRef.current = true
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* SECTION F: Publication Settings */}
              <section className="catalogue-section-card">
                <div className="catalogue-section-header">
                  <span className="section-step-badge">SECTION F</span>
                  <h3>PUBLICATION & AVAILABILITY</h3>
                </div>

                <div className="catalogue-publication-controls">
                  <div className="publication-segmented-control">
                    <button
                      type="button"
                      className={`pub-option-btn ${status === 'published' ? 'active' : ''}`}
                      onClick={() => {
                        setStatus('published')
                        isDirtyRef.current = true
                      }}
                    >
                      <strong>PUBLISHED</strong>
                      <small>Live on public storefront and searchable in collections</small>
                    </button>

                    <button
                      type="button"
                      className={`pub-option-btn ${status === 'draft' ? 'active' : ''}`}
                      onClick={() => {
                        setStatus('draft')
                        isDirtyRef.current = true
                      }}
                    >
                      <strong>STUDIO DRAFT</strong>
                      <small>Confined to admin studio; hidden from customer catalogue</small>
                    </button>
                  </div>

                  <div className="catalogue-availability-toggle">
                    <label className="toggle-switch-label">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => {
                          setActive(e.target.checked)
                          isDirtyRef.current = true
                        }}
                      />
                      <span className="toggle-slider" />
                      <span className="toggle-label-text">
                        <strong>PURCHASE AVAILABILITY</strong> — Toggle product availability for customer checkout
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Live WYSIWYG Artwork Preview */}
            <aside className="catalogue-preview-column">
              <div className="catalogue-preview-sticky-card">
                <div className="preview-header-bar">
                  <div className="preview-title-wrap">
                    <span className="preview-live-dot" />
                    <strong>WYSIWYG ARTWORK PREVIEW</strong>
                  </div>
                  <div className="preview-aspect-toggle">
                    <button
                      type="button"
                      className={`aspect-btn ${previewFit === 'cover' ? 'active' : ''}`}
                      onClick={() => setPreviewFit('cover')}
                      title="Cover Frame"
                    >
                      FIT
                    </button>
                    <button
                      type="button"
                      className={`aspect-btn ${previewFit === 'contain' ? 'active' : ''}`}
                      onClick={() => setPreviewFit('contain')}
                      title="Contain Aspect"
                    >
                      CONTAIN
                    </button>
                  </div>
                </div>

                {/* Poster Display */}
                <div className="preview-poster-stage">
                  <Poster p={previewProduct} large objectFit={previewFit} />
                </div>

                {/* Product Meta Specs */}
                <div className="preview-meta-card">
                  <div className="meta-spec-row">
                    <span className="meta-spec-label">RENDERING ENGINE</span>
                    <strong className="meta-spec-value">
                      {renderMode === 'image' ? 'UPLOADED FINE ART (IMAGE)' : 'PROCEDURAL GENERATIVE'}
                    </strong>
                  </div>
                  <div className="meta-spec-row">
                    <span className="meta-spec-label">COLLECTION SPEC</span>
                    <span className="meta-spec-value uppercase">{collection}</span>
                  </div>
                  <div className="meta-spec-row">
                    <span className="meta-spec-label">TARGET SKU</span>
                    <span className="meta-spec-value font-mono">{sku || '—'}</span>
                  </div>
                  <div className="meta-spec-row">
                    <span className="meta-spec-label">PRICE RANGE</span>
                    <span className="meta-spec-value font-mono">
                      ₹{prices.A4} – ₹{prices.A1}
                    </span>
                  </div>
                  {tags.length > 0 && (
                    <div className="meta-spec-row tags-row">
                      <span className="meta-spec-label">TAGS</span>
                      <div className="meta-tags-pills">
                        {tags.map((t) => (
                          <span key={t} className="meta-tag-pill">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <footer className="catalogue-modal-footer">
          {uploadProgress && (
            <div className="catalogue-upload-progress-banner">
              <RefreshCw size={14} className="spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}

          <div className="catalogue-footer-actions">
            <div className="catalogue-footer-left">
              <button
                type="button"
                className="button outline"
                onClick={handleSafeClose}
                disabled={isSubmitting}
              >
                CANCEL
              </button>

              {editingProduct && onArchive && (isSuperAdmin || editingProduct.status !== 'archived') && (
                <button
                  type="button"
                  className="button ghost text-danger"
                  onClick={() => {
                    if (editingProduct._id) {
                      onArchive(editingProduct._id, editingProduct.name)
                      onClose()
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <Archive size={14} />
                  <span>ARCHIVE PRODUCT</span>
                </button>
              )}
            </div>

            <div className="catalogue-footer-right">
              <button
                type="button"
                className="button outline"
                onClick={() => handleSubmit('draft')}
                disabled={isSubmitting}
              >
                SAVE AS DRAFT
              </button>

              <button
                type="button"
                className="button blue catalogue-primary-submit-btn"
                onClick={() => handleSubmit('published')}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="spinner" />
                    <span>SAVING PRODUCT...</span>
                  </>
                ) : editingProduct ? (
                  'SAVE CHANGES'
                ) : (
                  'PUBLISH PRODUCT'
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="catalogue-discard-backdrop" role="alertdialog">
          <div className="catalogue-discard-card">
            <div className="discard-warning-icon">
              <AlertTriangle size={32} color="var(--vermilion)" />
            </div>
            <h4>DISCARD UNSAVED EDITS?</h4>
            <p>
              You have unsaved changes or uploaded assets. Discarding will lose all pending modifications.
            </p>
            <div className="discard-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setShowDiscardConfirm(false)}
              >
                KEEP EDITING
              </button>
              <button
                type="button"
                className="button text-danger"
                style={{ background: 'var(--vermilion)', color: '#fff' }}
                onClick={() => {
                  setShowDiscardConfirm(false)
                  onClose()
                }}
              >
                DISCARD CHANGES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
