const STEPS = [
  {
    number: '01.',
    title: 'Set route, dates & Rupee budget',
    description:
      'Enter your starting city, destination, travel dates, group size, comfort tier, and interests like beaches, street food, or adventure.',
  },
  {
    number: '02.',
    title: 'Grounded in real weather & maps',
    description:
      'We check live destination weather forecasts and gather real nearby landmarks, viewpoints, cafes, and local eateries.',
  },
  {
    number: '03.',
    title: 'Personalised plan & Rupee ledger',
    description:
      'Get a structured morning-to-evening schedule with estimated INR costs, and refresh any single day whenever your mood changes.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-violet-700">How TripGenie Works</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Honest travel planning without guesswork
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Instead of generic chat replies, TripGenie pairs real destination weather and nearby places with smart day-by-day planning and Rupee estimates.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/50 p-6"
            >
              <div>
                <span className="font-mono text-sm font-semibold text-violet-700">{step.number}</span>
                <h3 className="mt-3 font-display text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
