import { getLecture } from '../content/lectures'
import { PHASES } from '../content/phases'
import { getArticlesByLecture } from '../content/articles'
import { getTablesByLecture } from '../content/connections'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

interface Props { id: number }

export default function LectureView({ id }: Props) {
  const lec = getLecture(id)
  if (!lec) return <NotFound />
  const phase = PHASES.find(p => p.id === lec.phase)!
  const articles = getArticlesByLecture(id)
  const tables = getTablesByLecture(id)
  const progress = useProgress()
  const done = progress.completedConcepts.filter(c => lec.concepts.some(x => x.id === c)).length

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <a href="#map" className="hover:text-white">Карта</a>
        <span>/</span>
        <span className={phase.textColor}>{phase.title}</span>
        <span>/</span>
        <span className="text-white">Лекция {id}</span>
      </div>

      {/* Header */}
      <div className={clsx('rounded-2xl p-6 mb-8 border', phase.bg)}>
        <div className={clsx('text-sm font-semibold mb-1', phase.textColor)}>Лекция {id}</div>
        <h1 className="text-2xl font-bold text-white mb-1">{lec.title}</h1>
        <p className="text-white/60 text-sm mb-3">{lec.subtitle}</p>
        <div className="flex items-center gap-4">
          <div className="text-xs text-white/50">
            {done}/{lec.concepts.length} концепций изучено
          </div>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-blue rounded-full transition-all"
              style={{ width: `${Math.round((done / lec.concepts.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strategic question */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="text-xs font-semibold text-brand-blue mb-2">СТРАТЕГИЧЕСКИЙ ВОПРОС ЛЕКЦИИ</div>
        <p className="text-white font-medium">{lec.question}</p>
      </div>

      {/* Intro */}
      <div className="prose-dark mb-8">
        <p className="text-white/70 leading-relaxed">{lec.intro}</p>
      </div>

      {/* Concepts */}
      <h2 className="text-xl font-bold text-white mb-4">Концепции</h2>
      <div className="space-y-3 mb-8">
        {lec.concepts.map((c, i) => {
          const isDone = progress.completedConcepts.includes(c.id)
          return (
            <a
              key={c.id}
              href={`#concept/${c.id}`}
              className="glass glass-hover rounded-xl p-4 flex items-start gap-4 group block"
            >
              <div className={clsx(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                isDone ? 'bg-green-500/20 text-green-400' : `${phase.bg.split(' ')[0]} ${phase.textColor}`
              )}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white group-hover:text-brand-blue transition-colors">
                  {c.name}
                </div>
                <div className="text-white/50 text-sm mt-0.5">{c.authors}</div>
                <div className="text-white/60 text-sm mt-1 line-clamp-2">{c.essence}</div>
              </div>
              <svg className="flex-shrink-0 w-4 h-4 text-white/30 group-hover:text-white transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </a>
          )
        })}
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-white mb-4">Статьи к лекции</h2>
          <div className="space-y-3 mb-8">
            {articles.map(a => (
              <a key={a.id} href={`#article/${a.id}`} className="glass glass-hover rounded-xl p-4 block group">
                <div className="font-semibold text-white group-hover:text-brand-blue transition-colors">{a.title}</div>
                <div className="text-white/50 text-sm">{a.authors} — {a.source}, {a.year}</div>
                <div className="text-white/60 text-sm mt-1 line-clamp-2">{a.thesis}</div>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Tables */}
      {tables.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-white mb-4">Таблицы сравнений</h2>
          <div className="space-y-3 mb-8">
            {tables.map(t => (
              <a key={t.id} href={`#connections`} className="glass glass-hover rounded-xl p-4 block group">
                <div className="font-semibold text-white group-hover:text-brand-blue transition-colors">{t.title}</div>
                <div className="text-white/50 text-sm mt-1">{t.description}</div>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-white/10">
        {id > 1 && (
          <a href={`#lecture/${id - 1}`} className="text-white/50 hover:text-white text-sm flex items-center gap-1">
            ← Лекция {id - 1}
          </a>
        )}
        {id < 12 && (
          <a href={`#lecture/${id + 1}`} className="text-white/50 hover:text-white text-sm flex items-center gap-1 ml-auto">
            Лекция {id + 1} →
          </a>
        )}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-8 text-center">
      <div className="text-white/40 text-lg">Лекция не найдена</div>
      <a href="#map" className="text-brand-blue mt-4 inline-block hover:underline">← Карта курса</a>
    </div>
  )
}
