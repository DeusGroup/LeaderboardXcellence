import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@db/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let poolInstance: pg.Pool | null = null;

// Function to get or create the pool
function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Set up pool event handlers
    poolInstance.on('error', (err: Error) => {
      console.error('Unexpected database pool error:', err);
      // Don't exit on connection errors, let the application handle reconnection
      if (!err.message.includes('Connection terminated')) {
        console.error('Fatal database error, shutting down.');
        process.exit(-1);
      }
    });

    poolInstance.on('connect', () => {
      console.log('New client connected to the database');
    });

    // Test the connection immediately
    poolInstance.query('SELECT NOW()')
      .then(() => console.log('Database connection verified'))
      .catch((err: Error) => {
        console.error('Initial database connection failed:', err);
        process.exit(-1);
      });
  }
  return poolInstance;
}

// Initialize the database connection
const pool = getPool();
console.log('Database pool initialized');

export const db = drizzle(pool, { schema });

// Cleanup function for graceful shutdown
export const cleanup = async (): Promise<void> => {
  if (poolInstance) {
    console.log('Closing database pool...');
    await poolInstance.end();
    poolInstance = null;
    console.log('Database pool closed');
  }
};
