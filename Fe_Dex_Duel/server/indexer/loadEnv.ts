import dotenv from "dotenv";

// Prefer .env.local (Next.js style), then fallback to .env.
dotenv.config({ path: ".env.local" });
dotenv.config();
