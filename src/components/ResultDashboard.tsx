import { AlertCircle, ArrowLeft, CheckSquare, Loader2, RefreshCw, Train } from 'lucide-react';
import type {
  GeocodedLocation,
  NearbyPlacesData,
  TripPlanResponse,
  WeatherForecastData,
} from '../types/trip';
import { formatReadableDate } from '../utils/formatters';
import { BudgetPlannerPanel } from './BudgetPlannerPanel';
import { DayItineraryCard } from './DayItineraryCard';
import { ExternalDataPanel } from './ExternalDataPanel';

interface ResultDashboardProps {
  plan: TripPlanResponse;
  location: GeocodedLocation | null;
  weather: WeatherForecastData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  onRetryWeather: () => void;
  nearbyPlaces: NearbyPlacesData | null;
  placesLoading: boolean;
  placesError: string | null;
  onRetryPlaces: () => void;
  isRegeneratingFull: boolean;
  regeneratingDayNumber: number | null;
  dayError: string | null;
  onEditTrip: () => void;
  onRegenerateFull: () => void;
  onRegenerateDay: (dayNumber: number, customFocus?: string) => void;
}

export function ResultDashboard({
  plan,
  location,
  weather,
  weatherLoading,
  weatherError,
  onRetryWeather,
  nearbyPlaces,
  placesLoading,
  placesError,
  onRetryPlaces,
  isRegeneratingFull,
  regeneratingDayNumber,
  dayError,
  onEditTrip,
  onRegenerateFull,
  onRegenerateDay,
}: ResultDashboardProps) {
  const { request, totalDays, aiGeneratedPlan } = plan;
  const weatherByDate = new Map((weather?.days ?? []).map((d) => [d.date, d]));

  return (
    <section
      id="results-dashboard"
      aria-labelledby="result-trip-title"
      className="border-b border-slate-200 bg-slate-50/70 py-14 sm:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Summary Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-violet-700">Personalised Itinerary</span>
                <span aria-hidden="true">·</span>
                <span>
                  {request.startingCity} to {request.destination}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatReadableDate(request.departureDate)} – {formatReadableDate(request.returnDate)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {request.travelers} {request.travelers === 1 ? 'Traveller' : 'Travellers'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{request.preference} Tier</span>
              </div>

              <h2
                id="result-trip-title"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
              >
                {aiGeneratedPlan.tripTitle}
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {aiGeneratedPlan.overview}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onEditTrip}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Edit Trip</span>
              </button>

              <button
                type="button"
                disabled={isRegeneratingFull}
                onClick={onRegenerateFull}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isRegeneratingFull ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isRegeneratingFull ? 'Regenerating...' : 'Regenerate Itinerary'}</span>
              </button>
            </div>
          </div>

          {/* Provenance Strip: Itinerary Estimates vs Live Destination Info */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 text-xs md:grid-cols-2">
            <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 p-3.5 text-slate-700">
              <p className="font-semibold text-violet-950">Personalised Itinerary &amp; Estimates</p>
              <p className="mt-1 leading-relaxed">
                Day-wise schedules, transit tips, packing list, and INR expense figures are tailored estimates for planning inspiration.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 text-slate-700">
              <p className="font-semibold text-emerald-950">
                Live Destination Weather &amp; Places
              </p>
              <p className="mt-1 leading-relaxed">
                {weatherLoading || placesLoading
                  ? `Loading live weather and nearby recommendations for ${request.destination}...`
                  : location?.available
                    ? `Destination matched: ${location.displayName}. Weather forecasts and nearby places below are retrieved in real time.`
                    : 'Live destination details reflect current availability below.'}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Planner */}
        <BudgetPlannerPanel
          targetBudgetInr={request.budgetInr}
          travelers={request.travelers}
          totalDays={totalDays}
          breakdown={aiGeneratedPlan.budgetBreakdown}
        />

        {/* Independent Background Weather & Nearby Places */}
        <ExternalDataPanel
          location={location}
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          onRetryWeather={onRetryWeather}
          nearbyPlaces={nearbyPlaces}
          placesLoading={placesLoading}
          placesError={placesError}
          onRetryPlaces={onRetryPlaces}
        />

        {/* Day-Wise Itinerary Section */}
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium text-violet-700">Day-by-Day Plan</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-slate-950">
                Day-Wise Itinerary ({totalDays} {totalDays === 1 ? 'Day' : 'Days'})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Want a different vibe for a specific day? Use &ldquo;Regenerate Day&rdquo; on any card.
            </p>
          </div>

          {dayError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{dayError}</span>
            </div>
          )}

          <div className="space-y-5">
            {aiGeneratedPlan.days.map((day) => (
              <DayItineraryCard
                key={day.dayNumber}
                day={day}
                matchedWeather={weatherByDate.get(day.date)}
                isRegenerating={regeneratingDayNumber === day.dayNumber}
                onRegenerateDay={onRegenerateDay}
              />
            ))}
          </div>
        </div>

        {/* Practical Travel & Packing Notes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <Train className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-slate-950">
                Getting There &amp; Local Transit
              </h3>
            </div>
            {aiGeneratedPlan.intercityTravelNote && (
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {aiGeneratedPlan.intercityTravelNote}
              </p>
            )}
            {aiGeneratedPlan.localTransitTips.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {aiGeneratedPlan.localTransitTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-mono text-xs text-violet-700 mt-1">
                      {String(idx + 1).padStart(2, '0')}.
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-violet-700" aria-hidden="true" />
              <h3 className="font-display text-lg font-bold text-slate-950">
                Smart Packing Checklist
              </h3>
            </div>
            {aiGeneratedPlan.packingChecklist.length > 0 ? (
              <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {aiGeneratedPlan.packingChecklist.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-slate-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Pack light comfortable footwear, ID proofs, power bank, and reusable water bottle.
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
