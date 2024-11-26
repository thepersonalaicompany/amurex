# Amurex Backend

A Python-based backend service for real-time meeting transcription and analysis, powered by various AI models and services.

## Prerequisites

- Python 3.11
- Redis server
- Docker (optional)
- Required API keys:
  - OpenAI API key
  - Groq API key
  - Supabase credentials
  - MixedBread AI key

## Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)

2. Create the following tables in your Supabase database:

### Meetings Table

You can find the SQL for this table in `supabase/migrations/20241201195715_meetings.sql`

3. Set up Storage:
   - Create a new bucket named `meeting_context_files`
   - Set the bucket's privacy settings according to your needs
   - Make sure to configure CORS if needed

4. Get your credentials:
   - Go to Project Settings > API
   - Copy your `Project URL` (this will be your SUPABASE_URL)
   - Copy your `anon/public` key (this will be your SUPABASE_ANON_KEY)

Create a `.env` file in the root directory with the following variables:

```
env
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_project_url
SUPABASE_ANON_KEY=your_anon_key
REDIS_USERNAME=your_redis_username
REDIS_URL=your_redis_host
REDIS_PASSWORD=your_redis_password
PPLX_API_KEY=your_perplexity_key
```

## Installation

### Option 1: Local Installation

1. Create a virtual environment:

```
python -m venv venv
```

2. Install dependencies:

```
pip install -r requirements.txt
```

3 Start the application

```
python index.py
```

### Option 2: Docker

1. Build the Docker image:

```
docker build -t amurex-backend .
```

2. Run the Docker container:

```bash
docker run -d --name amurex-backend 
```

Alternatively, use docker compose:

```bash
docker compose up
```
