FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_API_URL must be baked at build time for client-side bundle
ARG NEXT_PUBLIC_API_URL=http://103.182.211.219:6002
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ---- runner ----
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=6001
ENV HOSTNAME=0.0.0.0

# API_URL is server-side runtime var — set here so it's always available
# Can be overridden at runtime via docker run -e or docker-compose environment
ENV API_URL=http://103.182.211.219:6002

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 6001

CMD ["node", "server.js"]
