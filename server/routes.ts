import { Router } from 'express';
import type {
  RegenerateDayRequest,
  TravelPreference,
  TripInterest,
  TripPlanRequest,
} from '../src/types/trip.ts';
import {
  fetchNearbyPlaces,
  fetchWeatherForecast,
  geocodeDestination,
} from './externalData.ts';
import { generateFullItinerary, regenerateSingleDay } from './geminiService.ts';

export const apiRouter = Router();

const VALID_PREFERENCES = new Set<TravelPreference>(['Budget', 'Standard', 'Premium']);
const VALID_INTERESTS = new Set<TripInterest>([
  'Beaches',
  'Adventure',
  'Food',
  'Shopping',
  'Nature',
  'Nightlife',
  'Sightseeing',
]);

function countDaysInclusive(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validateTripRequest(body: Partial<TripPlanRequest>): {
  valid: boolean;
  error?: string;
  sanitized?: TripPlanRequest;
  totalDays?: number;
} {
  const startingCity = typeof body.startingCity === 'string' ? body.startingCity.trim() : '';
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
  const departureDate = typeof body.departureDate === 'string' ? body.departureDate.trim() : '';
  const returnDate = typeof body.returnDate === 'string' ? body.returnDate.trim() : '';
  const budgetInr = Number(body.budgetInr);
  const travelers = Number(body.travelers);
  const preference = body.preference as TravelPreference;
  const interests = Array.isArray(body.interests)
    ? body.interests.filter((i): i is TripInterest => VALID_INTERESTS.has(i as TripInterest))
    : [];

  if (startingCity.length < 2) {
    return { valid: false, error: 'Please enter a valid starting city (at least 2 characters).' };
  }
  if (destination.length < 2) {
    return { valid: false, error: 'Please enter a valid destination (at least 2 characters).' };
  }
  if (!isValidIsoDate(departureDate) || !isValidIsoDate(returnDate)) {
    return { valid: false, error: 'Please select valid departure and return dates.' };
  }
  if (returnDate < departureDate) {
    return { valid: false, error: 'Return date must be on or after the departure date.' };
  }

  const totalDays = countDaysInclusive(departureDate, returnDate);
  if (totalDays < 1 || totalDays > 14) {
    return {
      valid: false,
      error: 'Trip duration must be between 1 and 14 days for detailed day-wise planning.',
    };
  }

  if (!Number.isFinite(budgetInr) || budgetInr < 500 || budgetInr > 10000000) {
    return { valid: false, error: 'Please enter a realistic total budget between ₹500 and ₹1,00,00,000.' };
  }

  if (!Number.isInteger(travelers) || travelers < 1 || travelers > 25) {
    return { valid: false, error: 'Number of travellers must be between 1 and 25.' };
  }

  if (!VALID_PREFERENCES.has(preference)) {
    return { valid: false, error: 'Travel preference must be Budget, Standard, or Premium.' };
  }

  return {
    valid: true,
    totalDays,
    sanitized: {
      startingCity,
      destination,
      departureDate,
      returnDate,
      budgetInr: Math.round(budgetInr),
      travelers,
      preference,
      interests,
    },
  };
}

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TripGenie API' });
});

// Fast itinerary generation: executes Gemini directly without waiting for external map/weather APIs
apiRouter.post('/plan-trip', async (req, res) => {
  const validation = validateTripRequest(req.body);
  if (!validation.valid || !validation.sanitized || !validation.totalDays) {
    res.status(400).json({ error: validation.error || 'Invalid trip request.' });
    return;
  }

  const tripReq = validation.sanitized;

  try {
    const aiGeneratedPlan = await generateFullItinerary(tripReq);
    res.json({
      request: tripReq,
      totalDays: validation.totalDays,
      generatedAt: new Date().toISOString(),
      aiGeneratedPlan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while planning trip.';
    const status = message.includes('GEMINI_API_KEY')
      ? 500
      : message.includes('too long')
        ? 504
        : 502;
    res.status(status).json({ error: message });
  }
});

// Independent live weather endpoint
apiRouter.get('/weather', async (req, res) => {
  const destination = typeof req.query.destination === 'string' ? req.query.destination.trim() : '';
  const departureDate = typeof req.query.departureDate === 'string' ? req.query.departureDate.trim() : '';
  const returnDate = typeof req.query.returnDate === 'string' ? req.query.returnDate.trim() : '';

  if (destination.length < 2 || !isValidIsoDate(departureDate) || !isValidIsoDate(returnDate)) {
    res.status(400).json({ error: 'Invalid weather query parameters.' });
    return;
  }

  const location = await geocodeDestination(destination);
  if (!location.available || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    res.json({
      location,
      weather: {
        available: false,
        mode: 'unavailable',
        outOfRange: false,
        partialCoverage: false,
        reason: location.reason || 'Weather could not be loaded because destination details were unavailable.',
        days: [],
        source: 'Open-Meteo',
      },
    });
    return;
  }

  const weather = await fetchWeatherForecast(location.lat, location.lon, departureDate, returnDate);
  res.json({ location, weather });
});

// Independent nearby attractions & eateries endpoint
apiRouter.get('/places', async (req, res) => {
  const destination = typeof req.query.destination === 'string' ? req.query.destination.trim() : '';
  if (destination.length < 2) {
    res.status(400).json({ error: 'Invalid destination parameter.' });
    return;
  }

  const location = await geocodeDestination(destination);
  if (!location.available || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
    res.json({
      location,
      nearbyPlaces: {
        available: false,
        reason: location.reason || 'We’re unable to load nearby recommendations right now. Please try again shortly.',
        places: [],
        attribution: '© OpenStreetMap contributors',
      },
    });
    return;
  }

  const nearbyPlaces = await fetchNearbyPlaces(location.lat, location.lon);
  res.json({ location, nearbyPlaces });
});

apiRouter.post('/regenerate-day', async (req, res) => {
  const body = req.body as Partial<RegenerateDayRequest>;
  if (!body.tripRequest || typeof body.dayNumber !== 'number' || !body.date) {
    res.status(400).json({ error: 'Missing required fields to regenerate day.' });
    return;
  }

  const validation = validateTripRequest(body.tripRequest);
  if (!validation.valid || !validation.sanitized) {
    res.status(400).json({ error: validation.error || 'Invalid trip parameters.' });
    return;
  }

  try {
    const day = await regenerateSingleDay({
      tripRequest: validation.sanitized,
      dayNumber: body.dayNumber,
      date: body.date,
      existingDayTitle: body.existingDayTitle || '',
      otherDayTitles: Array.isArray(body.otherDayTitles) ? body.otherDayTitles : [],
      customFocus: typeof body.customFocus === 'string' ? body.customFocus.trim().slice(0, 180) : undefined,
      weatherForDay: body.weatherForDay ?? null,
      nearbyPlaces: Array.isArray(body.nearbyPlaces) ? body.nearbyPlaces : [],
    });

    res.json({ day });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to refresh this day right now.';
    res.status(502).json({ error: message });
  }
});
