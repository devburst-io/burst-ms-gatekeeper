FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package*.json ./
COPY .npmrc .npmrc
RUN npm set progress=false && \
    npm config set fund false && \
    npm config set audit false && \
    npm ci

COPY . .
RUN npm run build
RUN npm ci --only=production && npm cache clean --force

RUN npm prune --production && \
    npm cache clean --force && \
    rm -rf /tmp/*

FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl=* \
    ca-certificates=* && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    rm -rf /tmp/* /var/tmp/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

USER node

ENV NODE_ENV production

USER node

LABEL org.opencontainers.image.source=https://github.com/devburst-io/burst-ms-gatekeeper \
      org.opencontainers.image.description="Burst Microservice Gatekeeper" \
      org.opencontainers.image.version="1.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "try { require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)); } catch (e) { process.exit(1); }"

EXPOSE 3000
EXPOSE 5000

ENTRYPOINT ["node", "dist/main.js"]