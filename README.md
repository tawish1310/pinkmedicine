# Women's Medication Research API

Backend + frontend app for women-focused medication research using **live sources only**:

- **ClinicalTrials.gov** (trial inclusion and enrollment context)
- **OpenFDA FAERS** (post-market adverse event reports)

## What this repo does

- Searches medications and returns combined research data
- Shows women-focused trial inclusion metrics
- Shows sex-specific FAERS report counts and top reactions
- Supports dev-mode response verification on combined endpoint

## Current data model

- Runtime research insights come from live APIs (ClinicalTrials + FAERS)
- Legacy CSV ingestion and scheduled import paths have been removed

## Quick start

### 1) Install

```bash
npm install
```

### 2) Configure env

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL="file:./dev.db"
OPENFDA_API_KEY="your_openfda_api_key_here"
NODE_ENV="development"
PORT=3000
CORS_ORIGINS="http://localhost:5173"
```

### 3) Build and run backend

```bash
npm run build
npm start
```

### 4) Run frontend

```bash
npm run dev:frontend
```

## Quick Azure deployment (API + frontend)

This repo includes a single script to deploy:

- API to **Azure App Service**
- Frontend to **Azure Static Web Apps**

Prerequisites:

- Azure CLI installed and logged in (`az login`)
- Node.js 20+
- PowerShell 7+

Run from project root:

```powershell
npm run deploy:azure -- -SubscriptionId <your-subscription-id> -WixOrigin https://<your-wix-domain>
```

Optional parameters:

- `-Location` (default: `eastus`)
- `-ResourceGroup` (default: `pinkmedicine-rg`)
- `-AppServicePlan` (default: `pinkmedicine-plan`)
- `-ApiAppName` (auto-generated if omitted)
- `-StaticWebAppName` (auto-generated if omitted)
- `-OpenFdaApiKey` (or set `OPENFDA_API_KEY` env var)
- `-SkipBuild` (skip local build steps)

The script prints:

- API URL (for direct API calls)
- Frontend URL (use this for Wix button link)

## Wix integration

- For a Wix button, link to the deployed frontend URL.
- If Wix calls the API directly, include your Wix origin in CORS settings:
	- App Service setting: `CORS_ORIGINS=https://<your-wix-domain>,https://<your-frontend-domain>`

## Dev validation mode (combined response)

Endpoint:

`GET /api/research/combined/search?medication=<name>&debug=true`

In development, `debug=true` adds:

- raw source payloads
- validation flags (cross-field consistency checks)

In production, debug mode is blocked.

## Core API routes

- `/health`
- `/api/medications`
- `/api/research/clinical-trials/search`
- `/api/research/faers/sex-specific`
- `/api/research/combined/search`

## Notes

- FAERS numbers are report counts, not trial participant counts.
- Trial totals and FAERS totals measure different things and should not be compared as the same population metric.
