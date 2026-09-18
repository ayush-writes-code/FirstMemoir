FROM node:20-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root files
COPY package.json package-lock.json turbo.json ./

# Copy packages and the API app
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Ensure Prisma Client is generated
WORKDIR /app/packages/database
RUN npx prisma generate

# Build the API and its local dependencies using Turborepo
WORKDIR /app
RUN npx turbo run build --filter=api...

# --- Runner Stage ---
FROM node:20-slim AS runner

# Install OpenSSL for Prisma at runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy necessary files from the builder stage
# We copy root node_modules which contains hoisted dependencies (like sharp)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy packages (contains database schema, shared code, and generated Prisma client)
COPY --from=builder /app/packages ./packages

# Copy the built API
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Switch to standard non-root node user for security
USER node

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Run the compiled API
CMD ["node", "apps/api/dist/index.js"]
