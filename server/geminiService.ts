import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  AiGeneratedPlan,
  DayItinerary,
  RegenerateDayRequest,
  TripPlanRequest,
} from '../src/types/trip.ts';

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add a valid Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_PROMPT = `You are TripGenie AI, a travel planner for Indian students, young travellers, and budget groups.
Rules:
- All costs must be realistic integer estimates in Indian Rupees (INR) for ALL travellers combined.
- Tier style: Budget (sleeper/3AC trains, buses, hostels, scooters/autos, street food/thalis); Standard (AC trains/value flights, boutique/3-star stays, shared cabs/scooters, casual cafes); Premium (flights, private cabs, resorts, signature dining).
- Never invent live hotel deals, flight fares, ratings, or opening hours. Keep descriptions crisp (1–2 sentences per slot) and routes geographically logical.`;

const ACTIVITY_SLOT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    timeRange: { type: Type.STRING, description: 'e.g. 09:00 AM - 12:30 PM' },
    title: { type: Type.STRING },
    description: { type: Type.STRING, description: '1-2 concise practical sentences' },
    estimatedCostInr: { type: Type.INTEGER, description: 'Total INR estimate for all travellers' },
    transportTip: { type: Type.STRING, description: 'Short local commute tip' },
  },
  required: ['timeRange', 'title', 'description', 'estimatedCostInr', 'transportTip'],
};

const DAY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    dayNumber: { type: Type.INTEGER },
    date: { type: Type.STRING },
    title: { type: Type.STRING },
    theme: { type: Type.STRING },
    weatherAdvisory: { type: Type.STRING, description: 'Brief seasonal clothing/timing tip' },
    morning: ACTIVITY_SLOT_SCHEMA,
    afternoon: ACTIVITY_SLOT_SCHEMA,
    evening: ACTIVITY_SLOT_SCHEMA,
    foodRecommendation: { type: Type.STRING, description: 'Local dish or food area to try' },
    dailyBreakdownInr: {
      type: Type.OBJECT,
      properties: {
        foodInr: { type: Type.INTEGER },
        localTransportInr: { type: Type.INTEGER },
        activitiesInr: { type: Type.INTEGER },
        accommodationInr: { type: Type.INTEGER },
      },
      required: ['foodInr', 'localTransportInr', 'activitiesInr', 'accommodationInr'],
    },
    estimatedDailyExpenseInr: { type: Type.INTEGER },
  },
  required: [
    'dayNumber',
    'date',
    'title',
    'theme',
    'weatherAdvisory',
    'morning',
    'afternoon',
    'evening',
    'foodRecommendation',
    'dailyBreakdownInr',
    'estimatedDailyExpenseInr',
  ],
};

const TRIP_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tripTitle: { type: Type.STRING },
    overview: { type: Type.STRING, description: '2 concise sentences summarizing the trip' },
    intercityTravelNote: {
      type: Type.STRING,
      description: 'Concise train/bus/flight options from starting city without live prices',
    },
    localTransitTips: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 concise local transit tips',
    },
    packingChecklist: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '6 concise packing items',
    },
    budgetAdvice: {
      type: Type.STRING,
      description: '1-2 sentences on whether the target budget fits comfortably or needs adjustments',
    },
    days: {
      type: Type.ARRAY,
      items: DAY_SCHEMA,
    },
  },
  required: [
    'tripTitle',
    'overview',
    'intercityTravelNote',
    'localTransitTips',
    'packingChecklist',
    'budgetAdvice',
    'days',
  ],
};

