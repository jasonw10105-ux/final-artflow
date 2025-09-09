import { Router } from 'express'
import { supabase } from '../../src/server/supabase'

const router = Router()

router.post('/shares/log', async (req, res, next) => {
  try {
    const body = await readJson(req)
    // body: { type, target_id, platform, campaign, utm, preview_url, user_id? }
    const payload = {
      event_name: 'share',
      user_id: body.user_id || null,
      related_id: body.target_id || null,
      metadata: {
        type: body.type,
        platform: body.platform,
        campaign: body.campaign,
        utm: body.utm,
        preview_url: body.preview_url,
      }
    }
    const { error } = await supabase.from('analytics_events').insert(payload as any)
    if (error) throw error
    res.status(201).json({ ok: true })
  } catch (e) { next(e) }
})

async function readJson(req: any){
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
}

export default router

