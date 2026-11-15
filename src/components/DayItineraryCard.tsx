import { useState } from 'react';
import { Loader2, RefreshCw, Utensils } from 'lucide-react';
import type { DayItinerary, WeatherDay } from '../types/trip';
import { formatInr, formatReadableDate } from '../utils/formatters';

interface DayItineraryCardProps {
  day: DayItinerary;
  matchedWeather?: WeatherDay;
  isRegenerating: boolean;
  onRegenerateDay: (dayNumber: number, customFocus?: string) => void;
}

export function DayItineraryCard({
  day,
  matchedWeather,
  isRegenerating,
  onRegenerateDay,
}: DayItineraryCardProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customFocus, setCustomFocus] = useState('');

  const slots = [
    { label: 'Morning', data: day.morning },
    { label: 'Afternoon', data: day.afternoon },
    { label: 'Evening', data: day.evening },
  ];

  const handleRegenerate = () => {
    onRegenerateDay(day.dayNumber, customFocus.trim() || undefined);
    setShowCustomInput(false);
    setCustomFocus('');
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono font-semibold text-violet-700 tabular-nums">
              Day {String(day.dayNumber).padStart(2, '0')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatReadableDate(day.date)}</span>
            <span aria-hidden="true">·</span>
            <span>{day.theme}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-600">Suggested Plan</span>
          </div>

          <h4 className="mt-1.5 font-display text-xl font-bold text-slate-950">{day.title}</h4>

          {matchedWeather ? (
            <p className="mt-1.5 text-xs text-emerald-800">
              Live Forecast: {matchedWeather.weatherLabel},{' '}
              <span className="font-mono tabular-nums">
                {matchedWeather.tempMinC}°–{matchedWeather.tempMaxC}°C
              </span>
              {matchedWeather.precipitationProbabilityMax !== null &&
                ` · Rain ${matchedWeather.precipitationProbabilityMax}%`}
            </p>
          ) : (
            day.weatherAdvisory && (
              <p className="mt-1.5 text-xs text-slate-500">Seasonal Tip: {day.weatherAdvisory}</p>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-500">Est. Daily Expense</p>
            <p className="font-mono text-lg font-bold text-slate-950 tabular-nums">
              {formatInr(day.estimatedDailyExpenseInr)}
            </p>
          </div>

          <button
            type="button"
            disabled={isRegenerating}
            onClick={() => setShowCustomInput((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-violet-400 hover:text-violet-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isRegenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-700" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Day'}</span>
          </button>
        </div>
      </div>

      {/* Optional Custom Focus Prompt for Single Day Regeneration */}
      {showCustomInput && (
        <div className="mt-4 flex flex-col gap-2.5 rounded-xl border border-violet-200 bg-violet-50/50 p-4 sm:flex-row sm:items-center">
          <input
            type="text"
            value={customFocus}
            onChange={(e) => setCustomFocus(e.target.value)}
            placeholder="Optional: e.g. More relaxed pace, add street food walk, skip museums"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none"
          />
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-800 cursor-pointer whitespace-nowrap"
            >
              Regenerate Now
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInput(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Time Slots: Morning, Afternoon, Evening */}
      <div className="mt-5 divide-y divide-slate-100">
        {slots.map((slot) => (
          <div key={slot.label} className="grid grid-cols-1 gap-3 py-4 first:pt-1 last:pb-1 md:grid-cols-12">
            <div className="md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                {slot.label}
              </p>
              <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                {slot.data.timeRange}
              </p>
            </div>

            <div className="md:col-span-7">
              <h5 className="text-sm font-bold text-slate-950">{slot.data.title}</h5>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{slot.data.description}</p>
              <p className="mt-1.5 text-xs text-slate-500">
                Transit tip: {slot.data.transportTip}
              </p>
            </div>

            <div className="md:col-span-2 md:text-right">
              <p className="text-xs text-slate-400">Est. activity</p>
              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatInr(slot.data.estimatedCostInr)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer: Food Recommendation & Daily Expense Split */}
      <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-2 text-xs text-slate-700">
          <Utensils className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-slate-900">Food focus:</strong>{' '}
            {day.foodRecommendation}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-500 tabular-nums">
          <span>Stay {formatInr(day.dailyBreakdownInr.accommodationInr)}</span>
          <span aria-hidden="true">·</span>
          <span>Food {formatInr(day.dailyBreakdownInr.foodInr)}</span>
          <span aria-hidden="true">·</span>
          <span>Transit {formatInr(day.dailyBreakdownInr.localTransportInr)}</span>
          <span aria-hidden="true">·</span>
          <span>Activities {formatInr(day.dailyBreakdownInr.activitiesInr)}</span>
        </div>
      </div>
    </article>
  );
}
