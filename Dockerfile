FROM node:24-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack pnpm install --frozen-lockfile
COPY . .
RUN corepack pnpm build
ENV PORT=8080 ATLAS_BIND=0.0.0.0 WRANGLER_SEND_METRICS=false
EXPOSE 8080
CMD ["node", "scripts/start-local.mjs"]
