import { supabase } from '@/lib/supabase'

export type ArtworkRow = {
  id: string
  title: string | null
  description: string | null
  price: number | null
  primary_image_url: string | null
  user_id: string
  slug: string | null
  genre: string | null
  dominant_colors: string[] | null
}

export async function fetchArtworks(limit = 24) {
  const { data, error } = await supabase
    .from('artworks')
    .select('id,title,description,price,primary_image_url,user_id,slug,genre,dominant_colors')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ArtworkRow[]
}

export async function searchArtworks(query: string, filters: { maxPrice?: number; tag?: string } = {}) {
  let s = supabase
    .from('artworks')
    .select('id,title,description,price,primary_image_url,user_id,slug,genre,dominant_colors')
    .order('created_at', { ascending: false })
  if (query) {
    s = s.ilike('title', `%${query}%`)
  }
  if (filters.maxPrice !== undefined) {
    s = s.lte('price', filters.maxPrice)
  }
  const { data, error } = await s
  if (error) throw error
  return data as ArtworkRow[]
}

export async function fetchArtwork(id: string) {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as any
}

export async function fetchArtistBySlug(slug: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,slug,name')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data as { id: string; slug: string; name: string }
}

export async function fetchArtworksByUser(userId: string, limit = 24) {
  const { data, error } = await supabase
    .from('artworks')
    .select('id,title,price,primary_image_url,slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ArtworkRow[]
}

