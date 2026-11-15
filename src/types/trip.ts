export type TravelPreference = 'Budget' | 'Standard' | 'Premium';

export type TripInterest =
  | 'Beaches'
  | 'Adventure'
  | 'Food'
  | 'Shopping'
  | 'Nature'
  | 'Nightlife'
  | 'Sightseeing';

export interface TripPlanRequest {
  startingCity: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  budgetInr: number;
  travelers: number;
  preference: TravelPreference;
  interests: TripInterest[];
}

export interface GeocodedLocation {
  available: boolean;
  query: string;
  displayName?: string;
  lat?: number;
  lon?: number;
  country?: string;
  state?: string;
  reason?: string;
  attribution: string;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  weatherLabel: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbabilityMax: number | null;
}

export interface CurrentWeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  weatherLabel: string;
  windSpeedKmh: number;
  observedAt: string;
}

export type WeatherMode = 'forecast' | 'seasonal' | 'historical' | 'unavailable';

export interface WeatherTrendSummary {
  tempMinAvgC: number;
  tempMaxAvgC: number;
  tempMeanAvgC?: number;
  tempRangeLowC: number;
  tempRangeHighC: number;
  avgDailyPrecipitationMm: number;
  totalPeriodPrecipitationMm: number;
  rainySignalPct?: number;
  rainfallTrend: string;
  generalCondition: string;
  travelRecommendation: string;
  yearsAnalyzed?: number[];
  ensembleMembers?: number;
}

export interface WeatherForecastData {
  available: boolean;
  mode: WeatherMode;
  outOfRange: boolean;
  partialCoverage: boolean;
  reason?: string;
  limitationNote?: string;
  timezone?: string;
  current?: CurrentWeatherSnapshot;
  days: WeatherDay[];
  trendSummary?: WeatherTrendSummary;
  source: string;
}

export interface OsmPlace {
  id: string;
  name: string;
  kind: 'attraction' | 'food';
  category: string;
  cuisine?: string;
  address?: string;
  lat: number;
  lon: number;
  osmUrl: string;
}

export interface NearbyPlacesData {
  available: boolean;
  reason?: string;
  places: OsmPlace[];
  attribution: string;
}

export interface ActivitySlot {
  timeRange: string;
  title: string;
  description: string;
  estimatedCostInr: number;
  transportTip: string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  theme: string;
  weatherAdvisory: string;
  morning: ActivitySlot;
  afternoon: ActivitySlot;
  evening: ActivitySlot;
  foodRecommendation: string;
  dailyBreakdownInr: {
    foodInr: number;
    localTransportInr: number;
    activitiesInr: number;
    accommodationInr: number;
  };
  estimatedDailyExpenseInr: number;
}

export interface BudgetBreakdown {
  foodInr: number;
  localTransportInr: number;
  activitiesInr: number;
  accommodationInr: number;
  totalEstimatedInr: number;
  perPersonInr: number;
  budgetAdvice: string;
}

export interface AiGeneratedPlan {
  tripTitle: string;
  overview: string;
  intercityTravelNote: string;
  localTransitTips: string[];
  packingChecklist: string[];
  budgetBreakdown: BudgetBreakdown;
  days: DayItinerary[];
  disclaimer: string;
}

export interface TripPlanResponse {
  request: TripPlanRequest;
  totalDays: number;
  generatedAt: string;
  verifiedExternalData?: {
    location: GeocodedLocation;
    weather: WeatherForecastData;
    nearbyPlaces: NearbyPlacesData;
  };
  aiGeneratedPlan: AiGeneratedPlan;
}

export interface RegenerateDayRequest {
  tripRequest: TripPlanRequest;
  dayNumber: number;
  date: string;
  existingDayTitle: string;
  otherDayTitles: string[];
  customFocus?: string;
  weatherForDay?: WeatherDay | null;
  nearbyPlaces?: OsmPlace[];
}
