import { useState } from 'react';
import { Compass, Menu, X } from 'lucide-react';

interface NavbarProps {
  hasResult: boolean;
  onNavigateSection: (sectionId: string) => void;
  onPlanTripClick: () => void;
}

export function Navbar({ hasResult, onNavigateSection, onPlanTripClick }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: string) => {
    setMobileOpen(false);
    onNavigateSection(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNav('top');
          }}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Compass className="h-4 w-4 text-violet-300" aria-hidden="true" />
          </span>
          <span className="font-display">TripGenie</span>
        </a>

        {/* Zone 2: 4 Concise Single-Line Nav Links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => handleNav('destinations')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 rounded-sm"
          >
            Destinations
          </button>
          <button
            type="button"
            onClick={() => handleNav('how-it-works')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 rounded-sm"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNav('planner')}
            className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 rounded-sm"
          >
            Trip Planner
          </button>
          {hasResult && (
            <button
              type="button"
              onClick={() => handleNav('results-dashboard')}
              className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700 rounded-sm"
            >
              Itinerary
            </button>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onPlanTripClick();
            }}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            Plan My Trip
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => handleNav('destinations')}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Destinations
            </button>
            <button
              type="button"
              onClick={() => handleNav('how-it-works')}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleNav('planner')}
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Trip Planner
            </button>
            {hasResult && (
              <button
                type="button"
                onClick={() => handleNav('results-dashboard')}
                className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Itinerary
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onPlanTripClick();
              }}
              className="mt-2 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-800"
            >
              Plan My Trip
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
