# Use the official Playwright base to ensure browsers and deps are available
FROM mcr.microsoft.com/playwright:v1.46.1-jammy

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Install deps with Bun
COPY package.json bun.lockb* ./
RUN bun install --production

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN bun run build

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# Cloud Run will inject PORT; our server reads it
CMD [ "bun", "run", "dist/index.js" ]