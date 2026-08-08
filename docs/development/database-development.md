# Database Development Workflow

The First Memoir.in (formerly WePrintIt.in) database is managed exclusively via **Prisma Migrate**. This document outlines the safe, repeatable, and idempotent workflows established for local and development environments.

## ⚠️ Core Principles

1. **Never use `prisma db push`**. This command circumvents migration history and can lead to schema drift and data loss.
2. **Migrations are mandatory**. Any change to `schema.prisma` must be followed by `db:migrate` to generate SQL history.
3. **Seed is idempotent**. The seed script can be run safely any number of times to ensure you have the baseline catalog available locally.
4. **Production safeguards (Fail Closed)**. The `db:reset` command is explicitly blocked from running against any production environment. Furthermore, it employs a **whitelist safety model**. Because relying on heuristics (like connection string naming conventions) is brittle, destructive operations require explicit positive validation. You must authorize resets by setting `ALLOW_DB_RESET=true` in your local `.env`. If there is any uncertainty, the script fails closed and refuses to execute.

---

## 🛠 Developer Commands

The following commands are available from the project root. They delegate to `turbo` to execute within the `@repo/database` package.

### `npm run db:migrate`

Use this command when you have updated `packages/database/prisma/schema.prisma`.

* **What it does:** It compares your Prisma schema to your local database, generates a new `.sql` migration file inside `packages/database/prisma/migrations`, and immediately applies it.
* **When to use:** Whenever you add a model, alter a column, or change relations.
* **Note:** You will be prompted to name the migration. Use a descriptive name (e.g., `add_orders_table`).

### `npm run db:seed`

Use this command to populate your database with realistic, brand-aligned development data (First Memoir.in Wall Art, Photo Frames, etc.) including complex pricing options and exclusion rules.

* **What it does:** Executes `packages/database/prisma/seed.ts`.
* **Idempotency:** It uses `upsert` and unique lookups. Running it multiple times will not duplicate core products or categories, nor will it crash. It automatically cleans up and re-links relations like images and options.
* **When to use:** After cloning the repository for the first time, after a database reset, or if you accidentally deleted core test products and want them back.

### `npm run db:reset`

Use this command when your development database is in a broken state and you want to start completely fresh.

* **What it does:** Drops the database, recreates it, runs all migrations from scratch, and then automatically runs the seed script.
* **Safety:** This script uses a wrapper (`packages/database/scripts/db-reset.ts`) that strictly checks `NODE_ENV`. It will abort immediately if it detects a production environment. Furthermore, it employs a strict fail-closed whitelist safety model: it refuses to execute unless explicitly authorized via `ALLOW_DB_RESET=true` in your environment, preventing accidental destruction of non-development databases.
* **When to use:** When switching between drastically different branches, resolving complex migration conflicts, or starting a fresh sprint.

---

## 🖼 Image Strategy

During development, the Storefront and Admin are capable of rendering absolute URLs directly, bypassing Cloudflare R2 completely.

The seed script injects high-quality Unsplash placeholders into the `file_key` field of `ProductImage`. The backend dynamically identifies absolute URLs (e.g., `http://` or `https://`) and passes them through directly to the frontend.

* **No R2 Bucket Required:** You do not need to configure AWS credentials or Cloudflare R2 tokens just to run the Storefront locally. The seeded catalog works out-of-the-box.
* **Production R2:** When actual files are uploaded via the Admin panel, they receive a unique UUID `file_key` which will be prefixed by `R2_PUBLIC_URL` normally.

---

## 🚀 Initializing a Fresh Environment

For a new developer joining the project:
1. Ensure your `.env` contains a valid Neon Postgres connection string for `DATABASE_URL`.
2. Run `npm install`.
3. Run `npm run db:reset` (this migrates and seeds automatically).
4. Run `npm run dev`.

The First Memoir.in catalog will be ready in seconds.
