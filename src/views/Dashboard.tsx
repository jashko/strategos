import { LECTURES } from '../content/lectures'
import { PHASES } from '../content/phases'
import { useProgress, getTotalConceptsDone, getOverallAccuracy, getLecturesCompleted } from '../store/progress'
import clsx from 'clsx'

const TOTAL_CONCEPTS = LECTURES.reduce((sum, l) => sum + l.concepts.length, 0)

export default function Dashboard() {
  const progress = useProgress()
  const done = getTotalConceptsDone(progress)
  const accuracy = getOverallAccuracy(progress)
  const lecturesDone = getLecturesCompleted(progress)
  const examCount = progress.examHistory.length
  const lastExam = progress.examHistory[progress.examHistory.length - 1]

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Дашборд</h1>
        <p className="text-white/60">Ваш прогресс по курсу</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Концепций изучено" value={`${done}/${TOTAL_CONCEPTS}`} sub={`${Math.round((done / TOTAL_CONCEPTS) * 100)}%`} color="text-brand-blue" />
        <StatCard label="Лекций завершено" value={`${lecturesDone}/12`} sub="с кейсом" color="text-purple-400" />
        <StatCard label="Точность ответов" value={`${accuracy}%`} sub="в тестах" color={accuracy >= 80 ? 'text-green-400' : 'text-amber-400'} />
        <StatCard label="Экзамены" value={String(examCount)} sub={lastExam ? `Посл: ${lastExam.total} б.` : 'Ещё не сдан'} color="text-red-400" />
      </div>

      {/* Exam history */}
      {progress.examHistory.length > 0 && (
        <div className="glass rounded-xl p-5 mb-8">
          <h2 className="font-bold text-white mb-4">История экзаменов</h2>
          <div className="space-y-2">
            {[...progress.examHistory].reverse().slice(0, 5).map((r, i) => {
              const pct = Math.round((r.total / 46) * 100)
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="text-white/40 text-xs w-32 flex-shrink-0">
                    {new Date(r.date).toLocaleDateString('ru')}
                  </div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={clsx('text-sm font-medium w-16 text-right', pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400')}>
                    {r.total}/46
                  </div>
                </div>
              )
            })}
          </div>
          {progress.examHistory.length > 5 && (
            <div className="text-white/30 text-xs mt-2">Показаны последние 5 попыток</div>
          )}
        </div>
      )}

      {/* Progress by phase */}
      <h2 className="text-xl font-bold text-white mb-4">По фазам</h2>
      <div className="space-y-4 mb-8">
        {PHASES.map(phase => {
          const phaseLecs = LECTURES.filter(l => l.phase === phase.id)
          const total = phaseLecs.reduce((s, l) => s + l.concepts.length, 0)
          const done = phaseLecs.reduce((s, l) => s + l.concepts.filter(c => progress.completedConcepts.includes(c.id)).length, 0)
          const pct = total ? Math.round((done / total) * 100) : 0

          return (
            <div key={phase.id} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={clsx('font-semibold text-sm', phase.textColor)}>Ф{phase.number}: {phase.title}</span>
                <span className="text-white/40 text-sm">{done}/{total}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={clsx('h-full rounded-full transition-all', phase.textColor.replace('text-', 'bg-'))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {phaseLecs.map(lec => {
                  const lDone = lec.concepts.filter(c => progress.completedConcepts.includes(c.id)).length
                  const lPct = Math.round((lDone / lec.concepts.length) * 100)
                  return (
                    <a
                      key={lec.id}
                      href={`#lecture/${lec.id}`}
                      className={clsx(
                        'text-xs px-2 py-0.5 rounded-full border transition-colors',
                        lPct === 100
                          ? 'bg-green-500/20 border-green-500/40 text-green-300'
                          : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                      )}
                    >
                      {lec.id}. {lec.title}
                    </a>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Favorite articles */}
      {progress.favoriteArticles.length > 0 && (
        <div className="glass rounded-xl p-5 mb-8">
          <h2 className="font-bold text-white mb-3">Избранные статьи</h2>
          <div className="flex flex-wrap gap-2">
            {progress.favoriteArticles.map(id => (
              <a
                key={id}
                href={`#article/${id}`}
                className="text-sm px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
              >
                ★ {id.replace(/-/g, ' ')}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-wrap gap-4">
        <a href="#exam" className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-blue to-purple-500 hover:opacity-90 transition-opacity">
          🎯 Сдать экзамен
        </a>
        <button
          onClick={() => {
            if (confirm('Сбросить весь прогресс? Это действие необратимо.')) {
              progress.resetAll()
            }
          }}
          className="px-6 py-3 rounded-xl font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm"
        >
          Сбросить прогресс
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className={clsx('text-2xl font-bold mb-1', color)}>{value}</div>
      <div className="text-white/60 text-sm">{label}</div>
      <div className="text-white/30 text-xs mt-0.5">{sub}</div>
    </div>
  )
}
