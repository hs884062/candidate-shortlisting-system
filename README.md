# Candidate Shortlisting System

Node/Express + MongoDB backend with a React (Vite) frontend.

## Features

- Add candidates (`POST /api/candidates`)
- List candidates (`GET /api/candidates`)
- Basic skill/experience matching (`POST /api/match`)
- AI-based shortlisting via OpenRouter (`POST /api/ai/shortlist`)

## Prerequisites

- Node.js
- MongoDB (local) or a MongoDB Atlas connection string

## Backend setup

1. Create an environment file:

- Copy `backend/.env.example` to `backend/.env`
- Set `MONGO_URI`
- (Optional) Set `OPENROUTER_API_KEY` for AI shortlisting
- (Optional) Set `CORS_ORIGIN` (comma-separated) for production

2. Install and run:

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000` by default.

## Frontend setup

The frontend is configured with a Vite dev proxy so requests to `/api/*` are forwarded to `http://localhost:5000`.

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

### Production API base URL

For production, set `VITE_API_BASE_URL` in a frontend env file or deployment environment.
Example:

```bash
VITE_API_BASE_URL=https://your-backend.onrender.com
```

This ensures the frontend can reach the backend when the dev proxy is not available.

## Using the app

1. Start MongoDB + backend
2. Start the frontend
3. In the UI:
   - Add candidates
   - Refresh candidate list
   - Enter job requirements
   - Run **Basic Match** or **AI Shortlist**

## Notes

- If `OPENROUTER_API_KEY` is not set, **AI Shortlist** will return an error; **Basic Match** still works.
- For a single-service deployment, build the frontend and serve `frontend/dist` from the backend.
