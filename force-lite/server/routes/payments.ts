import { Router } from 'express'
import crypto from 'node:crypto'

const router = Router()

// PayFast helper: Create signature
function sign(data: Record<string, string>, passphrase: string) {
  const pairs = Object.keys(data)
    .sort()
    .map(k => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`)
    .join('&')
  const payload = passphrase ? `${pairs}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}` : pairs
  return crypto.createHash('md5').update(payload).digest('hex')
}

router.post('/payfast/initiate', async (req, res) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { amount: number; item_name: string; return_url: string; cancel_url: string; notify_url: string }
  const merchant_id = process.env.PAYFAST_MERCHANT_ID || ''
  const merchant_key = process.env.PAYFAST_MERCHANT_KEY || ''
  const passphrase = process.env.PAYFAST_PASSPHRASE || ''
  const data: Record<string, string> = {
    merchant_id,
    merchant_key,
    amount: body.amount.toFixed(2),
    item_name: body.item_name,
    return_url: body.return_url,
    cancel_url: body.cancel_url,
    notify_url: body.notify_url,
  }
  const signature = sign(data, passphrase)
  res.json({ ...data, signature, sandbox: process.env.PAYFAST_SANDBOX === 'true' })
})

// PayFast ITN (instant transaction notification)
router.post('/payfast/itn', async (req, res) => {
  // In production: validate signature, source IPs, and verify with PayFast
  res.status(200).send('OK')
})

export default router

