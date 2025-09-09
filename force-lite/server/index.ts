import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import compression from 'compression'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import { v4 as uuidv4 } from 'uuid'
import helmet from 'helmet'
import apiRouter from './routes/api'
import paymentsRouter from './routes/payments'
import recaptchaRouter from './routes/recaptcha'
import reportsRouter from './routes/reports'
import recsRouter from './routes/recs'
import adminRouter from './routes/admin'
import sitemapRouter from './routes/sitemap'
import contactsRouter from './routes/contacts'
import messagingRouter from './routes/messaging'
import salesRouter from './routes/sales'

dotenv.config()

const isTest = process.env.VITEST
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 5173)

async function createServer() {
  const app = express()

  if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 })
    app.use(Sentry.Handlers.requestHandler())
  }

  app.use(morgan(isProd ? 'combined' : 'dev'))
  app.use(compression())
  app.use(cookieParser())
  app.use(cors({ origin: true, credentials: true }))
  app.disable('x-powered-by')
  app.use(rateLimit({ windowMs: 60_000, max: 120 }))
  app.use((req, _res, next) => {
    ;(req as any).cspNonce = Buffer.from(uuidv4()).toString('base64')
    next()
  })

  app.use(helmet({
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer-when-downgrade' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": (req: any) => ["'self'", `'nonce-${req.cspNonce}'`, 'https:'],
        "style-src": ["'self'", "'unsafe-inline'", 'https:'],
        "img-src": ["'self'", 'data:', 'https:'],
        "font-src": ["'self'", 'https:', 'data:'],
        "connect-src": ["'self'", 'https:', 'ws:'],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
      }
    }
  }))

  const resolve = (p: string) => path.resolve(process.cwd(), p)
  const indexHtmlPath = resolve('index.html')

  let vite: any
  if (!isProd) {
    const viteCreateServer = await import('vite')
    vite = await viteCreateServer.createServer({
      server: { middlewareMode: true },
      appType: 'custom'
    })
    app.use(vite.middlewares)
  } else {
    app.use('/assets', express.static(resolve('dist/client/assets'), { maxAge: '1y', immutable: true }))
    app.use(express.static(resolve('dist/client'), { index: false }))
  }

  app.use('/uploads', express.static(resolve('uploads'), { maxAge: '1y' }))
  app.use('/api', apiRouter)
  app.use('/api', paymentsRouter)
  app.use('/api', recaptchaRouter)
  app.use('/api', reportsRouter)
  app.use('/api', recsRouter)
  app.use('/api', adminRouter)
  app.use('/api', contactsRouter)
  app.use('/api', messagingRouter)
  app.use('/api', salesRouter)
  app.use('/', sitemapRouter)

  async function render(url: string, nonce: string) {
    if (!isProd) {
      const template = fs.readFileSync(indexHtmlPath, 'utf-8')
      const transformed = await vite.transformIndexHtml(url, template)
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
      const { html, head } = await render(url)
      return transformed
        .replace('<!--ssr-outlet-->', html)
        .replace('</head>', `${head}\n</head>`) // helmet injection
        .replace('<script type="module"', `<script nonce="${nonce}" type="module"`)
    } else {
      const template = fs.readFileSync(resolve('dist/client/index.html'), 'utf-8')
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { render } = require(resolve('dist/server/entry-server.js'))
      const { html, head } = await render(url)
      return template
        .replace('<!--ssr-outlet-->', html)
        .replace('</head>', `${head}\n</head>`) // helmet injection
        .replace('<script type="module"', `<script nonce="${nonce}" type="module"`)
    }
  }

  app.get(['/_health', '/healthz'], (_req, res) => res.status(200).json({ ok: true }))

  app.use(async (req, res, next) => {
    try {
      const html = await render(req.originalUrl, (req as any).cspNonce)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e: any) {
      if (!isProd && vite) vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler())
  }
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // basic error sanitizer
    const message = isProd ? 'Internal Server Error' : String(err?.stack || err)
    res.status(500).set({ 'Content-Type': 'text/plain' }).end(message)
  })

  return { app }
}

createServer().then(({ app }) => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`)
  })
})

