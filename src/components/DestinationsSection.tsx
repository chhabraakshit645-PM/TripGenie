import { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { CURATED_DESTINATIONS, type CuratedDestination } from '../data/destinations';
import { formatInr } from '../utils/formatters';

interface DestinationsSectionProps {
  onSelectDestination: (destination: CuratedDestination) => void;
}

function DestinationImage({ dest }: { dest: CuratedDestination }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-violet-950 p-4 text-white">
        <MapPin className="h-7 w-7 text-violet-300" aria-hidden="true" />
        <span className="mt-2 font-display text-base font-semibold">{dest.name}</span>
      </div>
    );
  }

  return (
    <img
      src={dest.imageUrl}
      alt={dest.imageAlt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  );
}

export function DestinationsSection({ onSelectDestination }: DestinationsSectionProps) {
  return (
    <section id="destinations" className="border-b border-slate-200 bg-slate-50/70 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-violet-700">Popular Student &amp; Group Routes</p>
            <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Start from a proven favourite
            </h2>
          </div>
          <p className="max-w-md text-sm text-slate-600">
            Select any destination below to pre-load sensible days, Rupee budget targets, and interests into the planner.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CURATED_DESTINATIONS.map((dest) => (
            <button
              key={dest.id}
              type="button"
              onClick={() => onSelectDestination(dest)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-colors hover:border-violet-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <DestinationImage dest={dest} />
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-bold text-slate-950">{dest.name}</h3>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-violet-700"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span>{dest.region}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{dest.suggestedDays} Days</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Est. {formatInr(dest.suggestedBudgetInr)}</span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{dest.tagline}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>{dest.idealFor}</span>
                  <span className="text-violet-700 group-hover:underline">Prefill plan</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
