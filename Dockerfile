# ---------- 1\ufe0f\u20e3 BUILD STAGE ----------
FROM node:20-alpine AS builder
WORKDIR /app

# deps
COPY package*.json ./
RUN npm ci

# source & build
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build          # produces .next/standalone

# ---------- 2\ufe0f\u20e3 RUNTIME STAGE ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# copy standalone server bundle + static + public assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# install only prod deps declared inside .next/standalone/package.json
RUN npm install --omit=dev --ignore-scripts

EXPOSE 8080
CMD node server.js          # Use shell form for CMD 