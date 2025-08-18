# Use the official Playwright base to ensure browsers and deps are available
FROM mcr.microsoft.com/playwright:v1.46.1-jammy

# Install necessary packages
RUN apt-get update && apt-get install -y unzip && apt-get install -y ffmpeg && ffmpeg -version && ffprobe -version && apt-get clean

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Install deps with Bun (including devDependencies for build)
COPY package.json bun.lockb* ./
RUN bun install

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN bun run build

# Remove devDependencies after build to reduce image size
RUN bun install --production

# Ensure Playwright browsers are installed
RUN bunx playwright install chromium

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Cloud Run will inject PORT; our server reads it
CMD [ "bun", "run", "dist/index.js" ]