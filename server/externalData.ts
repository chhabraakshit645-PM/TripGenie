import type {
  CurrentWeatherSnapshot,
  GeocodedLocation,
  NearbyPlacesData,
  OsmPlace,
  WeatherDay,
  WeatherForecastData,
} from '../src/types/trip.ts';
import { apiCache, waitForNominatimSlot } from './cache.ts';

const NOMINATIM_USER_AGENT = 'TripGenie/1.0 (https://tripgenie.local)';
const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

const WMO_WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

export function describeWeatherCode(code: number): string {
  return WMO_WEATHER_LABELS[code] ?? 'Variable conditions';
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

const inflightGeocode = new Map<string, Promise<GeocodedLocation>>();

export async function geocodeDestination(destination: string): Promise<GeocodedLocation> {
  const normalized = destination.trim().toLowerCase();
  const cacheKey = `nominatim:${normalized}`;
  const cached = apiCache.get<GeocodedLocation>(cacheKey);
  if (cached) return cached;

  const existing = inflightGeocode.get(normalized);
  if (existing) return existing;

  const promise = (async (): Promise<GeocodedLocation> => {
    try {
      await waitForNominatimSlot();
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        destination.trim()
      )}&limit=1&addressdetails=1`;

      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            'Accept-Language': 'en',
          },
        },
        7000
      );

      if (!res.ok) {
        return {
          available: false,
          query: destination,
          reason: 'Location details could not be verified right now.',
          attribution: OSM_ATTRIBUTION,
        };
      }

      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: {
          country?: string;
          state?: string;
        };
      }>;

      if (!Array.isArray(data) || data.length === 0) {
        const notFound: GeocodedLocation = {
          available: false,
          query: destination,
          reason: `Could not locate "${destination}" on the map.`,
          attribution: OSM_ATTRIBUTION,
        };
        apiCache.set(cacheKey, notFound, 60 * 60 * 1000);
        return notFound;
      }

      const match = data[0];
      const result: GeocodedLocation = {
        available: true,
        query: destination,
        displayName: match.display_name,
        lat: Number(match.lat),
        lon: Number(match.lon),
        country: match.address?.country,
        state: match.address?.state,
        attribution: OSM_ATTRIBUTION,
      };

      apiCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
      return result;
    } catch (error) {
      return {
        available: false,
        query: destination,
        reason:
          error instanceof Error && error.name === 'AbortError'
            ? 'Location lookup timed out. Please try again shortly.'
            : 'Unable to verify destination details right now.',
        attribution: OSM_ATTRIBUTION,
      };
    } finally {
      inflightGeocode.delete(normalized);
    }
  })();

  inflightGeocode.set(normalized, promise);
  return promise;
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function diffDaysIso(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function averageNums(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function percentileNums(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const weight = idx - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

function classifyRainfallTrend(avgDailyRainMm: number, rainySignalPct?: number): string {
  const pct = rainySignalPct ?? 0;
  if (avgDailyRainMm < 0.4 && pct < 15) {
    return 'Mostly dry with low chance of rain';
  }
  if (avgDailyRainMm < 2.5 && pct < 35) {
    return 'Light or passing showers possible';
  }
  if (avgDailyRainMm < 7 && pct < 65) {
    return 'Moderate rainfall trend — periodic showers expected';
  }
  return 'Wet conditions likely — frequent or heavy rain expected';
}

function classifyGeneralCondition(
  tempMeanC: number,
  tempMinAvgC: number,
  tempMaxAvgC: number,
  avgDailyRainMm: number,
  rainySignalPct?: number,
  dominantWmoLabel?: string
): string {
  if (dominantWmoLabel) {
    return dominantWmoLabel;
  }
  const tempDesc =
    tempMaxAvgC >= 33
      ? 'Hot'
      : tempMeanC >= 24
        ? 'Warm'
        : tempMeanC >= 16
          ? 'Mild & pleasant'
          : tempMinAvgC <= 4
            ? 'Cold'
            : 'Cool';

  const pct = rainySignalPct ?? 0;
  const rainDesc =
    avgDailyRainMm >= 5 || pct >= 55
      ? 'with frequent showers'
      : avgDailyRainMm >= 1 || pct >= 22
        ? 'with occasional light rain possible'
        : 'and largely dry';

  return `${tempDesc} ${rainDesc}`;
}

function buildTravelRecommendation(
  tempMinAvgC: number,
  tempMaxAvgC: number,
  avgDailyRainMm: number,
  rainySignalPct?: number
): string {
  let clothingTip: string;
  if (tempMinAvgC <= 5) {
    clothingTip =
      'Pack thermal layers, a warm insulated jacket, woollens, and windproof outerwear for cold mornings and nights.';
  } else if (tempMinAvgC <= 14) {
    clothingTip =
      'Carry a warm sweater or fleece jacket for chilly evenings along with comfortable daytime layers.';
  } else if (tempMaxAvgC >= 33) {
    clothingTip =
      'Pack breathable cotton clothing, sun protection, and carry water to stay comfortable during peak afternoon warmth.';
  } else {
    clothingTip =
      'Light, breathable layers with a light evening wrap should keep your group comfortable throughout the day.';
  }

  const wetSignal = avgDailyRainMm >= 2.5 || (rainySignalPct ?? 0) >= 35;
  const lightWetSignal = avgDailyRainMm >= 0.8 || (rainySignalPct ?? 0) >= 20;

  if (wetSignal) {
    return `${clothingTip} Keep a compact umbrella, waterproof footwear, and flexible indoor backup plans ready.`;
  }
  if (lightWetSignal) {
    return `${clothingTip} A compact packable rain layer is useful in case of brief passing showers.`;
  }
  return `${clothingTip} Conditions look favourable for outdoor sightseeing and day excursions.`;
}

function safeHistoricalDate(targetYear: number, monthDay: string): string {
  if (monthDay === '02-29') {
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
    return `${targetYear}-${isLeap ? '02-29' : '02-28'}`;
  }
  return `${targetYear}-${monthDay}`;
}

async function fetchSeasonalOutlook(
  lat: number,
  lon: number,
  departureDate: string,
  returnDate: string
): Promise<WeatherForecastData | null> {
  try {
    const queryParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      daily: 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
      start_date: departureDate,
      end_date: returnDate,
      timezone: 'auto',
    });

    const url = `https://seasonal-api.open-meteo.com/v1/seasonal?${queryParams.toString()}`;
    const res = await fetchWithTimeout(url, {}, 8500);
    if (!res.ok) return null;

    const json = (await res.json()) as {
      timezone?: string;
      daily?: Record<string, Array<number | string | null>>;
    };

    const daily = json.daily;
    if (!daily || !Array.isArray(daily.time) || daily.time.length === 0) {
      return null;
    }

    const maxVals: number[] = [];
    const minVals: number[] = [];
    const meanVals: number[] = [];
    const memberRainDailyMeans: number[] = [];
    const memberRainTotals: number[] = [];
    let rainyDayCount = 0;
    let totalRainSamples = 0;
    let ensembleMembers = 0;

    for (const [key, series] of Object.entries(daily)) {
      if (!Array.isArray(series)) continue;

      if (key === 'temperature_2m_max' || key.startsWith('temperature_2m_max_member')) {
        let hasValid = false;
        for (const v of series) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            maxVals.push(v);
            hasValid = true;
          }
        }
        if (hasValid) ensembleMembers += 1;
      } else if (key === 'temperature_2m_min' || key.startsWith('temperature_2m_min_member')) {
        for (const v of series) {
          if (typeof v === 'number' && Number.isFinite(v)) minVals.push(v);
        }
      } else if (key === 'temperature_2m_mean' || key.startsWith('temperature_2m_mean_member')) {
        for (const v of series) {
          if (typeof v === 'number' && Number.isFinite(v)) meanVals.push(v);
        }
      } else if (key === 'precipitation_sum' || key.startsWith('precipitation_sum_member')) {
        const cleanRain: number[] = [];
        for (const v of series) {
          if (typeof v === 'number' && Number.isFinite(v)) {
            const clamped = Math.max(0, v);
            cleanRain.push(clamped);
            totalRainSamples += 1;
            if (clamped >= 1.0) rainyDayCount += 1;
          }
        }
        if (cleanRain.length > 0) {
          const sum = cleanRain.reduce((a, b) => a + b, 0);
          memberRainDailyMeans.push(sum / cleanRain.length);
          memberRainTotals.push(sum);
        }
      }
    }

    if (maxVals.length === 0 || minVals.length === 0) {
      return null;
    }

    const sortedMins = [...minVals].sort((a, b) => a - b);
    const sortedMaxs = [...maxVals].sort((a, b) => a - b);

    const tempMinAvgC = Math.round(averageNums(minVals));
    const tempMaxAvgC = Math.round(averageNums(maxVals));
    const tempMeanAvgC =
      meanVals.length > 0
        ? Math.round(averageNums(meanVals) * 10) / 10
        : Math.round(((tempMinAvgC + tempMaxAvgC) / 2) * 10) / 10;

    const tempRangeLowC = Math.round(percentileNums(sortedMins, 0.1));
    const tempRangeHighC = Math.round(percentileNums(sortedMaxs, 0.9));

    const avgDailyPrecipitationMm =
      memberRainDailyMeans.length > 0
        ? Math.round(averageNums(memberRainDailyMeans) * 10) / 10
        : 0;
    const totalPeriodPrecipitationMm =
      memberRainTotals.length > 0
        ? Math.round(averageNums(memberRainTotals) * 10) / 10
        : 0;
    const rainySignalPct =
      totalRainSamples > 0 ? Math.round((rainyDayCount / totalRainSamples) * 100) : 0;

    const rainfallTrend = classifyRainfallTrend(avgDailyPrecipitationMm, rainySignalPct);
    const generalCondition = classifyGeneralCondition(
      tempMeanAvgC,
      tempMinAvgC,
      tempMaxAvgC,
      avgDailyPrecipitationMm,
      rainySignalPct
    );
    const travelRecommendation = buildTravelRecommendation(
      tempMinAvgC,
      tempMaxAvgC,
      avgDailyPrecipitationMm,
      rainySignalPct
    );

    return {
      available: true,
      mode: 'seasonal',
      outOfRange: false,
      partialCoverage: false,
      limitationNote:
        'Based on long-range seasonal ensemble climate models for your selected travel dates. Seasonal outlooks show broad temperature and rainfall trends and naturally carry forecast uncertainty rather than day-by-day guarantees.',
      timezone: json.timezone,
      days: [],
      trendSummary: {
        tempMinAvgC,
        tempMaxAvgC,
        tempMeanAvgC,
        tempRangeLowC,
        tempRangeHighC,
        avgDailyPrecipitationMm,
        totalPeriodPrecipitationMm,
        rainySignalPct,
        rainfallTrend,
        generalCondition,
        travelRecommendation,
        ensembleMembers: ensembleMembers > 0 ? ensembleMembers : undefined,
      },
      source: 'Open-Meteo Seasonal Forecast',
    };
  } catch {
    return null;
  }
}

