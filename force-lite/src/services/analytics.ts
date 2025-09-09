import { supabase } from '@/lib/supabase'
import { parseUTM, maybePersistFirstTouch, getFirstTouchUTM } from '@/utils/utm'

export async function trackPageview(path: string) {
  const utm = parseUTM(window.location.href)
  maybePersistFirstTouch(utm)
  const first = getFirstTouchUTM()
  await supabase.from('analytics_events').insert({
    event_name: 'pageview',
    metadata: {
      path,
      utm,
      first_touch: first,
      ts: Date.now(),
    },
  })
}

export async function trackEvent(name: string, metadata: Record<string, any> = {}) {
  const utm = parseUTM(window.location.href)
  const first = getFirstTouchUTM()
  await supabase.from('analytics_events').insert({
    event_name: name,
    metadata: { ...metadata, utm, first_touch: first, ts: Date.now() },
  })
}

