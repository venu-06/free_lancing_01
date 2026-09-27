# BuildLedger — Construction Payment Management

A construction payments app split into independently deployable frontend and backend services.

## Project folders

- `frontend/` — React and Vite user interface
- `backend/` — Express API, MongoDB models, and Excel import/report endpoints

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and add your MongoDB connection string.
2. In a terminal run `cd backend`, `npm install`, then `npm run dev`.
3. In a second terminal run `cd frontend`, `npm install`, then `npm run dev`.
4. Open `http://localhost:5173`.

The frontend uses `http://localhost:5000/api` locally. To point it at another API, set `VITE_API_URL` before building (include the `/api` suffix).

## Deploy both services to Render

This repository includes a root-level `render.yaml` Blueprint defining both services. In Render, create a **New Blueprint Instance** and choose this GitHub repository. Render will create:

- `buildledger-api-venu06` from the `backend/` folder
- `buildledger-frontend-venu06` from the `frontend/` folder

When prompted, provide `MONGODB_URI` for the API service. Keep this value in Render's environment settings, never in GitHub. The frontend build is configured with `VITE_API_URL=https://buildledger-api-venu06.onrender.com/api`. If Render assigns a different API hostname, update this variable on the frontend service and redeploy it.

If you prefer creating services separately, use these settings:

### Backend web service

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- Environment variables: `MONGODB_URI` (your MongoDB Atlas connection string); Render supplies `PORT` automatically.

### Frontend static site

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment variable: `VITE_API_URL=https://<your-backend-service>.onrender.com/api`
- Rewrite all paths to `/index.html` for the app's section URLs.

For MongoDB Atlas, allow connections from Render in your Atlas network access settings. Never commit `.env` files or database credentials.
