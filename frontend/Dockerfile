# BrandPulse frontend — TanStack Start built for Node, served by Nitro.

# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Bake the API URL into the client bundle (Vite inlines import.meta.env at build).
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Force a Node server build (the default target is Cloudflare Workers).
ENV NITRO_PRESET=node-server
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