async function fetchHistoricalClimateAverages(
  lat: number,
  lon: number,
  departureDate: string,
  returnDate: string,
  todayIso: string,
  fallbackFromSeasonal = false
): Promise<WeatherForecastData | null> {
  const tripDays = Math.max(1, diffDaysIso(departureDate, returnDate) + 1);
  const depYear = Number(departureDate.slice(0, 4));
  const monthDay = departureDate.slice(5);
  const latestSafeArchiveDate = addDaysIso(todayIso, -7);

  const windows: Array<{ year: number; start: string; end: string }> = [];
  for (let offset = 1; offset <= 7 && windows.length < 4; offset += 1) {
    const candidateYear = depYear - offset;
    const start = safeHistoricalDate(candidateYear, monthDay);
    const end = addDaysIso(start, tripDays - 1);
    if (end <= latestSafeArchiveDate) {
      windows.push({ year: candidateYear, start, end });
    }
  }

  if (windows.length === 0) return null;

  const responses = await Promise.allSettled(
    windows.map(async (w) => {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        start_date: w.start,
        end_date: w.end,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum',
        timezone: 'auto',
      });
      const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;
      const res = await fetchWithTimeout(url, {}, 8000);
      if (!res.ok) throw new Error(`Archive HTTP ${res.status}`);
      const json = (await res.json()) as {
        timezone?: string;
        daily?: {
          weather_code?: Array<number | null>;
          temperature_2m_max?: Array<number | null>;
          temperature_2m_min?: Array<number | null>;
          temperature_2m_mean?: Array<number | null>;
          precipitation_sum?: Array<number | null>;
        };
      };
      return { year: w.year, json };
    })
  );

  const maxVals: number[] = [];
  const minVals: number[] = [];
  const meanVals: number[] = [];
  const rainVals: number[] = [];
  const wmoCodes: number[] = [];
  const yearsAnalyzed: number[] = [];
  let timezone: string | undefined;

  for (const r of responses) {
    if (r.status !== 'fulfilled') continue;
    const { year, json } = r.value;
    if (!timezone && json.timezone) timezone = json.timezone;
    const d = json.daily;
    if (!d) continue;

    let yearHasData = false;
    for (const v of d.temperature_2m_max ?? []) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        maxVals.push(v);
        yearHasData = true;
      }
    }
    for (const v of d.temperature_2m_min ?? []) {
      if (typeof v === 'number' && Number.isFinite(v)) minVals.push(v);
    }
    for (const v of d.temperature_2m_mean ?? []) {
      if (typeof v === 'number' && Number.isFinite(v)) meanVals.push(v);
    }
    for (const v of d.precipitation_sum ?? []) {
      if (typeof v === 'number' && Number.isFinite(v)) rainVals.push(Math.max(0, v));
    }
    for (const c of d.weather_code ?? []) {
      if (typeof c === 'number' && Number.isFinite(c)) wmoCodes.push(c);
    }

    if (yearHasData) yearsAnalyzed.push(year);
  }

  if (maxVals.length === 0 || minVals.length === 0) {
    return null;
  }

  yearsAnalyzed.sort((a, b) => a - b);

  const sortedMins = [...minVals].sort((a, b) => a - b);
  const sortedMaxs = [...maxVals].sort((a, b) => a - b);

  const tempMinAvgC = Math.round(averageNums(minVals));
  const tempMaxAvgC = Math.round(averageNums(maxVals));
  const tempMeanAvgC =
    meanVals.length > 0
      ? Math.round(averageNums(meanVals) * 10) / 10
      : Math.round(((tempMinAvgC + tempMaxAvgC) / 2) * 10) / 10;

  const tempRangeLowC = Math.round(percentileNums(sortedMins, 0.1));
  const tempRangeHighC = Math.round(percentileNums(sortedMaxs, 0.9));

  const avgDailyPrecipitationMm =
    rainVals.length > 0 ? Math.round(averageNums(rainVals) * 10) / 10 : 0;
  const totalPeriodPrecipitationMm = Math.round(avgDailyPrecipitationMm * tripDays * 10) / 10;
  const rainyDays = rainVals.filter((v) => v >= 1.0).length;
  const rainySignalPct =
    rainVals.length > 0 ? Math.round((rainyDays / rainVals.length) * 100) : 0;

  // Determine dominant observed historical condition
  let dominantWmoLabel: string | undefined;
  if (wmoCodes.length > 0) {
    const hasSnow = wmoCodes.filter((c) => (c >= 71 && c <= 77) || c === 85 || c === 86).length;
    const hasRain = wmoCodes.filter((c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95).length;
    const clearOrPartly = wmoCodes.filter((c) => c <= 2).length;
    const snowShare = hasSnow / wmoCodes.length;
    const rainShare = hasRain / wmoCodes.length;
    const clearShare = clearOrPartly / wmoCodes.length;

    if (snowShare >= 0.25) {
      dominantWmoLabel = 'Snowfall or wintry mix common in past years';
    } else if (rainShare >= 0.45) {
      dominantWmoLabel = 'Frequent rain showers in past years';
    } else if (rainShare >= 0.2) {
      dominantWmoLabel = 'Mix of clear periods and occasional showers';
    } else if (clearShare >= 0.55) {
      dominantWmoLabel = 'Mostly clear to partly cloudy historically';
    } else {
      dominantWmoLabel = 'Partly cloudy to overcast historically';
    }
  }

  const rainfallTrend = classifyRainfallTrend(avgDailyPrecipitationMm, rainySignalPct);
  const generalCondition = classifyGeneralCondition(
    tempMeanAvgC,
    tempMinAvgC,
    tempMaxAvgC,
    avgDailyPrecipitationMm,
    rainySignalPct,
    dominantWmoLabel
  );
  const travelRecommendation = buildTravelRecommendation(
    tempMinAvgC,
    tempMaxAvgC,
    avgDailyPrecipitationMm,
    rainySignalPct
  );

  const yearsText = yearsAnalyzed.join(', ');
  const prefix = fallbackFromSeasonal
    ? 'Seasonal outlook data was unavailable for these dates, so we calculated historical averages instead. '
    : '';

  return {
    available: true,
    mode: 'historical',
    outOfRange: true,
    partialCoverage: false,
    limitationNote: `${prefix}Calculated from recorded weather on matching calendar dates across ${yearsText}. These are typical historical climate patterns, not a weather forecast for your specific trip.`,
    timezone,
    days: [],
    trendSummary: {
      tempMinAvgC,
      tempMaxAvgC,
      tempMeanAvgC,
      tempRangeLowC,
      tempRangeHighC,
      avgDailyPrecipitationMm,
      totalPeriodPrecipitationMm,
      rainySignalPct,
      rainfallTrend,
      generalCondition,
      travelRecommendation,
      yearsAnalyzed,
    },
    source: 'Open-Meteo Historical Archive',
  };
}

