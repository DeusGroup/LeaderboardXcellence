import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { setupVite } from "./vite";
import { registerRoutes } from "./routes";
import { initializeWebSocket } from "./websocket";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced logging with timestamps
function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}][express] ${message}`, ...args);
}

// Process error handling
process.on('uncaughtException', (error) => {
  log('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('Unhandled Rejection:', reason);
  process.exit(1);
});

async function initializeDatabase() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test database connection
  try {
    await pool.query('SELECT NOW()');
    log('Database connection verified');

    // Setup connection error handling
    pool.on('error', (err) => {
      log('Unexpected database error:', err);
      process.exit(1);
    });

    return pool;
  } catch (error) {
    log('Database connection failed:', error);
    throw error;
  }
}

async function startServer(app: express.Express, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const server = createServer(app);
      
      // Initialize WebSocket server before starting HTTP server
      log('Initializing WebSocket server...');
      initializeWebSocket(server);
      log('WebSocket server initialized');

      server.listen(port, "0.0.0.0", () => {
        log(`Server running at http://0.0.0.0:${port}`);
        resolve();
      }).on('error', (error: Error) => {
        log('Server startup error:', error);
        if (error.message.includes('EADDRINUSE')) {
          log(`Port ${port} is already in use. Please ensure no other service is using this port.`);
        }
        reject(error);
      });
    } catch (error) {
      log('Failed to initialize server:', error);
      reject(error);
    }
  });
}

async function main() {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    
    // Serve uploaded files with proper headers
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
      setHeaders: (res) => {
        res.set('Cache-Control', 'public, max-age=31536000');
        res.set('Access-Control-Allow-Origin', '*');
      },
    }));

    // Enable CORS in development
    if (process.env.NODE_ENV === "development") {
      app.use(cors());
    }

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      const requestId = Math.random().toString(36).substring(7);
      
      if (req.path.startsWith("/api")) {
        log(`[${requestId}] Started ${req.method} ${req.path}`);
      }

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (req.path.startsWith("/api")) {
          log(`[${requestId}] Completed ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      });

      next();
    });

    // Initialize database first
    log('Initializing database connection...');
    const pool = await initializeDatabase();
    const db = drizzle(pool);
    app.locals.db = db;
    (global as any).db = db;
    log('Database initialization completed');

    // Register API routes
    log('Registering API routes...');
    registerRoutes(app);
    log('API routes registered');

    // Setup frontend serving based on environment
    log('Setting up frontend serving...');
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, createServer(app));
      log('Vite development server initialized');
    } else {
      app.use(express.static(path.resolve("dist/public")));
      app.get("*", (_req, res) => {
        res.sendFile(path.resolve("dist/public/index.html"));
      });
      log('Static file serving configured');
    }

    // Global error handling
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      log(`Error processing ${req.method} ${req.path}:`, err);
      res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal Server Error' 
          : err.message
      });
    });

    // Start server
    const PORT = Number(process.env.PORT) || 5000;
    log(`Starting server on port ${PORT}...`);
    await startServer(app, PORT);
    log('Server startup completed');

  } catch (error) {
    log('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  log('Application startup failed:', error);
  process.exit(1);
});
