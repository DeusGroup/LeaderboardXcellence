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
    console.log('Initializing database pool with connection string:', 
      process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@') || 'undefined');
    
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Set up pool event handlers with detailed error logging
    poolInstance.on('error', (err: Error & { code?: string }) => {
      console.error('Database pool error:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });

      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection lost. Attempting to reconnect...');
        poolInstance = null; // Force new pool creation on next getPool call
      } else if (err.code === 'ECONNREFUSED') {
        console.error('Database connection refused. Please check if database is running.');
      } else if (!err.message.includes('Connection terminated')) {
        console.error('Fatal database error, initiating graceful shutdown...');
        cleanup().then(() => process.exit(-1));
      }
    });

    poolInstance.on('connect', (client) => {
      console.log('New client connected to database');
      // Query connection details safely
      client.query('SELECT pg_backend_pid() as pid, current_database() as db, inet_server_addr() as host, inet_server_port() as port')
        .then(result => {
          if (result.rows[0]) {
            console.log('Connection details:', result.rows[0]);
          }
        })
        .catch(err => {
          console.error('Error getting connection details:', err);
        });
    });

    // Test the connection immediately with detailed error handling
    poolInstance.query('SELECT NOW() as current_time, current_database() as database, version() as version')
      .then((result) => {
        console.log('Database connection verified:', {
          currentTime: result.rows[0].current_time,
          database: result.rows[0].database,
          version: result.rows[0].version
        });
      })
      .catch((err: Error & { code?: string }) => {
        console.error('Database connection failed:', {
          message: err.message,
          code: err.code,
          stack: err.stack
        });
        
        // Handle specific PostgreSQL error codes
        switch(err.code) {
          case '28P01':
            console.error('Authentication failed. Check database credentials.');
            break;
          case '3D000':
            console.error('Database does not exist. Check DATABASE_URL.');
            break;
          case '57P03':
            console.error('Database server is starting up. Waiting...');
            // Implement retry logic here if needed
            break;
          default:
            console.error('Unhandled database error.');
        }
        
        cleanup().then(() => process.exit(-1));
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