export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  departureDate: string,
  returnDate: string
): Promise<WeatherForecastData> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const cacheKey = `weather:${todayIso}:${lat.toFixed(3)},${lon.toFixed(3)}:${departureDate}:${returnDate}`;
  const cached = apiCache.get<WeatherForecastData>(cacheKey);
  if (cached) return cached;

  const maxForecastIso = addDaysIso(todayIso, 15);
  const leadDays = diffDaysIso(todayIso, departureDate);

  // Tier B (17 to ~60 days): Seasonal Weather Outlook with fallback to Historical Climate Averages
  if (departureDate > maxForecastIso && leadDays <= 65) {
    const seasonal = await fetchSeasonalOutlook(lat, lon, departureDate, returnDate);
    if (seasonal) {
      apiCache.set(cacheKey, seasonal, 6 * 60 * 60 * 1000);
      return seasonal;
    }

    const historicalFallback = await fetchHistoricalClimateAverages(
      lat,
      lon,
      departureDate,
      returnDate,
      todayIso,
      true
    );
    if (historicalFallback) {
      apiCache.set(cacheKey, historicalFallback, 24 * 60 * 60 * 1000);
      return historicalFallback;
    }

    return {
      available: false,
      mode: 'unavailable',
      outOfRange: true,
      partialCoverage: false,
      reason: 'Weather outlook could not be loaded for these future dates right now.',
      days: [],
      source: 'Open-Meteo',
    };
  }

  // Tier C (> ~60 days ahead): Historical Climate Averages
  if (departureDate > maxForecastIso) {
    const historical = await fetchHistoricalClimateAverages(
      lat,
      lon,
      departureDate,
      returnDate,
      todayIso,
      false
    );
    if (historical) {
      apiCache.set(cacheKey, historical, 24 * 60 * 60 * 1000);
      return historical;
    }

    return {
      available: false,
      mode: 'unavailable',
      outOfRange: true,
      partialCoverage: false,
      reason: 'Historical climate averages could not be retrieved right now. Please try again shortly.',
      days: [],
      source: 'Open-Meteo',
    };
  }

  // Tier A (0–16 days): Standard Daily Weather Forecast
  const overlapStart = departureDate > todayIso ? departureDate : todayIso;
  const overlapEnd = returnDate < maxForecastIso ? returnDate : maxForecastIso;
  const hasForecastOverlap =
    overlapStart <= overlapEnd && returnDate >= todayIso && departureDate <= maxForecastIso;

  try {
    const queryParams = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,weather_code,wind_speed_10m',
      timezone: 'auto',
    });

    if (hasForecastOverlap) {
      queryParams.set(
        'daily',
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum'
      );
      queryParams.set('start_date', overlapStart);
      queryParams.set('end_date', overlapEnd);
    }

    const url = `https://api.open-meteo.com/v1/forecast?${queryParams.toString()}`;
    const res = await fetchWithTimeout(url, {}, 7500);

    if (!res.ok) {
      return {
        available: false,
        mode: 'unavailable',
        outOfRange: false,
        partialCoverage: false,
        reason: 'Weather forecast is currently unavailable.',
        days: [],
        source: 'Open-Meteo',
      };
    }

    const json = (await res.json()) as {
      timezone?: string;
      current?: {
        time: string;
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max?: Array<number | null>;
        precipitation_sum?: Array<number | null>;
      };
    };

    const current: CurrentWeatherSnapshot | undefined = json.current
      ? {
          temperatureC: Math.round(json.current.temperature_2m * 10) / 10,
          weatherCode: json.current.weather_code,
          weatherLabel: describeWeatherCode(json.current.weather_code),
          windSpeedKmh: Math.round(json.current.wind_speed_10m),
          observedAt: json.current.time,
        }
      : undefined;

    const days: WeatherDay[] = [];
    const dailyMaxs: number[] = [];
    const dailyMins: number[] = [];
    const dailyPrecipMm: number[] = [];
    const dailyRainProbs: number[] = [];

    if (json.daily && Array.isArray(json.daily.time)) {
      for (let i = 0; i < json.daily.time.length; i += 1) {
        const code = json.daily.weather_code?.[i] ?? 0;
        const maxT = json.daily.temperature_2m_max[i];
        const minT = json.daily.temperature_2m_min[i];
        const prob = json.daily.precipitation_probability_max?.[i] ?? null;
        const pMm = json.daily.precipitation_sum?.[i] ?? null;

        if (typeof maxT === 'number') dailyMaxs.push(maxT);
        if (typeof minT === 'number') dailyMins.push(minT);
        if (typeof prob === 'number') dailyRainProbs.push(prob);
        if (typeof pMm === 'number') dailyPrecipMm.push(Math.max(0, pMm));

        days.push({
          date: json.daily.time[i],
          weatherCode: code,
          weatherLabel: describeWeatherCode(code),
          tempMaxC: Math.round(maxT),
          tempMinC: Math.round(minT),
          precipitationProbabilityMax: prob,
        });
      }
    }

    let trendSummary: WeatherForecastData['trendSummary'];
    if (days.length > 0 && dailyMaxs.length > 0 && dailyMins.length > 0) {
      const tempMinAvgC = Math.round(averageNums(dailyMins));
      const tempMaxAvgC = Math.round(averageNums(dailyMaxs));
      const avgRainMm =
        dailyPrecipMm.length > 0 ? Math.round(averageNums(dailyPrecipMm) * 10) / 10 : 0;
      const totalRainMm =
        dailyPrecipMm.length > 0
          ? Math.round(dailyPrecipMm.reduce((a, b) => a + b, 0) * 10) / 10
          : 0;
      const maxProb = dailyRainProbs.length > 0 ? Math.max(...dailyRainProbs) : undefined;
      const avgProb =
        dailyRainProbs.length > 0 ? Math.round(averageNums(dailyRainProbs)) : undefined;

      const labelCounts = new Map<string, number>();
      for (const d of days) {
        labelCounts.set(d.weatherLabel, (labelCounts.get(d.weatherLabel) ?? 0) + 1);
      }
      const dominantLabel =
        [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? days[0].weatherLabel;

      const rainTrend =
        maxProb !== undefined && maxProb >= 60
          ? `Higher rain risk (up to ${maxProb}% daily chance)`
          : maxProb !== undefined && maxProb >= 30
            ? `Chance of light showers (up to ${maxProb}% daily chance)`
            : classifyRainfallTrend(avgRainMm, avgProb);

      trendSummary = {
        tempMinAvgC,
        tempMaxAvgC,
        tempRangeLowC: Math.round(Math.min(...dailyMins)),
        tempRangeHighC: Math.round(Math.max(...dailyMaxs)),
        avgDailyPrecipitationMm: avgRainMm,
        totalPeriodPrecipitationMm: totalRainMm,
        rainySignalPct: maxProb,
        rainfallTrend: rainTrend,
        generalCondition: dominantLabel,
        travelRecommendation: buildTravelRecommendation(tempMinAvgC, tempMaxAvgC, avgRainMm, maxProb),
      };
    }

    const partialCoverage =
      hasForecastOverlap && (departureDate < todayIso || returnDate > maxForecastIso);

    const limitationNote = partialCoverage
      ? `Short-range daily forecasts cover dates through ${maxForecastIso}; later dates in your trip are beyond the 16-day meteorological forecast window.`
      : 'Based on short-range meteorological forecast models for your destination and travel dates.';

    const result: WeatherForecastData = {
      available: true,
      mode: 'forecast',
      outOfRange: !hasForecastOverlap,
      partialCoverage,
      limitationNote,
      timezone: json.timezone,
      current,
      days,
      trendSummary,
      source: 'Open-Meteo Weather Forecast',
    };

    apiCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (error) {
    return {
      available: false,
      mode: 'unavailable',
      outOfRange: false,
      partialCoverage: false,
      reason:
        error instanceof Error && error.name === 'AbortError'
          ? 'Weather request timed out. Please try again shortly.'
          : 'Weather forecast is temporarily unavailable.',
      days: [],
      source: 'Open-Meteo',
    };
  }
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504]);
const inflightPlaces = new Map<string, Promise<NearbyPlacesData>>();

