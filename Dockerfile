# Production Dockerfile for Coimbatore CleanWater
FROM node:20-alpine

WORKDIR /app

# Expose container port
ENV PORT=3000
EXPOSE 3000

# Copy package files and install all dependencies (needed for build)
COPY package.json ./
RUN npm install

# Copy application source code
COPY . .

# Build Vite frontend assets and bundle server.cjs
RUN npm run build

# Default launch command
CMD ["npm", "start"]
