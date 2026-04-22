import { config } from 'dotenv';
import { z } from 'zod';
config();
const envSchema = z.object({
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(12),
    PORT: z.coerce.number().int().positive().default(3333),
});
export const env = envSchema.parse(process.env);
