FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ libc6-compat
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV TZ=Europe/Istanbul
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src ./src
COPY package.json drizzle.config.ts ./

# data/ volume olarak bağlanır; SQLite dosyası burada durur.
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["pnpm", "start"]
