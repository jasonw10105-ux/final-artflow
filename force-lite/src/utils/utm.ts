export type UTM = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
  referrer?: string
}

export function parseUTM(url: string, referrer?: string): UTM {
  const u = new URL(url, window.location.origin)
  const p = u.searchParams
  return {
    source: p.get('utm_source') || undefined,
    medium: p.get('utm_medium') || undefined,
    campaign: p.get('utm_campaign') || undefined,
    term: p.get('utm_term') || undefined,
    content: p.get('utm_content') || undefined,
    referrer: referrer || document.referrer || undefined,
  }
}

const KEY = 'utm_first_touch'

export function getFirstTouchUTM(): UTM | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UTM) : null
  } catch {
    return null
  }
}

export function maybePersistFirstTouch(utm: UTM) {
  try {
    const existing = getFirstTouchUTM()
    if (!existing || Object.keys(existing).length === 0) {
      localStorage.setItem(KEY, JSON.stringify(utm))
    }
  } catch {}
}

