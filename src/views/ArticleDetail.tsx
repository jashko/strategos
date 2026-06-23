import { getArticle } from '../content/articles'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

interface Props { id: string }

export default function ArticleDetail({ id }: Props) {
  const article = getArticle(id)
  const progress = useProgress()

  if (!article) return (
    <div className="p-8 text-center">
      <div className="text-white/40">Статья не найдена</div>
      <a href="#articles" className="text-brand-blue mt-4 inline-block">← Все статьи</a>
    </div>
  )

  const isFav = progress.favoriteArticles.includes(article.id)

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <a href="#articles" className="hover:text-white">Статьи</a>
        <span>/</span>
        <span className="text-white truncate">{article.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{article.title}</h1>
          <div className="text-white/60">
            {article.authors} — <span className="text-brand-blue">{article.source}</span>, {article.year}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {article.lectureIds.map(lid => (
              <a
                key={lid}
                href={`#lecture/${lid}`}
                className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30"
              >
                Лекция {lid}
              </a>
            ))}
          </div>
        </div>
        <button
          onClick={() => progress.toggleFavoriteArticle(article.id)}
          className={clsx('text-2xl transition-colors flex-shrink-0', isFav ? 'text-yellow-400' : 'text-white/20 hover:text-white/50')}
        >
          ★
        </button>
      </div>

      {/* Thesis */}
      <div className="glass rounded-xl p-5 mb-6 border-l-4 border-brand-blue">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-blue mb-2">Тезис</div>
        <p className="text-white font-medium leading-relaxed">{article.thesis}</p>
      </div>

      {/* Key points */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/40 mb-3">Ключевые идеи</h2>
        <ul className="space-y-2">
          {article.keyPoints.map((pt, i) => (
            <li key={i} className="flex gap-3 text-white/80 text-sm leading-relaxed">
              <span className="flex-shrink-0 text-brand-blue font-bold mt-0.5">{i + 1}.</span>
              {pt}
            </li>
          ))}
        </ul>
      </div>

      {/* Quote */}
      {article.quote && (
        <div className="glass rounded-xl p-5 mb-6 border-l-4 border-white/20">
          <div className="text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Цитата</div>
          <blockquote className="text-white/80 italic leading-relaxed">"{article.quote}"</blockquote>
        </div>
      )}

      {/* Exam */}
      <div className="glass rounded-xl p-5 border-l-4 border-red-500/50">
        <div className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">На экзамен</div>
        <p className="text-white/80 text-sm leading-relaxed">{article.examRelevance}</p>
      </div>
    </div>
  )
}
