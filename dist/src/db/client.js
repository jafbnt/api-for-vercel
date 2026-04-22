import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { getEnv } from '../env.js';
let dbInstance = null;
export function getDb() {
    if (dbInstance) {
        return dbInstance;
    }
    const env = getEnv();
    const sql = neon(env.DATABASE_URL);
    dbInstance = drizzle({ client: sql });
    return dbInstance;
}
