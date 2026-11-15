import { useRef, useState } from 'react';
import { DestinationsSection } from './components/DestinationsSection';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { Navbar } from './components/Navbar';
import { ResultDashboard } from './components/ResultDashboard';
import { TripPlannerForm } from './components/TripPlannerForm';
import type { CuratedDestination } from './data/destinations';
import type {
  DayItinerary,
  GeocodedLocation,
  NearbyPlacesData,
  TripPlanRequest,
  TripPlanResponse,
  WeatherForecastData,
} from './types/trip';
import { addDaysToIso, getTodayIso } from './utils/formatters';

function buildInitialRequest(): TripPlanRequest {
  const today = getTodayIso();
  return {
    startingCity: 'Bengaluru',
    destination: 'Goa',
    departureDate: addDaysToIso(today, 2),
    returnDate: addDaysToIso(today, 5),
    budgetInr: 16000,
    travelers: 3,
    preference: 'Budget',
    interests: ['Beaches', 'Food', 'Sightseeing'],
  };
}

function recomputeBudgetBreakdown(
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

async function fetchWithClientTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export default function App() {
  const [formValues, setFormValues] = useState<TripPlanRequest>(buildInitialRequest);
  const [tripPlan, setTripPlan] = useState<TripPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regeneratingDayNumber, setRegeneratingDayNumber] = useState<number | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);

  // Independent background external data states
  const [locationData, setLocationData] = useState<GeocodedLocation | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherForecastData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [placesData, setPlacesData] = useState<NearbyPlacesData | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Synchronous lock + abort handle to prevent duplicate submissions
  const isSubmittingRef = useRef(false);
  const lastSubmittedReqRef = useRef<TripPlanRequest | null>(null);
  const backgroundAbortRef = useRef<AbortController | null>(null);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const loadWeatherInBackground = async (req: TripPlanRequest, signal?: AbortSignal) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const params = new URLSearchParams({
        destination: req.destination,
        departureDate: req.departureDate,
        returnDate: req.returnDate,
      });
      const res = await fetchWithClientTimeout(`/api/weather?${params.toString()}`, {}, 16000, signal);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to load weather forecast right now.');
      }
      if (data.location) {
        setLocationData((prev) => prev || (data.location as GeocodedLocation));
      }
      setWeatherData(data.weather as WeatherForecastData);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (!signal?.aborted) {
          setWeatherError('Weather lookup timed out. Please try again.');
        }
        return;
      }
      setWeatherError(
        err instanceof Error ? err.message : 'Unable to load weather forecast right now.'
      );
    } finally {
      if (!signal?.aborted) {
        setWeatherLoading(false);
      }
    }
  };

  const loadPlacesInBackground = async (req: TripPlanRequest, signal?: AbortSignal) => {
    setPlacesLoading(true);
    setPlacesError(null);
    try {
      const params = new URLSearchParams({
        destination: req.destination,
      });
      const res = await fetchWithClientTimeout(`/api/places?${params.toString()}`, {}, 30000, signal);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || 'We’re unable to load nearby recommendations right now. Please try again shortly.'
        );
      }
      if (data.location) {
        setLocationData((prev) => prev || (data.location as GeocodedLocation));
      }
      setPlacesData(data.nearbyPlaces as NearbyPlacesData);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (!signal?.aborted) {
          setPlacesError('We’re unable to load nearby recommendations right now. Please try again shortly.');
        }
        return;
      }
      setPlacesError(
        err instanceof Error
          ? err.message
          : 'We’re unable to load nearby recommendations right now. Please try again shortly.'
      );
    } finally {
      if (!signal?.aborted) {
        setPlacesLoading(false);
      }
    }
  };

  const handleSelectDestination = (dest: CuratedDestination) => {
    const today = getTodayIso();
    const departureDate = addDaysToIso(today, 2);
    const returnDate = addDaysToIso(departureDate, dest.suggestedDays - 1);

    setFormValues((prev) => ({
      ...prev,
      destination: dest.name,
      departureDate,
      returnDate,
      budgetInr: dest.suggestedBudgetInr,
      preference: dest.defaultPreference,
      interests: dest.defaultInterests,
    }));
    setErrorMessage(null);
    scrollToSection('planner');
  };

  const handlePlanTrip = async (req: TripPlanRequest) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    lastSubmittedReqRef.current = req;

    // Cancel any previous background weather/places fetches
    backgroundAbortRef.current?.abort();
    const bgController = new AbortController();
    backgroundAbortRef.current = bgController;

    setIsLoading(true);
    setErrorMessage(null);
    setDayError(null);
    setLocationData(null);
    setWeatherData(null);
    setPlacesData(null);

    // Start weather and nearby places immediately in the background without blocking itinerary
    void loadWeatherInBackground(req, bgController.signal);
    void loadPlacesInBackground(req, bgController.signal);

    try {
      const response = await fetchWithClientTimeout(
        '/api/plan-trip',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        },
        32000
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not generate trip itinerary. Please try again.');
      }

      setTripPlan(data as TripPlanResponse);
      setTimeout(() => scrollToSection('results-dashboard'), 80);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMessage('Generating your itinerary timed out. Please try again.');
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Network error while generating your itinerary. Please try again.'
        );
      }
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleRegenerateDay = async (dayNumber: number, customFocus?: string) => {
    if (!tripPlan || regeneratingDayNumber !== null) return;
    const targetDay = tripPlan.aiGeneratedPlan.days.find((d) => d.dayNumber === dayNumber);
    if (!targetDay) return;

    setRegeneratingDayNumber(dayNumber);
    setDayError(null);

    try {
      const weatherForDay = weatherData?.days.find((w) => w.date === targetDay.date) ?? null;

      const response = await fetchWithClientTimeout(
        '/api/regenerate-day',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripRequest: tripPlan.request,
            dayNumber,
            date: targetDay.date,
            existingDayTitle: targetDay.title,
            otherDayTitles: tripPlan.aiGeneratedPlan.days
              .filter((d) => d.dayNumber !== dayNumber)
              .map((d) => `Day ${d.dayNumber}: ${d.title}`),
            customFocus,
            weatherForDay,
            nearbyPlaces: placesData?.places ?? [],
          }),
        },
        22000
      );

      const data = await response.json();
      if (!response.ok || !data?.day) {
        throw new Error(data?.error || `Failed to refresh Day ${dayNumber}.`);
      }

      const updatedDay = data.day as DayItinerary;
      setTripPlan((prev) => {
        if (!prev) return prev;
        const nextDays = prev.aiGeneratedPlan.days.map((d) =>
          d.dayNumber === dayNumber ? updatedDay : d
        );
        const nextBudget = recomputeBudgetBreakdown(
          nextDays,
          prev.request.travelers,
          prev.aiGeneratedPlan.budgetBreakdown.budgetAdvice
        );
        return {
          ...prev,
          aiGeneratedPlan: {
            ...prev.aiGeneratedPlan,
            days: nextDays,
            budgetBreakdown: nextBudget,
          },
        };
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setDayError(`Refreshing Day ${dayNumber} timed out. Please try again.`);
      } else {
        setDayError(
          err instanceof Error ? err.message : `Could not refresh Day ${dayNumber} right now.`
        );
      }
    } finally {
      setRegeneratingDayNumber(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar
        hasResult={Boolean(tripPlan)}
        onNavigateSection={scrollToSection}
        onPlanTripClick={() => scrollToSection('planner')}
      />

      <main>
        <HeroSection
          onPlanClick={() => scrollToSection('planner')}
          onExploreClick={() => scrollToSection('destinations')}
        />

        <DestinationsSection onSelectDestination={handleSelectDestination} />

        <HowItWorksSection />

        <TripPlannerForm
          formValues={formValues}
          onChange={setFormValues}
          onSubmit={handlePlanTrip}
          onRetry={() => handlePlanTrip(lastSubmittedReqRef.current || formValues)}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />

        {tripPlan && (
          <ResultDashboard
            plan={tripPlan}
            location={locationData}
            weather={weatherData}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            onRetryWeather={() =>
              loadWeatherInBackground(tripPlan.request, backgroundAbortRef.current?.signal)
            }
            nearbyPlaces={placesData}
            placesLoading={placesLoading}
            placesError={placesError}
            onRetryPlaces={() =>
              loadPlacesInBackground(tripPlan.request, backgroundAbortRef.current?.signal)
            }
            isRegeneratingFull={isLoading}
            regeneratingDayNumber={regeneratingDayNumber}
            dayError={dayError}
            onEditTrip={() => scrollToSection('planner')}
            onRegenerateFull={() => handlePlanTrip(tripPlan.request)}
            onRegenerateDay={handleRegenerateDay}
          />
        )}
      </main>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="font-display text-base font-bold text-white">TripGenie</p>
            <p className="mt-1 text-xs text-slate-400">
              Personalised travel planning for Indian students, young travellers &amp; budget groups.
            </p>
          </div>

          <div className="text-xs text-slate-400 md:text-right">
            <p>
              Map data{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 underline hover:text-white"
              >
                © OpenStreetMap contributors
              </a>
            </p>
            <p className="mt-1">
              All trip prices are estimated planning approximations, not verified live quotes.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
