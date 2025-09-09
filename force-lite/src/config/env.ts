import { z } from 'zod'

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
  VITE_CDN_BASE_URL: z.string().default(''),
  VITE_RECAPTCHA_SITE_KEY: z.string().default(''),
})

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  VITE_CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || '',
  VITE_RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
})

