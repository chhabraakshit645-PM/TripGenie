# Code & API Architecture Explanation

This document explains the purpose of every source file and major function in **TripGenie AI**, along with the end-to-end API data flow.

---

## File-by-File Breakdown

### Entry & Configuration

- **`index.html`**: Root HTML document containing synced SEO/OpenGraph metadata and Google Fonts imports (`Plus Jakarta Sans` for display headings, `DM Sans` for body prose, and `JetBrains Mono` for tabular INR amounts and weather metrics).
- **`metadata.json`**: AI Studio application manifest specifying the app name (`TripGenie AI`), description, and `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.
- **`package.json`**: Project dependencies and scripts (`dev` via `tsx server.ts`, `build` via `vite build`, `lint` via `tsc --noEmit`).
- **`src/index.css`**: Tailwind CSS v4 entry stylesheet defining `--font-display`, `--font-sans`, `--font-mono`, `.tabular-nums` alignment, and `prefers-reduced-motion` accessibility rules.

---

### Backend (Node.js + Express)

#### `server.ts`
- **`startServer()`**: Bootstraps the Express application on port `3000`, mounts JSON body parsing and `/api` routes from `server/routes.ts`, attaches Vite dev middleware in development mode, and serves the static `dist/` build in production.

#### `server/cache.ts`
- **`MemoryTtlCache` (`apiCache`)**: Lightweight bounded in-memory key-value store with per-entry expiration (`expiresAt`) to avoid redundant calls to Nominatim, Overpass, and Open-Meteo.
- **`waitForNominatimSlot()`**: Enforces a minimum `1100ms` spacing between outbound Nominatim geocoding requests to respect OpenStreetMap's 1 request/second usage policy.

#### `server/externalData.ts`
- **`describeWeatherCode(code)`**: Maps WMO weather interpretation codes (`0`–`99`) returned by Open-Meteo into readable descriptions (`Clear sky`, `Moderate rain`, etc.).
- **`fetchWithTimeout(url, options, timeoutMs)`**: Wraps native `fetch` with an `AbortController` timeout so slow third-party APIs fail gracefully without hanging the user request.
- **`geocodeDestination(destination)`**: Queries OpenStreetMap Nominatim (`format=jsonv2`) using a descriptive `User-Agent` header, caches matches for 24 hours, and returns `{ available, lat, lon, displayName, attribution }` or an honest failure reason.
- **`fetchWeatherForecast(lat, lon, departureDate, returnDate)`**: Queries Open-Meteo for current conditions plus daily forecasts. Explicitly checks overlap against Open-Meteo's 16-day forecast window (`today` to `today + 15 days`) so out-of-range dates return `outOfRange: true` with an honest notice rather than invalid requests or fabricated weather. Cached for 30 minutes.
- **`classifyOsmElement(el)`**: Filters raw Overpass nodes/ways that have a `name` tag into `attraction` or `food` `OsmPlace` objects with direct OpenStreetMap URLs, without inventing ratings or hours.
- **`fetchNearbyPlaces(lat, lon)`**: Queries the OpenStreetMap Overpass API (with a fallback mirror if the primary endpoint is busy), deduplicates results by name, limits payload size, and caches for 6 hours.

#### `server/geminiService.ts`
- **`getGeminiClient()`**: Instantiates `GoogleGenAI` using `process.env.GEMINI_API_KEY` and required `User-Agent` headers. Throws a clear configuration error if the key is missing.
- **`buildDateList(startIso, endIso)`**: Generates an ordered array of ISO `YYYY-MM-DD` strings for the trip duration (capped at 14 days).
- **`normalizeDayMath(day)`**: Ensures each day's `dailyBreakdownInr` fields are non-negative integers and keeps `estimatedDailyExpenseInr` consistent with the category sum.
- **`recalculateBudgetFromDays(days, travelers, budgetAdvice)`**: Computes total `foodInr`, `localTransportInr`, `activitiesInr`, `accommodationInr`, `totalEstimatedInr`, and `perPersonInr` deterministically across all days.
- **`formatExternalContext(location, weather, nearbyPlaces)`**: Serializes verified OpenStreetMap and Open-Meteo data into concise factual context for the Gemini prompt.
- **`generateWithRetry(fn, retries)`**: Provides single-retry exponential backoff on transient `429`/`503`/timeout errors.
- **`generateFullItinerary(req, location, weather, nearbyPlaces)`**: Calls `gemini-4-hydrogen` via `ai.models.generateContent` with `SYSTEM_PROMPT`, `responseMimeType: "application/json"`, and `TRIP_PLAN_SCHEMA` (`Type` enum) to produce a complete structured `AiGeneratedPlan`.
- **`regenerateSingleDay(req)`**: Regenerates a single `DayItinerary` object via `gemini-4-hydrogen` (`DAY_SCHEMA`) while passing other day titles to avoid duplicate activities and optionally honoring a user's `customFocus`.

#### `server/routes.ts`
- **`validateTripRequest(body)`**: Sanitizes and validates starting city, destination, ISO dates, 1–14 day duration limit, budget (`₹500`–`₹1,00,00,000`), traveller count (`1`–`25`), preference tier, and interests.
- **`GET /api/health`**: Simple liveness check.
- **`POST /api/plan-trip`**: Validates inputs and immediately invokes `generateFullItinerary` (`gemini-4-hydrogen`, `ThinkingLevel.LOW`) without waiting for weather or map calls.
- **`GET /api/weather`**: Resolves destination coordinates (deduplicated/cached) and fetches Open-Meteo forecasts independently.
- **`GET /api/places`**: Resolves destination coordinates (deduplicated/cached) and queries OpenStreetMap Overpass for nearby attractions and eateries independently.
- **`POST /api/regenerate-day`**: Validates trip context and calls `regenerateSingleDay` for a single day card.

---

### Frontend (React + TypeScript)

#### `src/types/trip.ts`
- Shared TypeScript interfaces (`TripPlanRequest`, `TripPlanResponse`, `WeatherForecastData`, `NearbyPlacesData`, `DayItinerary`, `BudgetBreakdown`, `RegenerateDayRequest`) ensuring end-to-end type safety between Express and React.

#### `src/data/destinations.ts`
- **`CURATED_DESTINATIONS`**: Four curated Indian youth destinations (Goa, Manali, Jaipur, Rishikesh) referencing locally generated `4:3` editorial photography in `src/assets/images/`, plus suggested days, Rupee budgets, and interests.

#### `src/utils/formatters.ts`
- **`formatInr(amount)`**: Formats numbers using `Intl.NumberFormat('en-IN')` in Indian Rupees (`₹`).
- **`formatReadableDate(isoDate)`**, **`getTodayIso()`**, **`addDaysToIso()`**, **`calculateInclusiveDays()`**: UTC-safe date helpers for form defaults, duration calculation, and itinerary labels.

#### `src/components/Navbar.tsx`
- Sticky 3-zone top navigation bar (`TripGenie AI` wordmark, single-line section links, `Plan My Trip` CTA, and responsive mobile menu).

#### `src/components/HeroSection.tsx`
- Asymmetric 2-column hero featuring the headline `"Your Next Adventure, Planned by AI."`, subtitle, primary CTA, factual feature strip, and generated `16:9` hero photograph with an automatic fallback container.

#### `src/components/DestinationsSection.tsx`
- 4-card destination showcase grid; clicking any card pre-populates `TripPlannerForm` and scrolls smoothly to the builder.

#### `src/components/HowItWorksSection.tsx`
- 3-step editorial breakdown explaining how user inputs, real-time external APIs, and Gemini AI work together.

#### `src/components/TripPlannerForm.tsx`
- Validated 8-field form with city quick-picks, Rupee budget presets, per-person budget preview, traveller stepper, 3-tier travel preference selector, multi-select interest buttons, progressive loading step status, and accessible inline error messages.

#### `src/components/BudgetPlannerPanel.tsx`
- Displays estimated Food, Local Transport, Activities, Accommodation, Total Estimated Budget, Remaining Budget (with explicit within/over-budget icon + text status), proportional segmented distribution bar, and cost-estimate disclaimer.

#### `src/components/ExternalDataPanel.tsx`
- Side-by-side verified data cards:
  - **Open-Meteo Weather**: Shows current conditions today, daily trip forecasts when inside the 16-day range, and honest notices when trip dates fall outside the forecast window.
  - **OpenStreetMap Overpass Places**: Filterable (`All`, `Attractions`, `Food`) list of real nearby landmarks and eateries linking directly to OpenStreetMap with `© OpenStreetMap contributors` attribution.

#### `src/components/DayItineraryCard.tsx`
- Renders an individual AI-generated day card with matched verified forecast (if available), Morning/Afternoon/Evening slots, transit tips, food focus, daily expense breakdown, and an inline **Regenerate Day** workflow with optional custom focus input.

#### `src/components/ResultDashboard.tsx`
- Combines the trip overview header (`Edit Trip` and `Regenerate Itinerary` actions), AI vs. Verified External Data provenance strip, `BudgetPlannerPanel`, `ExternalDataPanel`, `DayItineraryCard` list, intercity transit notes, and packing checklist.

#### `src/App.tsx`
- Top-level application state coordinator connecting destination presets, `/api/plan-trip`, `/api/regenerate-day`, and automatic client-side budget ledger recalculation after individual day updates.
