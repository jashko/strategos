import { ARTICLES } from '../content/articles'
import { LECTURES } from '../content/lectures'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

export default function ArticlesView() {
  const progress = useProgress()

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Статьи HBR</h1>
        <p className="text-white/60">Обязательные и рекомендованные статьи курса</p>
      </div>

      <div className="space-y-4">
        {ARTICLES.map(a => {
          const isFav = progress.favoriteArticles.includes(a.id)
          return (
            <div key={a.id} className="glass rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <a href={`#article/${a.id}`} className="font-bold text-white hover:text-brand-blue transition-colors text-lg">
                    {a.title}
                  </a>
                  <div className="text-white/50 text-sm mt-0.5">
                    {a.authors} — {a.source}, {a.year}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.lectureIds.map(lid => {
                      const lec = LECTURES.find(l => l.id === lid)
                      return lec ? (
                        <a
                          key={lid}
                          href={`#lecture/${lid}`}
                          className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30 hover:bg-brand-blue/30 transition-colors"
                        >
                          Лекция {lid}
                        </a>
                      ) : null
                    })}
                  </div>
                  <p className="text-white/70 text-sm mt-3 leading-relaxed">{a.thesis}</p>
                </div>
                <button
                  onClick={() => progress.toggleFavoriteArticle(a.id)}
                  className={clsx(
                    'flex-shrink-0 text-xl transition-colors',
                    isFav ? 'text-yellow-400' : 'text-white/20 hover:text-white/50'
                  )}
                  title={isFav ? 'Убрать из избранного' : 'В избранное'}
                >
                  ★
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-xs font-semibold text-white/40 mb-2">НА ЭКЗАМЕН</div>
                <p className="text-white/60 text-sm">{a.examRelevance}</p>
              </div>

              <div className="mt-3">
                <a
                  href={`#article/${a.id}`}
                  className="text-brand-blue text-sm hover:underline"
                >
                  Читать подробнее →
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
