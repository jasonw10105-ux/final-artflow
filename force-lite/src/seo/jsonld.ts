export function artistJsonLd(artist: { name: string; slug?: string }){
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: artist.name,
    url: artist.slug ? `/${artist.slug}` : undefined,
  }
}

export function artworkJsonLd(art: { title?: string; image?: string; price?: number | null; artistName?: string }){
  const offers = art.price != null ? {
    '@type': 'Offer', price: art.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock'
  } : undefined
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: art.title || 'Untitled',
    image: art.image,
    brand: art.artistName ? { '@type': 'Brand', name: art.artistName } : undefined,
    offers,
  }
}

