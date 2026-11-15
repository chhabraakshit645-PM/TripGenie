import { useState } from 'react';
import { ArrowRight, Mountain } from 'lucide-react';
import { motion } from 'motion/react';
import { HERO_IMAGE_URL } from '../data/destinations';

interface HeroSectionProps {
  onPlanClick: () => void;
  onExploreClick: () => void;
}

export function HeroSection({ onPlanClick, onExploreClick }: HeroSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <section id="top" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Copy Column */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between lg:col-span-6"
          >
            <div>
              <p className="text-sm font-medium text-violet-700">
                Built for Indian students, young travellers &amp; group trips
              </p>

              <h1
                className="mt-4 font-display font-bold tracking-tight text-slate-950"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  lineHeight: 1.08,
                  textWrap: 'balance',
                }}
              >
                Your Next Adventure, Planned by TripGenie.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Discover destinations, create personalised itineraries and travel smarter within your budget.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onPlanClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                >
                  <span>Plan My Trip</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onExploreClick}
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Explore Destinations
                </button>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-950 tabular-nums">INR First</p>
                  <p className="mt-0.5 text-xs text-slate-500">Rupee cost estimates</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-950 tabular-nums">Live Weather</p>
                  <p className="mt-0.5 text-xs text-slate-500">Forecasts &amp; seasonal outlooks</p>
                </div>
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-950 tabular-nums">Local Spots</p>
                  <p className="mt-0.5 text-xs text-slate-500">Real nearby places</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Media Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:h-96 lg:h-full lg:min-h-[420px]">
              {!imgFailed ? (
                <img
                  src={HERO_IMAGE_URL}
                  alt="Scenic Himalayan mountain highway at golden hour in northern India"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-violet-900 p-8 text-center text-white">
                  <Mountain className="h-10 w-10 text-violet-300" aria-hidden="true" />
                  <p className="mt-3 font-display text-lg font-semibold">India, Mapped Within Budget</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/25 to-transparent p-5 sm:p-6">
                <p className="text-xs font-medium text-slate-200">
                  Himachal Pradesh · Coastal Goa · Heritage Rajasthan · Uttarakhand
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  Day-wise plans grounded in real geography and weather
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
