import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../../src/server/supabase'

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) return null
    return data.user.id
  } catch {
    return null
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  ;(req as any).userId = userId
  next()
}

