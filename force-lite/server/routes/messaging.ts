import { Router } from 'express'
import { supabase } from '../../src/server/supabase'
import { requireAuth, getUserIdFromRequest } from '../middleware/auth'

const router = Router()

router.get('/conversations', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const { data, error } = await supabase
      .from('conversations')
      .select('*, artwork:artwork_id(title), messages:messages(count)')
      .eq('artist_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(100)
    if (error) throw error
    res.json({ items: data || [] })
  } catch (e) { next(e) }
})

router.get('/conversations/:id/messages', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const id = req.params.id
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) throw error
    res.json({ items: data || [] })
  } catch (e) { next(e) }
})

router.post('/conversations/:id/messages', requireAuth as any, async (req, res, next) => {
  try {
    const userId = await getUserIdFromRequest(req)
    const id = req.params.id
    const body = await readJson(req)
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_id: userId, content: body.content })
      .select('*')
      .single()
    if (error) throw error
    res.status(201).json({ message: data })
  } catch (e) { next(e) }
})

async function readJson(req: any){
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}')
}

export default router

