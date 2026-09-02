FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source files
COPY . .

# Build frontend and install backend dependencies
RUN cd frontend && npm install && npm run build
RUN cd backend && npm install --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

# Copy built backend and frontend dist
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/AjnabiDil_Latest.apk ./AjnabiDil_Latest.apk
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]
