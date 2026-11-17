FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=/api
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends fonts-liberation && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server/src ./server/src
COPY server/scripts ./server/scripts
COPY server/templates ./server/templates
COPY server/schema.sql ./server/schema.sql
COPY scripts/start.js ./scripts/start.js
COPY package.json ./
RUN mkdir -p /app/server/uploads /app/backups && chown -R node:node /app/server/uploads /app/backups
ENV NODE_ENV=production
ENV PORT=5001
USER node
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=10s CMD node -e "fetch('http://127.0.0.1:5001/api/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","scripts/start.js"]