function buildSearchBounds(lat: number, lon: number, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLon = radiusKm / (111.32 * cosLat);

  const south = Number((lat - dLat).toFixed(4));
  const north = Number((lat + dLat).toFixed(4));
  const west = Number((lon - dLon).toFixed(4));
  const east = Number((lon + dLon).toFixed(4));

  return {
    overpassBbox: `${south},${west},${north},${east}`,
    nominatimViewbox: `${west},${north},${east},${south}`,
  };
}

function formatOsmTagsAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags['addr:housename'],
    tags['addr:street'],
    tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:locality'],
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);

  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.join(', ') : undefined;
}

function formatNominatimAddress(
  addr: Record<string, string | undefined> | undefined,
  placeName: string
): string | undefined {
  if (!addr) return undefined;
  const lowerName = placeName.toLowerCase();
  const candidates = [
    addr.road,
    addr.neighbourhood || addr.suburb || addr.residential || addr.hamlet,
    addr.village || addr.town || addr.city,
    addr.state_district,
  ]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => Boolean(p) && p.toLowerCase() !== lowerName);

  const unique = [...new Set(candidates)];
  return unique.length > 0 ? unique.slice(0, 3).join(', ') : undefined;
}

function classifyOsmElement(el: OverpassElement): OsmPlace | null {
  const tags = el.tags;
  if (!tags || !tags.name) return null;
  const name = tags.name.trim();
  if (name.length < 2) return null;

  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const isFood =
    tags.amenity === 'restaurant' ||
    tags.amenity === 'cafe' ||
    tags.amenity === 'fast_food' ||
    tags.amenity === 'food_court' ||
    tags.amenity === 'ice_cream';

  const category =
    tags.tourism ||
    tags.historic ||
    tags.natural ||
    tags.leisure ||
    tags.amenity ||
    'place';

  return {
    id: `${el.type}-${el.id}`,
    name,
    kind: isFood ? 'food' : 'attraction',
    category: category.replace(/_/g, ' '),
    cuisine: tags.cuisine ? tags.cuisine.replace(/;/g, ', ').replace(/_/g, ' ') : undefined,
    address: formatOsmTagsAddress(tags),
    lat,
    lon,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

function buildOverpassQuery(overpassBbox: string): string {
  return `
[out:json][timeout:5];
(
  node["tourism"~"^(attraction|museum|viewpoint|gallery|theme_park|zoo)$"]["name"](${overpassBbox});
  way["tourism"~"^(attraction|museum|viewpoint|gallery)$"]["name"](${overpassBbox});
  node["historic"~"^(monument|fort|castle|memorial|ruins|archaeological_site)$"]["name"](${overpassBbox});
  way["historic"~"^(monument|fort|castle|memorial|ruins)$"]["name"](${overpassBbox});
  node["leisure"~"^(park|garden|nature_reserve)$"]["name"](${overpassBbox});
  node["natural"~"^(beach|waterfall|peak)$"]["name"](${overpassBbox});
  node["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]["name"](${overpassBbox});
);
out center 60;
`.trim();
}

async function querySingleOverpassEndpoint(
  endpoint: string,
  query: string,
  maxAttempts: number,
  timeoutMs: number
): Promise<OverpassElement[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Accept: 'application/json',
            'User-Agent': NOMINATIM_USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        timeoutMs
      );

      if (!res.ok) {
        const err = new Error(`Overpass HTTP ${res.status}`);
        if (RETRYABLE_HTTP_STATUSES.has(res.status) && attempt < maxAttempts) {
          lastError = err;
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        throw err;
      }

      const data = (await res.json()) as { elements?: OverpassElement[] };
      return Array.isArray(data.elements) ? data.elements : [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Overpass request failed');
}

async function queryOverpassWithFallback(radiusKm: number, lat: number, lon: number): Promise<OverpassElement[] | null> {
  const { overpassBbox } = buildSearchBounds(lat, lon, radiusKm);
  const query = buildOverpassQuery(overpassBbox);

  // Primary endpoint gets 1 controlled retry; fallback mirrors get 1 fast attempt each
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i += 1) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    const maxAttempts = i === 0 ? 2 : 1;
    const timeoutMs = i === 0 ? 4500 : 4000;
    try {
      return await querySingleOverpassEndpoint(endpoint, query, maxAttempts, timeoutMs);
    } catch {
      continue;
    }
  }

  return null;
}

function mergeDeduplicatedPlaces(
  incoming: OsmPlace[],
  seenNames: Set<string>,
  attractions: OsmPlace[],
  food: OsmPlace[]
): void {
  for (const place of incoming) {
    const key = place.name.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);

    if (place.kind === 'attraction' && attractions.length < 14) {
      attractions.push(place);
    } else if (place.kind === 'food' && food.length < 12) {
      food.push(place);
    }
  }
}

