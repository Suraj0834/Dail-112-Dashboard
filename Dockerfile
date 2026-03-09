# ==============================================================================
# Dockerfile - Web Portal Frontend (Production Build)
# ==============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Vite React app for production
# VITE_API_URL and VITE_SOCKET_URL will be passed at build time or handled via relative paths/NGINX
RUN npm run build


# ── Stage 2: Serve via NGINX ──────────────────────────────────────────────────
FROM nginx:alpine

# Remove default NGINX content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
