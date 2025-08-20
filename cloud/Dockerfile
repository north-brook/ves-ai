# Use the official Playwright base image which bundles browsers
FROM mcr.microsoft.com/playwright:v1.46.1-jammy

# OS deps
RUN apt-get update && \
    apt-get install -y \
      ffmpeg \
      fonts-liberation \
      fonts-noto-color-emoji \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure we reuse the preinstalled browsers from the base image
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# App deps
COPY package.json package-lock.json ./
RUN npm ci

# Build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
ENV DOCKERIZED=true
ENV NODE_OPTIONS="--max-old-space-size=3072"

# Cloud Run entry
CMD ["node", "dist/index.js"]