interface NominatimPoiResult {
  osm_type?: string;
  osm_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  address?: Record<string, string | undefined>;
}

async function queryNominatimPlacesForRadius(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<OsmPlace[]> {
  const { nominatimViewbox } = buildSearchBounds(lat, lon, radiusKm);
  const queries: Array<{ tag: string; kind: 'attraction' | 'food'; limit: number }> = [
    { tag: '[tourism=attraction]', kind: 'attraction', limit: 8 },
    { tag: '[historic=monument]', kind: 'attraction', limit: 6 },
    { tag: '[leisure=park]', kind: 'attraction', limit: 6 },
    { tag: '[amenity=restaurant]', kind: 'food', limit: 8 },
    { tag: '[amenity=cafe]', kind: 'food', limit: 6 },
  ];

  const places: OsmPlace[] = [];

  for (const q of queries) {
    try {
      await waitForNominatimSlot();
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        q.tag
      )}&viewbox=${nominatimViewbox}&bounded=1&limit=${q.limit}&addressdetails=1`;

      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            'User-Agent': NOMINATIM_USER_AGENT,
            'Accept-Language': 'en',
          },
        },
        6000
      );

      if (!res.ok) continue;
      const items = (await res.json()) as NominatimPoiResult[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const rawName = (item.name || '').trim();
        if (rawName.length < 2) continue;

        const osmType =
          item.osm_type === 'way' || item.osm_type === 'relation' ? item.osm_type : 'node';
        if (typeof item.osm_id !== 'number') continue;

        const itemLat = Number(item.lat);
        const itemLon = Number(item.lon);
        if (!Number.isFinite(itemLat) || !Number.isFinite(itemLon)) continue;

        const categoryLabel = (item.type || item.category || (q.kind === 'food' ? 'restaurant' : 'attraction')).replace(
          /_/g,
          ' '
        );

        places.push({
          id: `${osmType}-${item.osm_id}`,
          name: rawName,
          kind: q.kind,
          category: categoryLabel,
          address: formatNominatimAddress(item.address, rawName),
          lat: itemLat,
          lon: itemLon,
          osmUrl: `https://www.openstreetmap.org/${osmType}/${item.osm_id}`,
        });
      }
    } catch {
      continue;
    }
  }

  return places;
}

