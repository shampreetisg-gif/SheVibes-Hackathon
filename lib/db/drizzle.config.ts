import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

function setupEnv() {
  if (process.env.DATABASE_URL) return;

  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      } catch {
        // Ignore read errors
      }
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
}

setupEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in environment or .env file.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
