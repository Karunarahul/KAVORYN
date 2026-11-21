export type Collection = 'form' | 'frame' | 'type' | 'elsewhere' | 'organic' | 'personal'
export type PosterFinish = 'Matte' | 'Gloss'

export type Product = {
  id: string
  slug: string
  sku: string
  name: string
  collection: Collection
  description: string
  colors: [string, string, string]
  motif: string
}

export const prices = {
  A4: 149,
  A3: 249,
  A2: 399,
  A1: 699,
} as const

export const finishPrices: Record<PosterFinish, number> = {
  Matte: 0,
  Gloss: 50,
} as const

export const shippingConfig = {
  freeShippingThreshold: 499,
  standardShippingFee: 79,
  currency: 'INR',
  currencySymbol: '₹',
  estimatedTransit: '3–5 business days',
} as const

export const collections: Record<Collection, string> = {
  form: 'FORM',
  frame: 'FRAME',
  type: 'TYPE',
  elsewhere: 'ELSEWHERE',
  organic: 'ORGANIC',
  personal: 'PERSONAL',
}

export const collectionDescriptions: Record<Collection, string> = {
  form: 'Exercises in balance, bold geometry, and electric negative space.',
  frame: 'Cinematic visual moments captured between stillness and light.',
  type: 'Typographic manifestos typeset for rooms with an opinion.',
  elsewhere: 'Atmospheric gradients and palettes drawn from distant coastlines.',
  organic: 'Earthy structures where brutalist lines meet biophilic growth.',
  personal: 'Custom typographic prints with your own words and thoughts.',
}

export const sizeDimensions = {
  A4: { cm: '21.0 × 29.7 cm', inches: '8.3 × 11.7 in', label: 'Desk & Compact Frames' },
  A3: { cm: '29.7 × 42.0 cm', inches: '11.7 × 16.5 in', label: 'Most Popular / Gallery Wall' },
  A2: { cm: '42.0 × 59.4 cm', inches: '16.5 × 23.4 in', label: 'Living Room Focal Piece' },
  A1: { cm: '59.4 × 84.1 cm', inches: '23.4 × 33.1 in', label: 'Statement Wall Feature' },
} as const

export const finishDetails: Record<PosterFinish, { label: string; gsm: string; desc: string; surcharge: number }> = {
  Matte: {
    label: 'Archival Matte',
    gsm: '230 GSM',
    desc: 'Museum-grade smooth, non-reflective archival fine art paper.',
    surcharge: 0,
  },
  Gloss: {
    label: 'Gallery Lustre',
    gsm: '260 GSM',
    desc: 'Deep black density and rich contrast with a delicate satin lustre.',
    surcharge: 50,
  },
}

export const getProductPrice = (
  size: keyof typeof prices,
  finish: PosterFinish = 'Matte'
): number => {
  return prices[size] + (finishPrices[finish] || 0)
}

export const formatMoney = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: shippingConfig.currency,
    maximumFractionDigits: 0,
  }).format(n)

export const products: Product[] = [
  {
    id: '1',
    slug: 'shape-language',
    sku: 'KVR-FOR-001',
    name: 'Shape Language',
    collection: 'form',
    description: 'An exercise in balance, form, and electric negative space.',
    colors: ['#3155E7', '#D6F04A', '#F5F1E8'],
    motif: 'circle',
  },
  {
    id: '2',
    slug: 'the-blue-dimension',
    sku: 'KVR-FOR-002',
    name: 'The Blue Dimension',
    collection: 'form',
    description: 'A cobalt field where geometry slips out of frame.',
    colors: ['#3155E7', '#171717', '#F5F1E8'],
    motif: 'grid',
  },
  {
    id: '3',
    slug: 'organic-disorder',
    sku: 'KVR-FOR-003',
    name: 'Organic Disorder',
    collection: 'form',
    description: 'Rough shapes, imperfect systems, beautiful friction.',
    colors: ['#F05A3A', '#D6F04A', '#171717'],
    motif: 'wave',
  },
  {
    id: '4',
    slug: 'after-hours',
    sku: 'KVR-CIN-001',
    name: 'After Hours',
    collection: 'frame',
    description: 'A cinematic quiet after the city has emptied.',
    colors: ['#171717', '#F05A3A', '#3155E7'],
    motif: 'window',
  },
  {
    id: '5',
    slug: 'the-last-light',
    sku: 'KVR-CIN-004',
    name: 'The Last Light',
    collection: 'frame',
    description: 'The final flare of an unrepeatable day.',
    colors: ['#F05A3A', '#F5F1E8', '#171717'],
    motif: 'sun',
  },
  {
    id: '6',
    slug: 'make-it-matter',
    sku: 'KVR-TYP-001',
    name: 'Make It Matter',
    collection: 'type',
    description: 'A daily visual note to choose intent.',
    colors: ['#D6F04A', '#171717', '#3155E7'],
    motif: 'type',
  },
  {
    id: '7',
    slug: 'less-ordinary',
    sku: 'KVR-TYP-002',
    name: 'Less Ordinary',
    collection: 'type',
    description: 'For rooms that refuse the expected.',
    colors: ['#F5F1E8', '#3155E7', '#F05A3A'],
    motif: 'type',
  },
  {
    id: '8',
    slug: 'create-anyway',
    sku: 'KVR-TYP-004',
    name: 'Create Anyway',
    collection: 'type',
    description: 'A stubborn little manifesto in poster form.',
    colors: ['#F05A3A', '#171717', '#D6F04A'],
    motif: 'type',
  },
  {
    id: '9',
    slug: 'coastal-state',
    sku: 'KVR-ELS-002',
    name: 'Coastal State',
    collection: 'elsewhere',
    description: 'Salt-air palettes for a slower state of mind.',
    colors: ['#3155E7', '#D6F04A', '#F5F1E8'],
    motif: 'wave',
  },
  {
    id: '10',
    slug: 'wild-geometry',
    sku: 'KVR-ORG-001',
    name: 'Wild Geometry',
    collection: 'organic',
    description: 'Where sharp edges learn to grow.',
    colors: ['#D6F04A', '#171717', '#F05A3A'],
    motif: 'leaf',
  },
  {
    id: '11',
    slug: 'quiet-earth',
    sku: 'KVR-ORG-003',
    name: 'Quiet Earth',
    collection: 'organic',
    description: 'A grounding composition of warm matter.',
    colors: ['#F05A3A', '#F5F1E8', '#171717'],
    motif: 'sun',
  },
  {
    id: '12',
    slug: 'your-name',
    sku: 'KVR-PER-001',
    name: 'Your Name',
    collection: 'personal',
    description: 'Your words, typeset for your wall.',
    colors: ['#3155E7', '#F5F1E8', '#D6F04A'],
    motif: 'type',
  },
]
