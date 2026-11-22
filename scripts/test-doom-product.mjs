import assert from 'node:assert/strict'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api.js'

const CONVEX_URL = process.env.VITE_CONVEX_URL || 'https://resolute-bison-903.convex.cloud'
const client = new ConvexHttpClient(CONVEX_URL)

async function inspectDoom() {
  console.log('Querying Convex products.list...')
  const list = await client.query(api.products.list, {})
  const doomInList = list.find(p => p.name.toLowerCase().includes('doom') || p.slug.includes('doom'))
  console.log('DOOM product in list:', JSON.stringify(doomInList, null, 2))

  if (doomInList) {
    console.log('\nQuerying getBySlug for slug:', doomInList.slug)
    const bySlug = await client.query(api.products.getBySlug, { slug: doomInList.slug })
    console.log('getBySlug result:', JSON.stringify(bySlug, null, 2))
  }
}

inspectDoom().catch(err => {
  console.error('Error inspecting DOOM:', err)
  process.exit(1)
})
