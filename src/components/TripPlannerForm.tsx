import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, IndianRupee, Loader2, MapPin, Minus, Plus, Users } from 'lucide-react';
import type { TravelPreference, TripInterest, TripPlanRequest } from '../types/trip';
import { calculateInclusiveDays, formatInr, getTodayIso } from '../utils/formatters';

interface TripPlannerFormProps {
  formValues: TripPlanRequest;
  onChange: (next: TripPlanRequest) => void;
  onSubmit: (req: TripPlanRequest) => void;
  onRetry?: () => void;
  isLoading: boolean;
  errorMessage: string | null;
}

const STARTING_CITY_SUGGESTIONS = ['Bengaluru', 'Delhi', 'Mumbai', 'Pune', 'Hyderabad', 'Chennai'];
const BUDGET_PRESETS = [8000, 15000, 25000, 45000];
const PREFERENCES: Array<{ value: TravelPreference; subtitle: string }> = [
  { value: 'Budget', subtitle: 'Hostels, sleeper/3AC, street food' },
  { value: 'Standard', subtitle: 'Boutique stays, AC transit, cafes' },
  { value: 'Premium', subtitle: 'Resorts, private cabs, fine dining' },
];
const ALL_INTERESTS: TripInterest[] = [
  'Beaches',
  'Adventure',
  'Food',
  'Shopping',
  'Nature',
  'Nightlife',
  'Sightseeing',
];

const LOADING_STEPS = [
  'Planning your getaway…',
  'Creating your daily itinerary…',
  'Estimating your Rupee budget…',
  'Almost ready…',
];