export async function fetchNearbyPlaces(lat: number, lon: number): Promise<NearbyPlacesData> {
  const cacheKey = `osm-places:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = apiCache.get<NearbyPlacesData>(cacheKey);
  if (cached) return cached;

  const existing = inflightPlaces.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<NearbyPlacesData> => {
    try {
      const seenNames = new Set<string>();
      const attractions: OsmPlace[] = [];
      const food: OsmPlace[] = [];

      // 1. Primary Overpass API lookup starting at 5 km radius
      let overpassWorked = false;
      const initialElements = await queryOverpassWithFallback(5, lat, lon);
      if (initialElements !== null) {
        overpassWorked = true;
        const parsed = initialElements.map(classifyOsmElement).filter((p): p is OsmPlace => p !== null);
        mergeDeduplicatedPlaces(parsed, seenNames, attractions, food);

        // Expand radius to 12 km if too few results found within 5 km
        if (attractions.length + food.length < 6) {
          const expandedElements = await queryOverpassWithFallback(12, lat, lon);
          if (expandedElements !== null) {
            const expandedParsed = expandedElements
              .map(classifyOsmElement)
              .filter((p): p is OsmPlace => p !== null);
            mergeDeduplicatedPlaces(expandedParsed, seenNames, attractions, food);
          }
        }
      }

      // 2. If all Overpass endpoints are temporarily busy/unavailable, query OpenStreetMap Nominatim POIs
      if (!overpassWorked) {
        const nomPlaces5Km = await queryNominatimPlacesForRadius(lat, lon, 5);
        mergeDeduplicatedPlaces(nomPlaces5Km, seenNames, attractions, food);

        if (attractions.length + food.length < 6) {
          const nomPlaces12Km = await queryNominatimPlacesForRadius(lat, lon, 12);
          mergeDeduplicatedPlaces(nomPlaces12Km, seenNames, attractions, food);
        }
      }

      const combined = [...attractions, ...food];
      if (combined.length === 0) {
        return {
          available: false,
          reason: overpassWorked
            ? 'No nearby attractions or eateries were found in this area.'
            : 'We’re unable to load nearby recommendations right now. Please try again shortly.',
          places: [],
          attribution: OSM_ATTRIBUTION,
        };
      }

      const result: NearbyPlacesData = {
        available: true,
        places: combined,
        attribution: OSM_ATTRIBUTION,
      };
      apiCache.set(cacheKey, result, 6 * 60 * 60 * 1000);
      return result;
    } catch {
      return {
        available: false,
        reason: 'We’re unable to load nearby recommendations right now. Please try again shortly.',
        places: [],
        attribution: OSM_ATTRIBUTION,
      };
    } finally {
      inflightPlaces.delete(cacheKey);
    }
  })();

  inflightPlaces.set(cacheKey, promise);
  return promise;
}
