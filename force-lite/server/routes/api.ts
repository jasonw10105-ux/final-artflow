import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import sharp from 'sharp'
import { upsertDocument, search as searchIndex } from '../search'
import bcrypt from 'bcryptjs'

const router = Router()

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const id = nanoid(16)
    const ext = path.extname(file.originalname)
    cb(null, `${id}${ext}`)
  }
})
const upload = multer({ storage })

type UserRole = 'artist' | 'collector' | 'admin'
type User = { id: string; email: string; passwordHash: string; role: UserRole; name?: string; createdAt: string }
type Artwork = { id: string; title: string; priceCents: number; imageUrl: string; ownerId: string; createdAt: string; dominantHex?: string[]; tags?: string[] }

const users = new Map<string, User>()
const artworks = new Map<string, Artwork>()

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign({ sub: userId }, secret, { expiresIn: '7d' })
}

function verifyToken(token: string): string | null {
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const payload = jwt.verify(token, secret) as { sub: string }
    return payload.sub
  } catch {
    return null
  }
}

router.post('/auth/register', async (req, res) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { email: string; password: string; role?: UserRole; name?: string }
  const exists = Array.from(users.values()).find(u => u.email === body.email)
  if (exists) return res.status(409).json({ error: 'Email already registered' })
  const id = nanoid(12)
  const passwordHash = await bcrypt.hash(body.password, 10)
  const role: UserRole = body.role ?? 'collector'
  users.set(id, { id, email: body.email, passwordHash, role, name: body.name ?? '', createdAt: new Date().toISOString() })
  const token = signToken(id)
  return res.status(201).json({ token })
})

router.post('/auth/login', async (req, res) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { email: string; password: string }
  const user = Array.from(users.values()).find(u => u.email === body.email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(body.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user.id)
  return res.json({ token })
})

router.get('/auth/me', (req, res) => {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const userId = token ? verifyToken(token) : null
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const me = users.get(userId)
  if (!me) return res.status(404).json({ error: 'Not found' })
  const { passwordHash, ...safe } = me
  res.json({ user: safe })
})

router.post('/auth/me', async (req, res) => {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const userId = token ? verifyToken(token) : null
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const me = users.get(userId)
  if (!me) return res.status(404).json({ error: 'Not found' })
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Partial<Pick<User, 'name' | 'role'>>
  if (body.name !== undefined) me.name = body.name
  if (body.role !== undefined) me.role = body.role
  users.set(userId, me)
  const { passwordHash, ...safe } = me
  res.json({ user: safe })
})

router.get('/artworks', (_req, res) => {
  res.json({ items: Array.from(artworks.values()) })
})

router.post('/artworks', upload.single('image'), (req, res) => {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  const userId = token ? verifyToken(token) : null
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })
  const title = String(req.body.title || '')
  const priceCents = Number(req.body.priceCents || 0)
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Image required' })
  const id = nanoid(12)
  const imageUrl = `/uploads/${file.filename}`
  const artwork: Artwork = { id, title, priceCents, imageUrl, ownerId: userId, createdAt: new Date().toISOString() }
  artworks.set(id, artwork)
  upsertDocument({ id, title, ownerId: userId, priceCents, tags: [] })
  res.status(201).json({ artwork })
})

router.get('/artworks/:id', (req, res) => {
  const item = artworks.get(req.params.id)
  if (!item) return res.status(404).json({ error: 'Not found' })
  res.json({ artwork: item })
})

router.get('/search', (req, res) => {
  const q = String(req.query.q || '')
  const ownerId = req.query.ownerId ? String(req.query.ownerId) : undefined
  const maxPriceCents = req.query.maxPriceCents ? Number(req.query.maxPriceCents) : undefined
  const tag = req.query.tag ? String(req.query.tag) : undefined
  const results = searchIndex(q, { ownerId, maxPriceCents, tag })
  res.json({ items: results })
})

router.post('/analyze-image', upload.single('image'), async (req, res) => {
  const file = req.file
  if (!file) return res.status(400).json({ error: 'Image required' })
  const image = sharp(file.path)
  const stats = await image.stats()
  const channels = stats.channels
  const dominantHex = channels
    .map(c => {
      const r = channels[0]?.mean ?? 0
      const g = channels[1]?.mean ?? 0
      const b = channels[2]?.mean ?? 0
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
    })
    .slice(0, 1)
  res.json({ dominantHex })
})

router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: /sitemap.xml')
})

router.get('/sitemap.xml', (_req, res) => {
  const urls = ['/', '/search', '/sell']
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map(u => `<url><loc>${u}</loc></url>`)
    .join('')}</urlset>`
  res.type('application/xml').send(xml)
})

export default router

