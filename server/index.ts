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
import { cleanup } from "../db";

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
  try {
    log('Creating database pool...');
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test database connection
    log('Testing database connection...');
    await pool.query('SELECT NOW()');
    log('Database connection verified successfully');

    // Setup connection error handling
    pool.on('error', (err) => {
      log('Unexpected database error:', err);
      if (err.message.includes('Connection terminated')) {
        log('Attempting to reconnect to database...');
      } else {
        process.exit(1);
      }
    });

    pool.on('connect', () => {
      log('New client connected to the database');
    });

    return pool;
  } catch (error) {
    log('Database initialization failed:', error);
    if (error instanceof Error) {
      log('Error details:', error.message);
      if ('code' in error) {
        log('Error code:', (error as any).code);
      }
    }
    throw error;
  }
}

async function startServer(app: express.Express, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      log('Creating HTTP server...');
      const server = createServer(app);
      
      // Initialize WebSocket server before starting HTTP server
      log('Initializing WebSocket server...');
      try {
        initializeWebSocket(server);
        log('WebSocket server initialized successfully');
      } catch (wsError) {
        log('WebSocket initialization error:', wsError);
        // Continue without WebSocket if it fails
        log('Continuing without WebSocket functionality');
      }

      log(`Attempting to start server on port ${port}...`);
      const httpServer = server.listen(port, "0.0.0.0", () => {
        const addr = httpServer.address();
        const actualPort = typeof addr === 'object' && addr ? addr.port : port;
        log(`Server running at http://0.0.0.0:${actualPort}`);
        resolve();
      });

      httpServer.on('error', (error: Error) => {
        log('Server startup error:', error);
        if (error.message.includes('EADDRINUSE')) {
          log(`Port ${port} is already in use. Please ensure no other service is using this port.`);
        }
        reject(error);
      });

      // Handle server shutdown
      process.on('SIGTERM', () => {
        log('Received SIGTERM signal. Shutting down gracefully...');
        httpServer.close(async () => {
          try {
            // Cleanup database connections
            await cleanup();
            log('Server resources cleaned up successfully');
          } catch (cleanupError) {
            log('Error during cleanup:', cleanupError);
          }
          log('Server closed successfully');
          process.exit(0);
        });
      });

      // Add error handler for uncaught server errors
      server.on('error', (error: Error) => {
        log('Unexpected server error:', error);
      });
    } catch (error) {
      log('Failed to initialize server:', error);
      if (error instanceof Error) {
        log('Error details:', error.message);
        log('Error stack:', error.stack);
      }
      reject(error);
    }
  });
}

async function main() {
  try {
    log('Starting application initialization...');
    
    // Ensure environment variables are set
    if (!process.env.DATABASE_URL) {
      log('DATABASE_URL environment variable is not set');
      process.exit(1);
    }

    log('Environment variables verified successfully');
    
    // Create Express application first
    log('Creating Express application...');
    const app = express();
    
    // Basic middleware
    log('Setting up middleware...');
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(cookieParser());
    
    // Enable CORS with proper configuration
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Content-Range']
    }));

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      log('Error in middleware:', err);
      if (err instanceof SyntaxError) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Invalid request data'
        });
      }
      next(err);
    });

    // Initialize database connection (only once)
    log('Initializing database connection...');
    let db;
    try {
      // Only log the host and database name for security
      const dbUrl = new URL(process.env.DATABASE_URL || '');
      log('Connecting to database:', {
        host: dbUrl.hostname,
        database: dbUrl.pathname.slice(1),
        ssl: process.env.NODE_ENV === "production"
      });

      const pool = await initializeDatabase();
      log('Database pool created successfully');
      
      db = drizzle(pool);
      app.locals.db = db;
      (global as any).db = db;
      
      // Verify database connection with a simple query
      const result = await pool.query('SELECT NOW() as now');
      log('Database connected successfully at:', result.rows[0].now);
      
      // Setup pool error handler
      pool.on('error', (err) => {
        log('Unexpected database pool error:', err);
        // Don't exit process on connection errors, let pool handle reconnection
        if (!err.message.includes('Connection terminated')) {
          process.exit(1);
        }
      });
      
    } catch (dbError) {
      log('Database initialization failed:', dbError);
      if (dbError instanceof Error) {
        log('Database error details:', {
          message: dbError.message,
          name: dbError.name,
          stack: dbError.stack?.split('\n').slice(0, 3),
          code: (dbError as any).code
        });
      }
      throw new Error('Failed to initialize database connection. Check DATABASE_URL and database status.');
    }
    
    // Ensure uploads directory exists with proper permissions
    const uploadsDir = path.join(process.cwd(), "uploads");
    try {
      if (!fs.existsSync(uploadsDir)) {
        log('Creating uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
        log('Uploads directory created successfully');
      } else {
        // Ensure proper permissions on existing directory
        fs.chmodSync(uploadsDir, 0o755);
      }
      log(`Uploads directory verified at: ${uploadsDir}`);
    } catch (error) {
      log('Error creating/verifying uploads directory:', error);
      throw new Error('Failed to setup uploads directory');
    }
    
    // Configure static file serving for uploaded files
    const uploadsPath = path.join(process.cwd(), 'uploads');
    app.use('/uploads', express.static(uploadsPath, {
      setHeaders: (res, filePath) => {
        // Set appropriate content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        res.set('Content-Type', contentTypes[ext] || 'application/octet-stream');
        // Enable caching
        res.set('Cache-Control', 'public, max-age=31536000');
        // Allow cross-origin requests
        res.set('Access-Control-Allow-Origin', '*');
      },
      fallthrough: false, // Return 404 if file not found
    }));

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

    // Register API routes
    log('Registering API routes...');
    registerRoutes(app);
    log('API routes registered');

    // Setup frontend serving based on environment
    log('Setting up frontend serving...');
    try {
      if (process.env.NODE_ENV === "development") {
        log('Creating HTTP server for Vite...');
        const server = createServer(app);
        log('Setting up Vite middleware...');
        await setupVite(app, server);
        log('Vite development server initialized successfully');
        
        // Start server
        const PORT = Number(process.env.PORT) || 5000;
        log(`Starting development server on port ${PORT}...`);
        await startServer(app, PORT);
        log('Development server startup completed');
      } else {
        app.use(express.static(path.resolve("dist/public")));
        app.get("*", (_req, res) => {
          res.sendFile(path.resolve("dist/public/index.html"));
        });
        log('Static file serving configured');
        
        // Start production server
        const PORT = Number(process.env.PORT) || 5000;
        log(`Starting production server on port ${PORT}...`);
        await startServer(app, PORT);
        log('Production server startup completed');
      }
    } catch (error) {
      log('Server startup error:', error);
      if (error instanceof Error) {
        log('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
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

  } catch (error) {
    log('Failed to start application:', error);
    if (error instanceof Error) {
      log('Fatal error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  log('Application startup failed:', error);
  process.exit(1);
});
