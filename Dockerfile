# Alternative to Vercel: run traili on any Docker host (Fly.io, Railway, Render, a VPS).
# Requires the same env vars as Vercel (DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL).
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
# Apply the schema on boot (idempotent), then serve.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p ${PORT}"]
