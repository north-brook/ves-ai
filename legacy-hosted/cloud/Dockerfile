# Use Playwright base image with Node.js
FROM mcr.microsoft.com/playwright:v1.55.0-noble

# OS deps
RUN apt-get update && \
    apt-get install -y \
      ffmpeg \
      fonts-liberation \
      fonts-noto-color-emoji \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# App deps
COPY package.json package-lock.json ./
RUN npm ci

# Install only Chromium browser with dependencies
RUN npx playwright install --with-deps chromium

# Create symlink for ffmpeg where Playwright expects it
RUN mkdir -p /ms-playwright/ffmpeg-1011 && \
    ln -sf /usr/bin/ffmpeg /ms-playwright/ffmpeg-1011/ffmpeg-linux

# Build TypeScript server
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Set environment variables for production
ENV NODE_ENV=production
ENV DOCKERIZED=true
ENV NODE_OPTIONS="--max-old-space-size=3072"


# Cloud Run entry
CMD ["node", "dist/index.js"]