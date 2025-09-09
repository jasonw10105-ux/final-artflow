import { z } from 'zod'

const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default(''),
})

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
})

