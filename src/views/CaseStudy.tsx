import { useState } from 'react'
import { getCase } from '../content/cases'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

interface Props { id: string }

export default function CaseStudy({ id }: Props) {
  const caseData = getCase(id)
  if (!caseData) return (
    <div className="p-8 text-center">
      <div className="text-white/40">Кейс не найден</div>
      <a href="#map" className="text-brand-blue mt-4 inline-block">← Карта</a>
    </div>
  )

  const progress = useProgress()
  const [activeQ, setActiveQ] = useState<number | null>(null)
  const [showModel, setShowModel] = useState<Record<number, boolean>>({})
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({})
  const savedNote = progress.caseNotes[id] || ''

  const toggleModel = (i: number) => setShowModel(prev => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
        <a href="#map" className="hover:text-white">Карта</a>
        <span>/</span>
        <span className="text-white">{caseData.company}</span>
      </div>

      {/* Header */}
      <div className="glass rounded-2xl p-6 mb-8">
        <div className="text-xs font-semibold text-brand-blue mb-1">Кейс</div>
        <h1 className="text-2xl font-bold text-white mb-1">{caseData.company}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-white/50">
          <span>{caseData.year}</span>
          <span>·</span>
          <span>{caseData.industry}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {caseData.tools.map((tool, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Context */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3">Контекст</h2>
        {caseData.context.split('\n\n').map((para, i) => (
          <p key={i} className="text-white/70 leading-relaxed mb-3">{para}</p>
        ))}
      </div>

      {/* Questions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Вопросы кейса</h2>
        <div className="space-y-4">
          {caseData.questions.map((q, i) => (
            <div key={i} className={clsx('glass rounded-xl overflow-hidden border', activeQ === i ? 'border-brand-blue/40' : 'border-white/5')}>
              <button
                className="w-full text-left p-5 flex items-start justify-between gap-4"
                onClick={() => setActiveQ(activeQ === i ? null : i)}
              >
                <div className="flex gap-3 flex-1">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-bold flex items-center justify-center mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <div>
                    <p className="text-white font-medium leading-relaxed">{q.text}</p>
                    <span className="text-xs text-white/40 mt-1 block">{q.points} баллов</span>
                  </div>
                </div>
                <svg className={clsx('flex-shrink-0 w-4 h-4 text-white/30 transition-transform mt-1', activeQ === i && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeQ === i && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Hint */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="text-xs font-bold text-amber-400 mb-1">Подсказка</div>
                    <p className="text-white/70 text-sm">{q.hint}</p>
                  </div>

                  {/* User answer */}
                  <div>
                    <div className="text-xs font-bold text-white/40 mb-2">Ваш ответ</div>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white/80 text-sm resize-none focus:outline-none focus:border-brand-blue/50 min-h-[100px]"
                      placeholder="Напишите ответ здесь..."
                      value={userAnswers[i] || ''}
                      onChange={e => setUserAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    />
                  </div>

                  {/* Rubric */}
                  <div>
                    <div className="text-xs font-bold text-white/40 mb-2">Критерии оценки</div>
                    <ul className="space-y-1">
                      {q.rubric.map((r, j) => (
                        <li key={j} className="flex gap-2 text-sm text-white/60">
                          <span className="text-green-400 flex-shrink-0">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Model answer toggle */}
                  <button
                    onClick={() => toggleModel(i)}
                    className="text-sm text-brand-blue hover:underline"
                  >
                    {showModel[i] ? '▲ Скрыть эталон' : '▼ Показать эталонный ответ'}
                  </button>

                  {showModel[i] && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="text-xs font-bold text-green-400 mb-2">Эталонный ответ</div>
                      {q.model.split('\n\n').map((para, j) => (
                        <p key={j} className="text-white/80 text-sm leading-relaxed mb-2 last:mb-0">{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pitfalls */}
      <div className="glass rounded-xl p-5 mb-6">
        <h3 className="font-bold text-white mb-3">⚠️ Типичные ошибки</h3>
        <ul className="space-y-2">
          {caseData.pitfalls.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-white/70">
              <span className="text-red-400 flex-shrink-0">✕</span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* Self-check */}
      <div className="glass rounded-xl p-5 mb-8">
        <h3 className="font-bold text-white mb-3">✅ Self-check</h3>
        <ul className="space-y-2">
          {caseData.selfCheck.map((s, i) => (
            <li key={i} className="text-sm text-white/70">{s}</li>
          ))}
        </ul>
      </div>

      {/* Notes */}
      <div className="mb-8">
        <h3 className="font-bold text-white mb-3">Заметки</h3>
        <textarea
          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white/80 text-sm resize-none focus:outline-none focus:border-brand-blue/50 min-h-[120px]"
          placeholder="Личные заметки по кейсу..."
          defaultValue={savedNote}
          onBlur={e => progress.saveCaseNote(id, e.target.value)}
        />
      </div>

      {/* Mark done */}
      <button
        onClick={() => {
          const lp = progress.lectureProgress
          caseData.lectureIds.forEach(lid => progress.markLectureCaseDone(lid))
        }}
        className="px-6 py-3 rounded-xl font-semibold text-sm bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors"
      >
        ✓ Кейс разобран
      </button>
    </div>
  )
}
