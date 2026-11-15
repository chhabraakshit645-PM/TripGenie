import { useState } from 'react';
import {
  Cloud,
  CloudRain,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  RefreshCw,
  Sun,
  Utensils,
} from 'lucide-react';
import type { GeocodedLocation, NearbyPlacesData, WeatherForecastData } from '../types/trip';
import { formatReadableDate } from '../utils/formatters';

interface ExternalDataPanelProps {
  location: GeocodedLocation | null;
  weather: WeatherForecastData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  onRetryWeather: () => void;
  nearbyPlaces: NearbyPlacesData | null;
  placesLoading: boolean;
  placesError: string | null;
  onRetryPlaces: () => void;
}

function WeatherGlyph({ code }: { code: number }) {
  if (code >= 51) {
    return <CloudRain className="h-4 w-4 text-violet-700" aria-hidden="true" />;
  }
  if (code >= 2) {
    return <Cloud className="h-4 w-4 text-slate-600" aria-hidden="true" />;
  }
  return <Sun className="h-4 w-4 text-amber-600" aria-hidden="true" />;
}

function getWeatherHeaderCopy(weather: WeatherForecastData | null): {
  kicker: string;
  kickerClass: string;
  heading: string;
} {
  if (!weather || weather.mode === 'forecast' || weather.mode === 'unavailable') {
    return {
      kicker: '0–16 Day Forecast',
      kickerClass: 'text-emerald-700',
      heading: 'Weather Forecast',
    };
  }
  if (weather.mode === 'seasonal') {
    return {
      kicker: 'Long-Range Trend',
      kickerClass: 'text-violet-700',
      heading: 'Seasonal Weather Outlook',
    };
  }
  return {
    kicker: 'Historical Climate Averages',
    kickerClass: 'text-amber-700',
    heading: 'Typical Weather Conditions',
  };
}

