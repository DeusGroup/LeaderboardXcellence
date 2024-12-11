import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@db/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  allowExitOnIdle: true
});

// Improved error handling for the connection pool
pool.on('connect', () => {
  console.log('New client connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (err.message.includes('Connection terminated')) {
    console.log('Attempting to reconnect to database...');
  } else {
    process.exit(-1);
  }
});

// Test the connection immediately
pool.query('SELECT 1')
  .then(() => console.log('Database connection verified'))
  .catch(err => {
    console.error('Initial database connection failed:', err);
    process.exit(-1);
  });

export const db = drizzle(pool, { schema });