function buildDateList(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const current = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  while (current <= end && dates.length < 14) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function normalizeDayMath(day: DayItinerary): DayItinerary {
  const food = Math.max(0, Math.round(day.dailyBreakdownInr?.foodInr || 0));
  const localTransport = Math.max(0, Math.round(day.dailyBreakdownInr?.localTransportInr || 0));
  const activities = Math.max(0, Math.round(day.dailyBreakdownInr?.activitiesInr || 0));
  const accommodation = Math.max(0, Math.round(day.dailyBreakdownInr?.accommodationInr || 0));
  const sum = food + localTransport + activities + accommodation;

  return {
    ...day,
    dailyBreakdownInr: {
      foodInr: food,
      localTransportInr: localTransport,
      activitiesInr: activities,
      accommodationInr: accommodation,
    },
    estimatedDailyExpenseInr: sum > 0 ? sum : Math.max(0, Math.round(day.estimatedDailyExpenseInr || 0)),
  };
}

export function recalculateBudgetFromDays(
  days: DayItinerary[],
  travelers: number,
  budgetAdvice: string
) {
  let foodInr = 0;
  let localTransportInr = 0;
  let activitiesInr = 0;
  let accommodationInr = 0;

  for (const d of days) {
    foodInr += d.dailyBreakdownInr.foodInr;
    localTransportInr += d.dailyBreakdownInr.localTransportInr;
    activitiesInr += d.dailyBreakdownInr.activitiesInr;
    accommodationInr += d.dailyBreakdownInr.accommodationInr;
  }

  const totalEstimatedInr = foodInr + localTransportInr + activitiesInr + accommodationInr;
  const perPersonInr = travelers > 0 ? Math.round(totalEstimatedInr / travelers) : totalEstimatedInr;

  return {
    foodInr,
    localTransportInr,
    activitiesInr,
    accommodationInr,
    totalEstimatedInr,
    perPersonInr,
    budgetAdvice,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateWithRetry<T>(fn: () => Promise<T>, retries = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      retries > 0 &&
      (message.includes('429') || message.includes('503') || message.includes('UNAVAILABLE'))
    ) {
      await new Promise((r) => setTimeout(r, 800));
      return generateWithRetry(fn, retries - 1);
    }
    throw err;
  }
}

export async function generateFullItinerary(req: TripPlanRequest): Promise<AiGeneratedPlan> {
  const ai = getGeminiClient();
  const dateList = buildDateList(req.departureDate, req.returnDate);
  const maxTokens = Math.min(8192, 1200 + dateList.length * 650);

  const userPrompt = `Create a ${dateList.length}-day itinerary:
Route: ${req.startingCity} -> ${req.destination}
Dates: ${dateList.join(', ')}
Group Budget: ₹${req.budgetInr.toLocaleString('en-IN')} INR total | Travellers: ${req.travelers} | Tier: ${req.preference}
Interests: ${req.interests.length > 0 ? req.interests.join(', ') : 'Sightseeing, Food'}
Return exactly ${dateList.length} day objects matching those dates with combined INR estimates for all ${req.travelers} traveller(s).`;

  const response = await generateWithRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: TRIP_PLAN_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: maxTokens,
        },
      }),
      28000,
      'Itinerary generation took too long. Please try again.'
    )
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Unable to generate an itinerary right now. Please try again.');
  }

  const parsed = JSON.parse(rawText) as {
    tripTitle?: string;
    overview?: string;
    intercityTravelNote?: string;
    localTransitTips?: string[];
    packingChecklist?: string[];
    budgetAdvice?: string;
    days?: DayItinerary[];
  };

  const normalizedDays = (parsed.days || []).map((day, idx) =>
    normalizeDayMath({
      ...day,
      dayNumber: idx + 1,
      date: dateList[idx] ?? day.date,
    })
  );

  const budgetBreakdown = recalculateBudgetFromDays(
    normalizedDays,
    req.travelers,
    parsed.budgetAdvice ||
      'Estimated costs cover local stay, food, transit, and activities in Indian Rupees.'
  );

  return {
    tripTitle: parsed.tripTitle || `${req.destination} ${req.preference} Itinerary`,
    overview: parsed.overview || '',
    intercityTravelNote: parsed.intercityTravelNote || '',
    localTransitTips: Array.isArray(parsed.localTransitTips) ? parsed.localTransitTips.slice(0, 4) : [],
    packingChecklist: Array.isArray(parsed.packingChecklist) ? parsed.packingChecklist.slice(0, 8) : [],
    budgetBreakdown,
    days: normalizedDays,
    disclaimer:
      'Itinerary ideas and all INR expense figures are estimated approximations for planning purposes, not verified live hotel rates or ticket fares.',
  };
}

export async function regenerateSingleDay(req: RegenerateDayRequest): Promise<DayItinerary> {
  const ai = getGeminiClient();

  const weatherLine = req.weatherForDay
    ? `Weather: ${req.weatherForDay.weatherLabel}, ${req.weatherForDay.tempMinC}°C–${req.weatherForDay.tempMaxC}°C.`
    : '';
  const placesLine =
    req.nearbyPlaces && req.nearbyPlaces.length > 0
      ? `Nearby spots: ${req.nearbyPlaces
          .slice(0, 8)
          .map((p) => p.name)
          .join(', ')}.`
      : '';

  const userPrompt = `Regenerate Day ${req.dayNumber} (${req.date}) for ${req.tripRequest.startingCity} -> ${req.tripRequest.destination}.
Travellers: ${req.tripRequest.travelers} | Tier: ${req.tripRequest.preference} | Total Budget: ₹${req.tripRequest.budgetInr.toLocaleString('en-IN')} | Interests: ${req.tripRequest.interests.join(', ') || 'General'}
Replace: "${req.existingDayTitle}" | Avoid repeating: ${req.otherDayTitles.join(' | ')}
${req.customFocus ? `Requested focus: "${req.customFocus}"` : ''}
${weatherLine} ${placesLine}`.trim();

  const response = await generateWithRetry(() =>
    withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: DAY_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          maxOutputTokens: 1500,
        },
      }),
      18000,
      'Refreshing this day took too long. Please try again.'
    )
  );

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('Unable to refresh this day right now. Please try again.');
  }

  const parsed = JSON.parse(rawText) as DayItinerary;
  return normalizeDayMath({
    ...parsed,
    dayNumber: req.dayNumber,
    date: req.date,
  });
}
