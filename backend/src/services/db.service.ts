import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? '';

export const pool = new Pool({ connectionString: DATABASE_URL });
