# Vesai Cloud Recording Service

A Cloud Run service that converts PostHog session recordings into WebM video files.

## What it does

1. Fetches PostHog session recording data using the PostHog API
2. Converts the rrweb events into a WebM video using headless Chromium
3. Uploads the video to Google Cloud Storage
4. Returns the video URL via callback

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (recommended for local development)
- PostHog API key with recording read access
- Google Cloud Storage bucket configured

### Local Development

#### Using Docker (Recommended)

##### Setup Google Cloud Authentication

```bash
# Install gcloud CLI if not already installed
# macOS: brew install google-cloud-sdk
# Others: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project ves-ai

# Create application default credentials for local development
gcloud auth application-default login
```

##### Build and Run with Docker

```bash
# Build the Docker image
docker build -t vesai-cloud .

# Stop any existing container using port 8080
docker stop $(docker ps -q --filter "publish=8080") 2>/dev/null || true

# Run the container with Google Cloud credentials
# macOS/Linux (with same resources as Cloud Run):
docker run -p 8080:8080 \
  --memory="4g" \
  --cpus="2" \
  --add-host=host.docker.internal:host-gateway \
  -e PORT=8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/tmp/keys/credentials.json \
  -v ~/.config/gcloud/application_default_credentials.json:/tmp/keys/credentials.json:ro \
  -e GCS_BUCKET=ves.ai \
  vesai-cloud
```

#### Using Node.js (macOS/Linux)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server
npm start
```

### API Usage

Send a POST request to `/process` with:

```json
{
  "source_type": "posthog",
  "source_host": "https://us.posthog.com",
  "source_key": "phx_your_api_key",
  "source_project": "posthog_project_id",
  "project_id": "project_uuid",
  "session_id": "session_uuid",
  "external_id": "recording_uuid",
  "active_duration": 120,
  "callback": "https://your-app.com/callback"
}
```

The service will:

1. Process the recording asynchronously
2. POST the result to your callback URL when complete

## Architecture

- **Language**: TypeScript
- **Runtime**: Node.js 22 in Docker
- **Video Rendering**: rrvideo with Playwright Chromium
- **Storage**: Google Cloud Storage
- **Deployment**: Cloud Run (auto-deployed from GitHub)
