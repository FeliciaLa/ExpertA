# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve

# Copy built app from build stage
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package.json /app/
COPY --from=build /app/public /app/public

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost:${PORT:-5173}/health.json || exit 1

# Start the app
CMD ["sh", "-c", "serve -s dist -l ${PORT:-5173}"] 