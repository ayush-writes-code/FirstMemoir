import { execSync } from "child_process";
import { env } from "process";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly to ensure we have the database URL
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbUrl = env.DATABASE_URL || "";

if (!dbUrl) {
  console.error("\n❌ ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
  console.error(
    "\n❌ CRITICAL: Attempted to run db:reset in a production environment.",
  );
  console.error(
    "This command drops all tables and is explicitly disabled in production.\n",
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// POSITIVE VALIDATION (WHITELIST APPROACH)
// We fail closed by default. A destructive operation like db:reset must be
// explicitly authorized by setting ALLOW_DB_RESET=true in the environment.
// This prevents accidental execution against production or staging databases
// if connection strings or naming conventions change over time.
// ---------------------------------------------------------------------------
if (env.ALLOW_DB_RESET !== "true") {
  console.error(
    "\n❌ CRITICAL: Destructive database operations are disabled by default.",
  );
  console.error(
    "To explicitly authorize a database reset, you must set ALLOW_DB_RESET=true",
  );
  console.error("in your environment or .env file.\n");
  process.exit(1);
}

console.log("⚠️  DEVELOPMENT MODE DETECTED. Proceeding with database reset...");

try {
  // Pass --force to bypass the interactive prompt since we already did our safety checks
  execSync("npx prisma migrate reset --force", { stdio: "inherit" });
  console.log("\n✅ Database reset complete.");
} catch (error) {
  console.error("\n❌ Database reset failed.");
  process.exit(1);
}
