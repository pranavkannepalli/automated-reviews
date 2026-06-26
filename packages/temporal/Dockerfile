# Build from the repo root: docker build -f packages/temporal/Dockerfile .
# node:slim (glibc) is required here -- @temporalio/core-bridge only ships
# prebuilt linux-gnu binaries, no musl/Alpine build.
FROM node:22-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile --filter @automated-reviews/temporal...

WORKDIR /app/packages/temporal
CMD ["pnpm", "exec", "tsx", "src/worker.ts"]
