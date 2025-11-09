FROM oven/bun:canary-alpine AS build
WORKDIR /build

COPY package.json bun.lock turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --workspace

WORKDIR /build/packages/db
RUN bun prisma generate

FROM oven/bun:canary-alpine AS release
WORKDIR /app

COPY --from=build /build/node_modules ./node_modules

COPY --from=build /build/apps ./apps
COPY --from=build /build/packages ./packages

COPY package.json ./package.json
COPY turbo.json ./

EXPOSE 8000

USER bun

CMD ["bun", "run", "apps/server/index.ts"]
