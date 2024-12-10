import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { setupVite } from "./vite.js";
import { registerRoutes } from "./routes.js";
import { initializeWebSocket } from "./websocket.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(message: string) {
  console.log(`[express] ${message}`);
}

// Serve static files in production
function serveStatic(app: express.Express) {
  app.use(express.static(path.resolve("dist/public")));
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Enable CORS in development
if (process.env.NODE_ENV === "development") {
  app.use(cors());
}

// Request logging and monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  const path = req.path;
  
  // Add request ID to help trace requests
  req.headers['x-request-id'] = requestId;
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let errorOccurred = false;

  // Capture response body for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log request start
  if (path.startsWith("/api")) {
    log(`[${requestId}] Started ${req.method} ${path}`);
    if (Object.keys(req.body || {}).length > 0) {
      log(`[${requestId}] Request Body: ${JSON.stringify(req.body)}`);
    }
  }

  // Handle errors during request processing
  const errorHandler = (err: Error) => {
    errorOccurred = true;
    log(`[${requestId}] Error processing request: ${err.message}`);
    if (err.stack) {
      log(`[${requestId}] Stack: ${err.stack}`);
    }
  };
  req.on('error', errorHandler);
  res.on('error', errorHandler);

  // Log request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      const status = res.statusCode;
      const statusType = Math.floor(status / 100);
      
      let logLine = `[${requestId}] Completed ${req.method} ${path} ${status} in ${duration}ms`;
      
      // Add response body for non-200 responses or if explicitly requested
      if (statusType !== 2 || process.env.NODE_ENV === 'development') {
        if (capturedJsonResponse) {
          const responseStr = JSON.stringify(capturedJsonResponse);
          logLine += ` :: ${responseStr.length > 100 ? responseStr.slice(0, 100) + '...' : responseStr}`;
        }
      }

      // Log with appropriate level based on status code
      if (statusType === 5) {
        log(`ERROR: ${logLine}`);
      } else if (statusType === 4) {
        log(`WARN: ${logLine}`);
      } else {
        log(logLine);
      }

      // Monitor response times
      if (duration > 1000) {
        log(`WARN: Slow request detected [${requestId}] ${req.method} ${path} took ${duration}ms`);
      }
    }
  });

  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

(async () => {
  try {
    // Validate required environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        const error = new Error(`Required environment variable ${envVar} is missing`);
        log(`Fatal Error: ${error.message}`);
        throw error;
      }
    }

    // Initialize database connection with proper error handling
    try {
      const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
      });

      // Add event listeners for connection issues
      client.on('error', (err) => {
        log(`Database connection error: ${err.message}`);
        // Attempt to reconnect
        setTimeout(() => {
          log('Attempting to reconnect to database...');
          client.connect();
        }, 5000);
      });

      await client.connect();
      log('Successfully connected to database');
      
      // Initialize Drizzle with connected client
      const db = drizzle(client);
      
      // Add to global app context
      app.locals.db = db;

      // Test database connection
      const result = await client.query('SELECT NOW()');
      log(`Database connected successfully at ${result.rows[0].now}`);

    } catch (error: unknown) {
      const dbError = error as { message?: string; code?: string };
      log(`Failed to connect to database: ${dbError.message || 'Unknown error'}`);
      if (dbError.code) {
        log(`Error code: ${dbError.code}`);
      }
      throw new Error(`Database connection failed: ${dbError.message || 'Unknown error'}`);
    }
    
    // Create HTTP server first
    const server = createServer(app);

    // Register API routes
    registerRoutes(app);

    // Setup WebSocket server
    initializeWebSocket(server);

    // Custom error types
    class APIError extends Error {
      constructor(
        public statusCode: number,
        message: string,
        public code?: string
      ) {
        super(message);
        this.name = 'APIError';
      }
    }

    // Global error handling middleware
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      log(`Error occurred processing ${req.method} ${req.path}`);
      log(`Error: ${err.message}`);
      if (err.stack) {
        log(`Stack: ${err.stack}`);
      }

      // Handle specific error types
      if (err instanceof APIError) {
        return res.status(err.statusCode).json({
          status: 'error',
          code: err.code,
          message: err.message
        });
      }

      // Handle database connection errors
      if (err.message.includes('database') || err.message.includes('sql')) {
        return res.status(503).json({
          status: 'error',
          code: 'DATABASE_ERROR',
          message: 'Database service is currently unavailable'
        });
      }

      // Default error response
      const statusCode = err instanceof APIError ? err.statusCode : 500;
      res.status(statusCode).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal Server Error' 
          : err.message
      });
    });

    // Setup Vite or static serving
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server on port 5000
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
