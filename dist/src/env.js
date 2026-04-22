import { config } from 'dotenv';
import { z } from 'zod';
config();
const envSchema = z.object({
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(12),
    PORT: z.coerce.number().int().positive().default(3333),
});
let cachedEnv = null;
export function getEnv() {
    if (cachedEnv) {
        return cachedEnv;
    }
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ');
        throw new Error(`Invalid environment variables: ${fields}`);
    }
    cachedEnv = parsed.data;
    return cachedEnv;
}
