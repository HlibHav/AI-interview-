"use client";

type PainGainJobsRowProps = {
  pains?: string[];
  gains?: string[];
  jobs?: string[];
  idPrefix?: string;
  layout?: 'horizontal' | 'vertical';
};

export function PainGainJobsRow({
  pains = [],
  gains = [],
  jobs = [],
  idPrefix = 'pgj',
  layout = 'horizontal'
}: PainGainJobsRowProps) {
  const sections = [
    {
      title: 'Pains',
      items: pains,
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      text: 'text-rose-50/90',
      badge: 'bg-rose-500/30 text-rose-100'
    },
    {
      title: 'Gains',
      items: gains,
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-50/90',
      badge: 'bg-emerald-500/30 text-emerald-50'
    },
    {
      title: 'Jobs to be Done',
      items: jobs,
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-50/90',
      badge: 'bg-cyan-500/30 text-cyan-50'
    }
  ];

  const isHorizontal = layout === 'horizontal';

  return (
    <div className={isHorizontal ? 'overflow-x-auto pb-2' : ''}>
      <div
        className={
          isHorizontal
            ? 'flex flex-col gap-4 md:flex-row min-w-full md:gap-4'
            : 'flex flex-col gap-4'
        }
      >
        {sections.map((section, idx) => (
          <div
            key={`${idPrefix}-${idx}`}
            className={`flex-1 min-w-[240px] rounded-xl border ${section.border} ${section.bg} p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">{section.title}</h4>
              <span className={`rounded-full px-2 py-0.5 text-xs ${section.badge}`}>{section.items.length}</span>
            </div>
            {section.items.length > 0 ? (
              <ul className={`space-y-2 text-sm ${section.text}`}>
                {section.items.map((item, itemIdx) => (
                  <li key={`${idPrefix}-${section.title}-${itemIdx}`} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-white/70" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/60">No {section.title.toLowerCase()} captured.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
