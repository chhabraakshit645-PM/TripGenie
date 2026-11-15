import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { BudgetBreakdown } from '../types/trip';
import { formatInr } from '../utils/formatters';

interface BudgetPlannerPanelProps {
  targetBudgetInr: number;
  travelers: number;
  totalDays: number;
  breakdown: BudgetBreakdown;
}

export function BudgetPlannerPanel({
  targetBudgetInr,
  travelers,
  totalDays,
  breakdown,
}: BudgetPlannerPanelProps) {
  const remainingInr = targetBudgetInr - breakdown.totalEstimatedInr;
  const isOverBudget = remainingInr < 0;

  const categories = [
    {
      label: 'Estimated Food',
      amount: breakdown.foodInr,
      colorClass: 'bg-violet-700',
    },
    {
      label: 'Estimated Local Transport',
      amount: breakdown.localTransportInr,
      colorClass: 'bg-slate-900',
    },
    {
      label: 'Estimated Activities',
      amount: breakdown.activitiesInr,
      colorClass: 'bg-indigo-500',
    },
    {
      label: 'Estimated Accommodation',
      amount: breakdown.accommodationInr,
      colorClass: 'bg-slate-400',
    },
  ];

  const totalSafe = Math.max(1, breakdown.totalEstimatedInr);

  return (
    <section
      id="budget-guide"
      aria-labelledby="budget-planner-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-violet-700">AI-Estimated Rupee Ledger</p>
          <h3 id="budget-planner-heading" className="mt-1 font-display text-xl font-bold text-slate-950">
            Trip Budget Planner
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            For {travelers} {travelers === 1 ? 'traveller' : 'travellers'} across {totalDays}{' '}
            {totalDays === 1 ? 'day' : 'days'} · Est. {formatInr(breakdown.perPersonInr)} per person
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          {isOverBudget ? (
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
              <span>Exceeds target by {formatInr(Math.abs(remainingInr))}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Within target budget</span>
            </span>
          )}
        </div>
      </div>

      {/* Category Breakdown Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <div key={cat.label} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-xs ${cat.colorClass}`} aria-hidden="true" />
              <span className="text-xs font-medium text-slate-600">{cat.label}</span>
            </div>
            <p className="mt-2 font-mono text-lg font-semibold text-slate-950 tabular-nums">
              {formatInr(cat.amount)}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
              {Math.round((cat.amount / totalSafe) * 100)}% of estimate
            </p>
          </div>
        ))}
      </div>

      {/* Proportional Distribution Bar */}
      <div className="mt-6">
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
          role="img"
          aria-label="Estimated budget category distribution"
        >
          {categories.map((cat) => {
            const pct = (cat.amount / totalSafe) * 100;
            return (
              <div
                key={cat.label}
                style={{ width: `${pct}%` }}
                className={cat.colorClass}
                title={`${cat.label}: ${formatInr(cat.amount)}`}
              />
            );
          })}
        </div>
      </div>

      {/* Totals Summary Row */}
      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-slate-500">Your Target Budget</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatInr(targetBudgetInr)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Total Estimated Trip Budget</p>
          <p className="mt-1 font-mono text-xl font-bold text-violet-700 tabular-nums">
            {formatInr(breakdown.totalEstimatedInr)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500">Remaining Budget</p>
          <p
            className={`mt-1 font-mono text-xl font-bold tabular-nums ${
              isOverBudget ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {isOverBudget ? `-${formatInr(Math.abs(remainingInr))}` : formatInr(remainingInr)}
          </p>
        </div>
      </div>

      {breakdown.budgetAdvice && (
        <p className="mt-5 text-sm leading-relaxed text-slate-700">{breakdown.budgetAdvice}</p>
      )}

      <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>
          All amounts above are AI-estimated approximations in INR for local stay, food, transit, and activities. They do not represent live hotel tariffs, train tickets, or flight offers.
        </span>
      </div>
    </section>
  );
}
