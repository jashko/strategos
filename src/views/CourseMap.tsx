import { PHASES } from '../content/phases'
import { LECTURES } from '../content/lectures'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

export default function CourseMap() {
  const progress = useProgress()

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Карта курса</h1>
        <p className="text-white/60">Стратегический менеджмент НИУ ВШЭ 2026 — Кнатько Д.М.</p>
      </div>

      {/* Strategic flow */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {PHASES.map((phase, i) => (
          <div key={phase.id} className="flex items-center gap-2 flex-shrink-0">
            <div className={clsx('rounded-xl px-4 py-2 border text-sm font-semibold', phase.bg, phase.textColor)}>
              {phase.title}
            </div>
            {i < PHASES.length - 1 && <span className="text-white/30">→</span>}
          </div>
        ))}
      </div>

      {/* Phases grid */}
      <div className="space-y-8">
        {PHASES.map(phase => (
          <div key={phase.id}>
            <div className={clsx('flex items-center gap-3 mb-4 pb-2 border-b', phase.bg.split(' ')[1])}>
              <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', phase.bg, phase.textColor)}>
                Ф{phase.number}
              </span>
              <h2 className={clsx('font-bold text-lg', phase.textColor)}>{phase.title}</h2>
              <span className="text-white/40 text-sm">— {phase.subtitle}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phase.lectures.map(lid => {
                const lec = LECTURES.find(l => l.id === lid)!
                const conceptsDone = progress.completedConcepts.filter(
                  cid => lec.concepts.some(c => c.id === cid)
                ).length
                const pct = Math.round((conceptsDone / lec.concepts.length) * 100)
                const lp = progress.lectureProgress[lid]

                return (
                  <a
                    key={lid}
                    href={`#lecture/${lid}`}
                    className="glass glass-hover rounded-xl p-5 block group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className={clsx('text-xs font-semibold', phase.textColor)}>Лекция {lid}</span>
                        <h3 className="font-bold text-white group-hover:text-brand-blue transition-colors mt-0.5">
                          {lec.title}
                        </h3>
                        <p className="text-white/50 text-sm mt-0.5">{lec.subtitle}</p>
                      </div>
                      <div className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2',
                        pct === 100 ? 'border-green-500 text-green-400' : 'border-white/10 text-white/50'
                      )}>
                        {pct === 100 ? '✓' : `${pct}%`}
                      </div>
                    </div>

                    {/* Concepts */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {lec.concepts.map(c => {
                        const isDone = progress.completedConcepts.includes(c.id)
                        return (
                          <a
                            key={c.id}
                            href={`#concept/${c.id}`}
                            onClick={e => e.stopPropagation()}
                            className={clsx(
                              'text-xs px-2 py-0.5 rounded-full border transition-colors',
                              isDone
                                ? 'bg-green-500/20 border-green-500/40 text-green-300'
                                : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                            )}
                          >
                            {c.name}
                          </a>
                        )
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', phase.textColor.replace('text-', 'bg-'))}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '#articles', emoji: '📄', label: 'Статьи HBR', sub: '7 статей' },
          { href: '#connections', emoji: '🔗', label: 'Таблицы сравнений', sub: '10 таблиц' },
          { href: '#case/mts', emoji: '💼', label: 'Кейс МТС', sub: 'Экосистема' },
          { href: '#exam', emoji: '🎯', label: 'Экзамен', sub: '90 мин · 30 вопр.' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            className="glass glass-hover rounded-xl p-4 text-center group"
          >
            <div className="text-2xl mb-2">{item.emoji}</div>
            <div className="font-semibold text-white text-sm group-hover:text-brand-blue transition-colors">
              {item.label}
            </div>
            <div className="text-white/40 text-xs mt-0.5">{item.sub}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
