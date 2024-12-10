import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from './routes.js';

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Register API routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  app.use(express.static("dist/public"));
}

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