export function ExternalDataPanel({
  location,
  weather,
  weatherLoading,
  weatherError,
  onRetryWeather,
  nearbyPlaces,
  placesLoading,
  placesError,
  onRetryPlaces,
}: ExternalDataPanelProps) {
  const [placeFilter, setPlaceFilter] = useState<'all' | 'attraction' | 'food'>('all');

  const placesList = nearbyPlaces?.places ?? [];
  const filteredPlaces = placesList.filter((p) =>
    placeFilter === 'all' ? true : p.kind === placeFilter
  );

  const weatherCopy = getWeatherHeaderCopy(weather);
  const trend = weather?.trendSummary;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Weather Panel */}
      <section
        aria-labelledby="weather-panel-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className={`text-xs font-medium ${weatherCopy.kickerClass}`}>{weatherCopy.kicker}</p>
            <h3 id="weather-panel-heading" className="mt-1 font-display text-lg font-bold text-slate-950">
              {weatherCopy.heading}
            </h3>
          </div>
          {location?.available && location.lat !== undefined && location.lon !== undefined && (
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
            </span>
          )}
        </div>

        {weatherLoading ? (
          <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading destination weather">
            <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : weatherError ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>{weatherError}</p>
            <button
              type="button"
              onClick={onRetryWeather}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry weather</span>
            </button>
          </div>
        ) : weather ? (
          <>
            {/* Mode A (0–16 days): Live Current Snapshot + Daily Forecast */}
            {weather.mode === 'forecast' && weather.current && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Current conditions today</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {weather.current.weatherLabel} · Wind {weather.current.windSpeedKmh} km/h
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <WeatherGlyph code={weather.current.weatherCode} />
                  <span className="font-mono text-lg font-bold text-slate-950 tabular-nums">
                    {weather.current.temperatureC}°C
                  </span>
                </div>
              </div>
            )}

            {/* Mode B (Seasonal) & Mode C (Historical): Broad Trend Summary */}
            {weather.available && weather.mode !== 'forecast' && trend && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-medium text-slate-500">
                      {weather.mode === 'seasonal' ? 'Expected Daily Temp' : 'Typical Daily Temp'}
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-950 tabular-nums">
                      {trend.tempMinAvgC}° – {trend.tempMaxAvgC}°C
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                      Range {trend.tempRangeLowC}° to {trend.tempRangeHighC}°C
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-medium text-slate-500">
                      {weather.mode === 'seasonal' ? 'Rainfall Trend' : 'Historical Rainfall'}
                    </p>
                    <p className="mt-1 font-mono text-base font-bold text-slate-950 tabular-nums">
                      ~{trend.avgDailyPrecipitationMm} mm/day
                    </p>
                    {trend.rainySignalPct !== undefined && (
                      <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
                        {weather.mode === 'seasonal'
                          ? `${trend.rainySignalPct}% rainy model runs`
                          : `${trend.rainySignalPct}% rainy days in season`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-slate-500">General conditions</span>
                    <span className="text-right text-xs font-semibold text-slate-900">
                      {trend.generalCondition}
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3 border-t border-slate-100 pt-2">
                    <span className="text-xs font-medium text-slate-500">Rain pattern</span>
                    <span className="text-right text-xs text-slate-700">{trend.rainfallTrend}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mode A (0–16 days): Actual Daily Forecasts */}
            {weather.available && weather.mode === 'forecast' && weather.days.length > 0 && (
              <div className="mt-4 divide-y divide-slate-100">
                {weather.days.map((day) => (
                  <div key={day.date} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <WeatherGlyph code={day.weatherCode} />
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {formatReadableDate(day.date)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{day.weatherLabel}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-3">
                      <p className="font-mono text-sm font-semibold text-slate-950 tabular-nums">
                        {day.tempMinC}° – {day.tempMaxC}°C
                      </p>
                      {day.precipitationProbabilityMax !== null && (
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          Rain {day.precipitationProbabilityMax}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Travel Recommendation grounded in retrieved weather data */}
            {weather.available && trend?.travelRecommendation && (
              <div className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-3.5 text-xs leading-relaxed text-slate-800">
                <p className="font-semibold text-violet-950">Packing &amp; Travel Guidance</p>
                <p className="mt-1">{trend.travelRecommendation}</p>
              </div>
            )}

            {/* Data source & uncertainty/limitation communication */}
            {(weather.limitationNote || weather.reason) && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>{weather.limitationNote || weather.reason}</span>
              </div>
            )}

            {!weather.available && !weather.reason && (
              <p className="mt-4 text-sm text-slate-600">
                Weather details could not be retrieved right now.
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            Weather details will appear shortly.
          </p>
        )}
      </section>

      {/* Right: Nearby Places */}
      <section
        aria-labelledby="places-panel-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7"
      >
        {(() => {
          const attractionPlaces = placesList.filter((p) => p.kind === 'attraction');
          const foodPlaces = placesList.filter((p) => p.kind === 'food');
          const hasLoadedPlaces = !placesLoading && !placesError && Boolean(nearbyPlaces?.available);

          const renderPlaceCard = (place: (typeof placesList)[number]) => (
            <a
              key={place.id}
              href={place.osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-violet-300 hover:bg-slate-50/70 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {place.kind === 'food' ? (
                    <Utensils className="h-3.5 w-3.5 shrink-0 text-violet-700" aria-hidden="true" />
                  ) : (
                    <Compass className="h-3.5 w-3.5 shrink-0 text-slate-700" aria-hidden="true" />
                  )}
                  <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-800">
                    {place.name}
                  </p>
                </div>
                <p className="mt-1 text-xs capitalize text-slate-500 truncate">
                  {place.category}
                  {place.cuisine ? ` · ${place.cuisine}` : ''}
                </p>
                {place.address && (
                  <p className="mt-0.5 text-xs text-slate-500 truncate">{place.address}</p>
                )}
              </div>
              <ExternalLink
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-violet-700"
                aria-hidden="true"
              />
            </a>
          );

          return (
            <>
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
                <div>
                  <h3 id="places-panel-heading" className="font-display text-lg font-bold text-slate-950">
                    Nearby Attractions &amp; Eateries
                  </h3>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPlaceFilter('all')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      placeFilter === 'all'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {hasLoadedPlaces ? `All (${placesList.length})` : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceFilter('attraction')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      placeFilter === 'attraction'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {hasLoadedPlaces ? `Attractions (${attractionPlaces.length})` : 'Attractions'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceFilter('food')}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      placeFilter === 'food'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {hasLoadedPlaces ? `Eateries (${foodPlaces.length})` : 'Eateries'}
                  </button>
                </div>
              </div>

              {placesLoading ? (
                <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading nearby attractions and eateries">
                  <p className="text-xs text-slate-500">Finding real nearby attractions and eateries…</p>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    ))}
                  </div>
                </div>
              ) : placesError ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p>{placesError}</p>
                  <button
                    type="button"
                    onClick={onRetryPlaces}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry recommendations</span>
                  </button>
                </div>
              ) : nearbyPlaces?.available && filteredPlaces.length > 0 ? (
                <div className="mt-4 max-h-[380px] space-y-5 overflow-y-auto pr-1">
                  {placeFilter === 'all' ? (
                    <>
                      {attractionPlaces.length > 0 && (
                        <div>
                          <div className="mb-2.5 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-700">
                              Attractions &amp; Landmarks
                            </h4>
                            <span className="font-mono text-xs text-slate-500 tabular-nums">
                              {attractionPlaces.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {attractionPlaces.map(renderPlaceCard)}
                          </div>
                        </div>
                      )}

                      {foodPlaces.length > 0 && (
                        <div className={attractionPlaces.length > 0 ? 'border-t border-slate-100 pt-4' : ''}>
                          <div className="mb-2.5 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-700">
                              Eateries &amp; Cafes
                            </h4>
                            <span className="font-mono text-xs text-slate-500 tabular-nums">
                              {foodPlaces.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {foodPlaces.map(renderPlaceCard)}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {filteredPlaces.map(renderPlaceCard)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span>
                      {nearbyPlaces?.reason || 'No nearby places matched this filter.'}
                    </span>
                  </div>
                  {nearbyPlaces && !nearbyPlaces.available && (
                    <button
                      type="button"
                      onClick={onRetryPlaces}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Map data{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-slate-800"
                >
                  {nearbyPlaces?.attribution || '© OpenStreetMap contributors'}
                </a>
                .
              </p>
            </>
          );
        })()}
      </section>
    </div>
  );
}
