# Production Dockerfile for Backend Service
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Non-root user for security
USER node

EXPOSE 5000

CMD ["node", "src/server.js"]
