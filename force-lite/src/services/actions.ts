import { supabase } from '@/lib/supabase'

export async function recordArtworkView(params: { artworkId: string; artistId: string; viewerId?: string | null }) {
  const { error } = await supabase
    .from('artwork_views')
    .insert({ artwork_id: params.artworkId, artist_id: params.artistId, viewer_id: params.viewerId ?? null })
  if (error) throw error
}

export async function likeArtwork(artworkId: string) {
  const { data: u } = await supabase.auth.getUser()
  const userId = u.user?.id
  if (!userId) throw new Error('Not signed in')
  const { error } = await supabase.from('artwork_reactions').insert({ collector_id: userId, artwork_id: artworkId, reaction_type: 'like' })
  if (error && !String(error.message).includes('duplicate')) throw error
}

export async function unlikeArtwork(artworkId: string) {
  const { data: u } = await supabase.auth.getUser()
  const userId = u.user?.id
  if (!userId) throw new Error('Not signed in')
  const { error } = await supabase
    .from('artwork_reactions')
    .delete()
    .eq('collector_id', userId)
    .eq('artwork_id', artworkId)
  if (error) throw error
}

export async function hasLikedArtwork(artworkId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser()
  const userId = u.user?.id
  if (!userId) return false
  const { data, error } = await supabase
    .from('artwork_reactions')
    .select('id')
    .eq('collector_id', userId)
    .eq('artwork_id', artworkId)
    .limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export type ArtworkEdition = {
  id: string
  label: string
  sale_number: string | null
  price: number | null
  sold: boolean | null
}

export async function fetchArtworkEditions(artworkId: string): Promise<ArtworkEdition[]> {
  const { data, error } = await supabase
    .from('artwork_editions')
    .select('id,label,sale_number,price,sold')
    .eq('artwork_id', artworkId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as any) || []
}

export async function recordArtworkShare(params: { artworkId: string; platform: string }) {
  const { error } = await supabase.from('artwork_shares').insert({ artwork_id: params.artworkId, platform: params.platform })
  if (error) throw error
}

