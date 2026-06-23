import { useState, useEffect, useRef } from 'react'
import { DEMO_QUESTIONS, checkPart3Answer } from '../content/questions'
import { useProgress } from '../store/progress'
import type { Question } from '../types'
import clsx from 'clsx'

type Phase = 'intro' | 'exam' | 'result'

const TOTAL_TIME = 90 * 60 // 90 minutes

export default function ExamMode() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [answers, setAnswers] = useState<Record<string, number | number[] | string>>({})
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [submitted, setSubmitted] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const progress = useProgress()

  const q1 = DEMO_QUESTIONS.filter(q => q.part === 1)
  const q2 = DEMO_QUESTIONS.filter(q => q.part === 2)
  const q3 = DEMO_QUESTIONS.filter(q => q.part === 3)

  useEffect(() => {
    if (phase === 'exam' && !submitted) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { handleSubmit(); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [phase, submitted])

  function startExam() {
    setAnswers({})
    setTimeLeft(TOTAL_TIME)
    setSubmitted(false)
    setStartTime(Date.now())
    setPhase('exam')
  }

  function toggleP2(qid: string, idx: number) {
    setAnswers(prev => {
      const cur = (prev[qid] as number[]) || []
      return {
        ...prev,
        [qid]: cur.includes(idx) ? cur.filter(x => x !== idx) : [...cur, idx].sort()
      }
    })
  }

  function handleSubmit() {
    clearInterval(intervalRef.current)
    setSubmitted(true)

    const timeUsed = Math.round((Date.now() - startTime) / 1000)
    let p1 = 0, p2 = 0, p3 = 0

    q1.forEach(q => {
      if ((answers[q.id] as number) === (q.correct as number)) p1 += q.points
    })
    q2.forEach(q => {
      const ans = ((answers[q.id] as number[]) || []).sort().join(',')
      const cor = ((q.correct as number[]) || []).sort().join(',')
      if (ans === cor) p2 += q.points
    })
    q3.forEach(q => {
      const ans = String(answers[q.id] || '')
      if (checkPart3Answer(ans, q.correct as string[])) p3 += q.points
    })

    const total = p1 + p2 + p3
    progress.addExamResult({
      date: new Date().toISOString(),
      scores: { p1, p2, p3, p4: 0 },
      total,
      timeUsed,
    })
    setPhase('result')
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  if (phase === 'intro') return <ExamIntro onStart={startExam} />
  if (phase === 'result') return <ExamResult answers={answers} questions={DEMO_QUESTIONS} onRetry={startExam} />

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Timer bar */}
      <div className="sticky top-0 z-10 bg-dark-900/90 backdrop-blur pb-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-bold text-white">Экзамен (демо)</h1>
          <div className={clsx('font-mono text-lg font-bold', timeLeft < 600 ? 'text-red-400' : 'text-white')}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={clsx('h-full rounded-full transition-all', timeLeft < 600 ? 'bg-red-500' : 'bg-brand-blue')}
            style={{ width: `${(timeLeft / TOTAL_TIME) * 100}%` }}
          />
        </div>
      </div>

      {/* Part 1 */}
      <PartHeader n={1} title="Тест — выберите один вариант" points="1 балл за вопрос · 12 вопросов" />
      <div className="space-y-6 mb-10">
        {q1.map((q, i) => (
          <div key={q.id} className="glass rounded-xl p-5">
            <div className="text-xs text-white/40 mb-2">Вопрос {i + 1}</div>
            <p className="text-white font-medium mb-4 leading-relaxed">{q.text}</p>
            <div className="space-y-2">
              {q.options!.map((opt, j) => (
                <label key={j} className={clsx(
                  'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  (answers[q.id] as number) === j
                    ? 'bg-brand-blue/20 border border-brand-blue/40'
                    : 'hover:bg-white/5 border border-transparent'
                )}>
                  <input
                    type="radio"
                    name={q.id}
                    className="mt-0.5 flex-shrink-0 accent-brand-blue"
                    checked={(answers[q.id] as number) === j}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: j }))}
                  />
                  <span className="text-white/80 text-sm leading-relaxed">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Part 2 */}
      <PartHeader n={2} title="Множественный выбор" points="3 балла за вопрос · 6 вопросов" />
      <div className="space-y-6 mb-10">
        {q2.map((q, i) => (
          <div key={q.id} className="glass rounded-xl p-5">
            <div className="text-xs text-white/40 mb-2">Вопрос {i + 13}</div>
            <p className="text-white font-medium mb-4 leading-relaxed">{q.text}</p>
            <div className="space-y-2">
              {q.options!.map((opt, j) => {
                const sel = ((answers[q.id] as number[]) || []).includes(j)
                return (
                  <label key={j} className={clsx(
                    'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    sel ? 'bg-brand-blue/20 border border-brand-blue/40' : 'hover:bg-white/5 border border-transparent'
                  )}>
                    <input
                      type="checkbox"
                      className="mt-0.5 flex-shrink-0 accent-brand-blue"
                      checked={sel}
                      onChange={() => toggleP2(q.id, j)}
                    />
                    <span className="text-white/80 text-sm leading-relaxed">{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Part 3 */}
      <PartHeader n={3} title="Краткий ответ" points="2 балла за вопрос · 8 вопросов" />
      <div className="space-y-4 mb-10">
        {q3.map((q, i) => (
          <div key={q.id} className="glass rounded-xl p-5">
            <div className="text-xs text-white/40 mb-2">Вопрос {i + 19}</div>
            <p className="text-white font-medium mb-3 leading-relaxed">{q.text}</p>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-blue/50"
              placeholder="Ваш ответ..."
              value={String(answers[q.id] || '')}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="sticky bottom-6">
        <button
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-brand-blue to-purple-500 hover:opacity-90 transition-opacity text-lg"
        >
          Сдать работу
        </button>
      </div>
    </div>
  )
}

function PartHeader({ n, title, points }: { n: number; title: string; points: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white font-bold text-sm">
        {n}
      </span>
      <div>
        <div className="font-bold text-white">{title}</div>
        <div className="text-xs text-white/40">{points}</div>
      </div>
    </div>
  )
}

function ExamIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Экзамен (демо)</h1>
      <p className="text-white/60 mb-8">Стратегический менеджмент НИУ ВШЭ 2026</p>

      <div className="glass rounded-2xl p-6 mb-6 space-y-3">
        {[
          ['⏱', 'Время', '90 минут'],
          ['📝', 'Часть 1', '12 вопросов с одним правильным ответом — 12 баллов'],
          ['☑️', 'Часть 2', '6 вопросов с множественным выбором — 18 баллов'],
          ['✍️', 'Часть 3', '8 вопросов с кратким ответом — 16 баллов'],
          ['📊', 'Итого', '46 баллов максимум'],
        ].map(([icon, label, val]) => (
          <div key={label} className="flex items-start gap-3">
            <span className="text-lg">{icon}</span>
            <div>
              <span className="text-white/60 text-sm">{label}: </span>
              <span className="text-white text-sm">{val}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-5 mb-8 border-l-4 border-amber-500/50">
        <div className="text-xs font-bold text-amber-400 mb-2">Правила</div>
        <ul className="text-white/70 text-sm space-y-1.5">
          <li>• Часть 1: выберите ОДИН правильный ответ</li>
          <li>• Часть 2: можно выбрать НЕСКОЛЬКО — балл только за точное совпадение</li>
          <li>• Часть 3: нечёткое совпадение ±30% Левенштейна считается верным</li>
          <li>• При истечении времени работа сдаётся автоматически</li>
        </ul>
      </div>

      <button
        onClick={onStart}
        className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-brand-blue to-purple-500 hover:opacity-90 transition-opacity text-lg"
      >
        Начать экзамен
      </button>
    </div>
  )
}

function ExamResult({ answers, questions, onRetry }: {
  answers: Record<string, number | number[] | string>
  questions: Question[]
  onRetry: () => void
}) {
  const q1 = questions.filter(q => q.part === 1)
  const q2 = questions.filter(q => q.part === 2)
  const q3 = questions.filter(q => q.part === 3)

  let p1 = 0, p2 = 0, p3 = 0, p1max = 0, p2max = 0, p3max = 0

  q1.forEach(q => { p1max += q.points; if ((answers[q.id] as number) === (q.correct as number)) p1 += q.points })
  q2.forEach(q => {
    p2max += q.points
    const ans = ((answers[q.id] as number[]) || []).sort().join(',')
    const cor = ((q.correct as number[]) || []).sort().join(',')
    if (ans === cor) p2 += q.points
  })
  q3.forEach(q => {
    p3max += q.points
    if (checkPart3Answer(String(answers[q.id] || ''), q.correct as string[])) p3 += q.points
  })

  const total = p1 + p2 + p3
  const totalMax = p1max + p2max + p3max
  const pct = Math.round((total / totalMax) * 100)

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Результат</h1>

      {/* Score */}
      <div className={clsx(
        'rounded-2xl p-8 mb-8 text-center',
        pct >= 80 ? 'bg-green-500/10 border border-green-500/20' :
        pct >= 60 ? 'bg-amber-500/10 border border-amber-500/20' :
        'bg-red-500/10 border border-red-500/20'
      )}>
        <div className={clsx('text-6xl font-bold mb-2', pct >= 80 ? 'text-green-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400')}>
          {total}/{totalMax}
        </div>
        <div className="text-white/60 text-lg">{pct}%</div>
        <div className="text-white/40 text-sm mt-1">
          {pct >= 80 ? 'Отлично' : pct >= 60 ? 'Удовлетворительно' : 'Нужно повторить'}
        </div>
      </div>

      {/* Breakdown */}
      <div className="glass rounded-xl p-5 mb-6 space-y-3">
        {[
          ['Часть 1 (тест)', p1, p1max],
          ['Часть 2 (множ. выбор)', p2, p2max],
          ['Часть 3 (краткий ответ)', p3, p3max],
        ].map(([label, got, max]) => (
          <div key={String(label)} className="flex items-center gap-4">
            <div className="w-40 text-sm text-white/60">{label}</div>
            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-blue rounded-full"
                style={{ width: `${Math.round(((got as number) / (max as number)) * 100)}%` }}
              />
            </div>
            <div className="w-16 text-right text-sm text-white font-medium">{got}/{max}</div>
          </div>
        ))}
      </div>

      {/* Per-question review */}
      <div className="space-y-3 mb-8">
        <h2 className="font-bold text-white">Разбор ответов</h2>
        {questions.map((q, i) => {
          const userAns = answers[q.id]
          let isCorrect = false
          if (q.part === 1) isCorrect = (userAns as number) === (q.correct as number)
          else if (q.part === 2) isCorrect = ((userAns as number[] || []).sort().join(',') === (q.correct as number[]).sort().join(','))
          else isCorrect = checkPart3Answer(String(userAns || ''), q.correct as string[])

          return (
            <div key={q.id} className={clsx('glass rounded-lg p-4 border-l-2', isCorrect ? 'border-green-500/50' : 'border-red-500/50')}>
              <div className="flex items-start gap-3">
                <span className={clsx('flex-shrink-0 text-sm font-bold', isCorrect ? 'text-green-400' : 'text-red-400')}>
                  {isCorrect ? '✓' : '✕'}
                </span>
                <div>
                  <div className="text-white/80 text-sm mb-2">{q.text}</div>
                  {!isCorrect && (
                    <p className="text-white/50 text-xs leading-relaxed">{q.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <button onClick={onRetry} className="flex-1 py-3 rounded-xl font-bold text-white bg-brand-blue hover:opacity-90 transition-opacity">
          Пройти снова
        </button>
        <a href="#map" className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/5 hover:bg-white/10 transition-colors text-center">
          Карта курса
        </a>
      </div>
    </div>
  )
}