export function TripPlannerForm({
  formValues,
  onChange,
  onSubmit,
  onRetry,
  isLoading,
  errorMessage,
}: TripPlannerFormProps) {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const todayIso = getTodayIso();

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStepIdx((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(timer);
  }, [isLoading]);

  const tripDays = calculateInclusiveDays(formValues.departureDate, formValues.returnDate);
  const perPersonBudget =
    formValues.travelers > 0 ? Math.round(formValues.budgetInr / formValues.travelers) : formValues.budgetInr;

  const toggleInterest = (interest: TripInterest) => {
    const exists = formValues.interests.includes(interest);
    const nextInterests = exists
      ? formValues.interests.filter((i) => i !== interest)
      : [...formValues.interests, interest];
    onChange({ ...formValues, interests: nextInterests });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setValidationError(null);

    if (formValues.startingCity.trim().length < 2) {
      setValidationError('Please enter your starting city.');
      return;
    }
    if (formValues.destination.trim().length < 2) {
      setValidationError('Please enter a destination.');
      return;
    }
    if (!formValues.departureDate || !formValues.returnDate) {
      setValidationError('Please choose both departure and return dates.');
      return;
    }
    if (formValues.returnDate < formValues.departureDate) {
      setValidationError('Return date cannot be earlier than departure date.');
      return;
    }
    if (tripDays < 1 || tripDays > 14) {
      setValidationError('Please choose a trip duration between 1 and 14 days.');
      return;
    }
    if (!Number.isFinite(formValues.budgetInr) || formValues.budgetInr < 500) {
      setValidationError('Please enter a total budget of at least ₹500.');
      return;
    }
    if (formValues.interests.length === 0) {
      setValidationError('Please select at least one interest so we can personalise your itinerary.');
      return;
    }

    onSubmit({
      ...formValues,
      startingCity: formValues.startingCity.trim(),
      destination: formValues.destination.trim(),
    });
  };

  const displayError = validationError || errorMessage;

  return (
    <section id="planner" className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-medium text-violet-700">Interactive Trip Builder</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Configure your trip details
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Tell us where you are starting from, your Rupee budget, and what your group enjoys.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 1. Starting City */}
            <div>
              <label htmlFor="startingCity" className="block text-sm font-semibold text-slate-900">
                Starting city
              </label>
              <div className="relative mt-2">
                <MapPin
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="startingCity"
                  type="text"
                  required
                  value={formValues.startingCity}
                  onChange={(e) => onChange({ ...formValues, startingCity: e.target.value })}
                  placeholder="e.g. Bengaluru, Delhi, Mumbai"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {STARTING_CITY_SUGGESTIONS.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => onChange({ ...formValues, startingCity: city })}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      formValues.startingCity.toLowerCase() === city.toLowerCase()
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Destination */}
            <div>
              <label htmlFor="destination" className="block text-sm font-semibold text-slate-900">
                Destination
              </label>
              <div className="relative mt-2">
                <MapPin
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600"
                  aria-hidden="true"
                />
                <input
                  id="destination"
                  type="text"
                  required
                  value={formValues.destination}
                  onChange={(e) => onChange({ ...formValues, destination: e.target.value })}
                  placeholder="e.g. Goa, Manali, Udaipur, Pondicherry"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-950 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
            </div>

            {/* 3. Departure Date */}
            <div>
              <label htmlFor="departureDate" className="block text-sm font-semibold text-slate-900">
                Departure date
              </label>
              <div className="relative mt-2">
                <Calendar
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="departureDate"
                  type="date"
                  required
                  min={todayIso}
                  value={formValues.departureDate}
                  onChange={(e) => {
                    const nextDep = e.target.value;
                    const nextRet =
                      formValues.returnDate < nextDep ? nextDep : formValues.returnDate;
                    onChange({ ...formValues, departureDate: nextDep, returnDate: nextRet });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-950 tabular-nums focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
            </div>

            {/* 4. Return Date */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="returnDate" className="block text-sm font-semibold text-slate-900">
                  Return date
                </label>
                {tripDays > 0 && (
                  <span className="font-mono text-xs font-medium text-violet-700 tabular-nums">
                    {tripDays} {tripDays === 1 ? 'Day' : 'Days'} · {Math.max(0, tripDays - 1)}{' '}
                    {tripDays - 1 === 1 ? 'Night' : 'Nights'}
                  </span>
                )}
              </div>
              <div className="relative mt-2">
                <Calendar
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="returnDate"
                  type="date"
                  required
                  min={formValues.departureDate || todayIso}
                  value={formValues.returnDate}
                  onChange={(e) => onChange({ ...formValues, returnDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-950 tabular-nums focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Supports 1 to 14 days per itinerary.</p>
            </div>

            {/* 5. Total Budget in Indian Rupees */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="budgetInr" className="block text-sm font-semibold text-slate-900">
                  Total group budget (INR)
                </label>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  ~{formatInr(perPersonBudget)} / person
                </span>
              </div>
              <div className="relative mt-2">
                <IndianRupee
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="budgetInr"
                  type="number"
                  min={500}
                  max={10000000}
                  step={500}
                  required
                  value={formValues.budgetInr || ''}
                  onChange={(e) =>
                    onChange({ ...formValues, budgetInr: Math.max(0, Number(e.target.value)) })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 font-mono text-sm text-slate-950 tabular-nums focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-600/20"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange({ ...formValues, budgetInr: preset })}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                      formValues.budgetInr === preset
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {formatInr(preset)}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Number of Travellers */}
            <div>
              <label htmlFor="travelersCount" className="block text-sm font-semibold text-slate-900">
                Number of travellers
              </label>
              <div className="mt-2 flex h-[42px] items-center justify-between rounded-lg border border-slate-300 bg-white px-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span id="travelersCount" className="font-mono font-semibold text-slate-950 tabular-nums">
                    {formValues.travelers} {formValues.travelers === 1 ? 'Traveller' : 'Travellers'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Decrease travellers"
                    disabled={formValues.travelers <= 1}
                    onClick={() =>
                      onChange({ ...formValues, travelers: Math.max(1, formValues.travelers - 1) })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase travellers"
                    disabled={formValues.travelers >= 25}
                    onClick={() =>
                      onChange({ ...formValues, travelers: Math.min(25, formValues.travelers + 1) })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Group costs and room/hostel splits adjust automatically.
              </p>
            </div>
          </div>

          {/* 7. Travel Preferences */}
          <div className="mt-7 border-t border-slate-200 pt-6">
            <span className="block text-sm font-semibold text-slate-900">Travel preference</span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PREFERENCES.map((pref) => {
                const active = formValues.preference === pref.value;
                return (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() => onChange({ ...formValues, preference: pref.value })}
                    className={`rounded-xl border p-3.5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${
                      active
                        ? 'border-violet-700 bg-violet-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          active ? 'text-violet-950' : 'text-slate-900'
                        }`}
                      >
                        {pref.value}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full border ${
                          active ? 'border-violet-700 bg-violet-700' : 'border-slate-300 bg-white'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{pref.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8. Interests */}
          <div className="mt-7 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-sm font-semibold text-slate-900">Interests</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {formValues.interests.length} selected
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_INTERESTS.map((interest) => {
                const selected = formValues.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${
                      selected
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {displayError && (
            <div
              role="alert"
              className="mt-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <span>{displayError}</span>
              </div>
              {errorMessage && !validationError && onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  className="self-start rounded-lg border border-red-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap shrink-0 sm:self-auto"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <div
              aria-live="polite"
              className="mt-6 rounded-xl border border-violet-200 bg-violet-50/60 p-4"
            >
              <div className="flex items-center gap-3 text-sm font-semibold text-violet-950">
                <Loader2 className="h-4 w-4 animate-spin text-violet-700" aria-hidden="true" />
                <span>{LOADING_STEPS[loadingStepIdx]}</span>
              </div>
              <p className="mt-1.5 pl-7 text-xs text-violet-800">
                Personalising your day-wise schedule and Rupee budget.
              </p>
            </div>
          )}

          <div className="mt-7 flex flex-col items-stretch justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500">
              Tailored day-by-day plans with real destination weather and local places.
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Generating Itinerary...</span>
                </>
              ) : (
                <span>Generate My Itinerary</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
