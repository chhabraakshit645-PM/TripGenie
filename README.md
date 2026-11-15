# TripGenie AI

**Your Next Adventure, Planned by AI.**

TripGenie AI is a full-stack travel planning assistant designed specifically for Indian students, young travellers, and budget-conscious groups. It combines structured Gemini AI itinerary generation with real-time destination weather (Open-Meteo) and real geographic places (OpenStreetMap Nominatim & Overpass API) — all denominated in Indian Rupees (`₹`) and completely transparent about what is AI-estimated versus externally verified.

---

## Problem Statement

Indian students and young group travellers often juggle fragmented tabs—blogs for things to do, spreadsheets for Rupee splits, weather sites for forecasts, and maps to check where places actually are. Generic AI chatbots frequently hallucinate live hotel rates, invent place ratings, ignore real weather windows, and return unstructured walls of text that are hard to edit day by day.

TripGenie AI solves this by providing a structured planning workspace that:
1. Grounds itineraries in real coordinates, nearby landmarks, and live forecasts from open APIs.
2. Budgets realistically in Indian Rupees (`INR`) for `Budget`, `Standard`, and `Premium` tiers.
3. Explicitly separates **Verified External Data** from **AI-Generated Suggestions** and never fabricates live hotel offers, flight fares, ratings, or opening hours.

---

## Core Features

- **Curated Quick-Start Destinations**: Pre-fill routes for student and group favourites (Goa, Manali, Jaipur, Rishikesh) with realistic starter budgets and day counts.
- **8-Field Interactive Trip Planner**: Starting city, destination, departure & return dates, total group budget (`INR`), traveller count, travel tier (`Budget`, `Standard`, `Premium`), and multi-select interests (`Beaches`, `Adventure`, `Food`, `Shopping`, `Nature`, `Nightlife`, `Sightseeing`).
- **Gemini Structured Itinerary Engine**: Generates Morning, Afternoon, and Evening plans per day with transit tips, food recommendations, packing checklists, and per-day INR breakdowns using `@google/genai` (`gemini-4-hydrogen`) with strict JSON schemas.
- **Single-Day Regeneration**: Regenerate any individual day (with an optional custom focus like *"more relaxed"* or *"street food walk"*) while automatically recalculating the overall Rupee budget.
- **Rupee Budget Planner**: Tracks Estimated Food, Local Transport, Activities, Accommodation, Total Estimated Budget, and Remaining Budget vs. target.
- **Real-Time Weather & Forecast Honesty**: Fetches Open-Meteo current observations and 16-day forecasts. If travel dates fall outside the 16-day forecast window, it clearly notifies the user instead of inventing weather.
- **Verified Nearby Places**: Queries OpenStreetMap Overpass API for real attractions, viewpoints, beaches, cafes, and restaurants with direct links to OpenStreetMap and proper `© OpenStreetMap contributors` attribution.

---

## Competitor Analysis & Unique Selling Proposition (USP)

| Capability | Generic AI Chatbots | Traditional OTA Portals | **TripGenie AI** |
| :--- | :--- | :--- | :--- |
| **Indian Rupee & Student Tier Focus** | Generic USD-centric defaults | Upsell-heavy luxury packages | Built around INR, hostels, trains, buses & scooters |
| **Structured Day-Wise Editing** | Requires re-prompting entire chat | Static fixed packages | One-click single-day regeneration + instant budget sync |
| **External Data Grounding** | Often hallucinates places/weather | Proprietary booking inventory | Real Open-Meteo weather + OpenStreetMap Overpass places |
| **Data Transparency** | Mixes guesses with facts | Sponsored rankings | Strict separation of AI estimates vs. verified public data |
| **Zero-Cost MVP Stack** | Paid subscriptions for planning | Commission-driven | 100% free external APIs, no login or paywall required |

**USP:** *Honest, Rupee-first group trip planning that pairs Gemini's structured reasoning with free, verified OpenStreetMap and Open-Meteo data—without fabricated prices or fake ratings.*

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend**: Node.js, Express, `tsx` (development middleware with Vite)
- **Generative AI**: `@google/genai` SDK (`gemini-4-hydrogen`) using server-side `GEMINI_API_KEY`
- **External APIs (Free & Open)**:
  - **Open-Meteo Forecast API** (`https://api.open-meteo.com/v1/forecast`)
  - **OpenStreetMap Nominatim API** (`https://nominatim.openstreetmap.org/search`)
  - **OpenStreetMap Overpass API** (`https://overpass-api.de/api/interpreter`)

---

## API Architecture Explanation

All external API calls and Gemini LLM requests are executed exclusively on the Node.js/Express backend so secrets remain server-side and rate limits/caching are enforced centrally:

1. **Fast Itinerary Generation (`POST /api/plan-trip`)**:
   - Validates dates (1–14 days), INR budget bounds, traveller count, and preference tier.
   - Calls `generateFullItinerary()` directly using `gemini-4-hydrogen` (`ThinkingLevel.LOW`, streamlined schema, and bounded `maxOutputTokens`) without waiting for weather or map APIs, so the day-wise itinerary and Rupee budget render immediately.
2. **Independent Weather & Places Loading (`GET /api/weather` & `GET /api/places`)**:
   - The frontend dispatches `/api/weather` and `/api/places` concurrently in the background.
   - Both endpoints share an in-flight deduplicated and 24-hour cached `geocodeDestination()` lookup via OpenStreetMap Nominatim (`1 req/sec` throttle).
   - `/api/weather` fetches Open-Meteo current observations and 16-day forecasts (30-min cache) and explicitly flags out-of-range dates.
   - `/api/places` queries the OpenStreetMap Overpass API (6-hour cache, mirror fallback) independently so slow map queries never delay the itinerary or weather card.
3. **Single-Day Regeneration (`POST /api/regenerate-day`)**:
   - Sends the target day number, existing other day titles (to avoid repetition), optional user focus, matched weather, and nearby places to `regenerateSingleDay()`, returning a fresh `DayItinerary` object while the client updates the budget ledger in place.

---

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set your Gemini API key:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
3. **Run in development mode** (Express + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
4. **Type-check & build for production**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Attribution**:
   - Map & POI data: `© OpenStreetMap contributors`
   - Weather forecasts: `Open-Meteo`
