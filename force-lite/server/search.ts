import MiniSearch from 'minisearch'

export type SearchDoc = {
  id: string
  title: string
  ownerId: string
  priceCents: number
  tags?: string[]
}

const mini = new MiniSearch<SearchDoc>({
  fields: ['title', 'tags'],
  storeFields: ['id', 'title', 'ownerId', 'priceCents', 'tags'],
  searchOptions: { prefix: true, fuzzy: 0.2 }
})

export function indexDocuments(docs: SearchDoc[]) {
  mini.addAll(docs)
}

export function upsertDocument(doc: SearchDoc) {
  mini.add(doc)
}

export function removeDocument(id: string) {
  mini.discard(id)
}

export function search(query: string, filters?: { ownerId?: string; maxPriceCents?: number; tag?: string }) {
  const results = mini.search(query || '*')
  let items = results.map(r => r)
  if (filters?.ownerId) items = items.filter(i => i.ownerId === filters.ownerId)
  if (filters?.maxPriceCents) items = items.filter(i => i.priceCents <= filters.maxPriceCents)
  if (filters?.tag) items = items.filter(i => i.tags?.includes(filters.tag!))
  return items
}

