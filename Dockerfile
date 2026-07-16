# StoryGen — single Cloud Run service: Express API + built React frontend.
FROM node:20-slim

WORKDIR /app

# Install dependencies (build needs dev deps like vite/esbuild).
COPY package*.json ./
RUN npm ci

# Copy source and build: frontend -> dist/, server -> dist/server.cjs
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Cloud Run injects PORT (default 8080); server.ts reads process.env.PORT.
EXPOSE 8080

# Credentials: no key file is shipped (git/docker-ignored); on Cloud Run the service's own
# service account provides Application Default Credentials for Firestore + GCS.
CMD ["npm", "start"]
