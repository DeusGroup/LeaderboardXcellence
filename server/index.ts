import express from "express";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { registerRoutes } from "./routes.js";

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Create Drizzle instance
const db = drizzle(pool);
app.locals.db = db;

// Basic error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Register routes
registerRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist/public"));
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
