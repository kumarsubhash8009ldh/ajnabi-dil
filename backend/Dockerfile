# Node.js LTS lightweight Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies (production only for high speed)
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose server port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the server
CMD ["node", "server.js"]
