import { Router } from 'express'
import axios from 'axios'

const router = Router()

router.post('/recaptcha/verify', async (req, res) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { token: string }
  const secret = process.env.RECAPTCHA_SECRET || ''
  if (!secret) return res.status(500).json({ error: 'Server not configured' })
  const resp = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${body.token}`)
  res.json(resp.data)
})

export default router

