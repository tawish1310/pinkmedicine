# Architecture

## Overview

The system is a React frontend + Express API backend. Research insights are assembled from live external sources:

- ClinicalTrials.gov API (trial metadata and enrollment context)
- OpenFDA FAERS API (sex-specific adverse event reports)

## High-level flow

1. User searches/selects a medication in frontend.
2. Frontend calls backend combined endpoint.
3. Backend queries ClinicalTrials and FAERS in parallel.
4. Backend summarizes/normalizes results into one response object.
5. Frontend renders FAERS cards, women-focused effects, and trial references.

## Backend layers

### Routes

- `src/routes/medications.ts`
  - medication lookup and metadata endpoints
- `src/routes/research.ts`
  - ClinicalTrials endpoints
  - FAERS endpoints
  - combined endpoint (`/combined/search`)

### Services

- `src/services/clinicalTrialsService.ts`
  - query construction
  - trial parsing
  - women participation analysis
- `src/services/dataCollectionService.ts`
  - FAERS query normalization
  - sex-specific event retrieval
  - top reaction aggregation

## Combined response shape

`/api/research/combined/search` returns:

- `clinicalTrials`
- `adverseEvents`
- `researchSummary`

`researchSummary` includes:

- clinical trial rollups
- FAERS rollups
- key insight fields used by UI

## Dev verification mode

In non-production mode, combined endpoint supports `debug=true` (or `includeRaw=true`) and appends:

- `debug.rawSources` (raw upstream payloads)
- `debug.validation` (cross-field consistency checks)
- request metadata and timestamp

In production mode, debug payload is blocked.

## Data boundaries

- FAERS data = post-market report counts (not incidence rates, not trial enrollment)
- ClinicalTrials data = trial registry and enrollment metadata
- These should be interpreted as complementary, not equivalent populations

## Removed legacy paths

This repository no longer uses:

- CSV ingestion pipelines for research runtime
- scheduled CSV/API import jobs from legacy pipelines
- setup/import guide docs tied to those flows
