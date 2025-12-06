import { config } from "dotenv";
config(); // Load .env file first

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres connection
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

export * from "./schema";
