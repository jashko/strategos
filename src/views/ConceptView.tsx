import { getConcept, getAllConcepts } from '../content/lectures'
import { PHASES } from '../content/phases'
import { useProgress } from '../store/progress'
import clsx from 'clsx'

interface Props { id: string }

export default function ConceptView({ id }: Props) {
  const result = getConcept(id)
  if (!result) return (
    <div className="p-8 text-center">
      <div className="text-white/40 text-lg">Концепция не найдена</div>
      <a href="#map" className="text-brand-blue mt-4 inline-block">← Карта</a>
    </div>
  )

  const { concept: c, lecture: lec } = result
  const phase = PHASES.find(p => p.id === lec.phase)!
  const progress = useProgress()
  const isDone = progress.completedConcepts.includes(c.id)

  // Find prev/next concepts in the lecture
  const lecIdx = lec.concepts.findIndex(x => x.id === c.id)
  const prevInLec = lecIdx > 0 ? lec.concepts[lecIdx - 1] : null
  const nextInLec = lecIdx < lec.concepts.length - 1 ? lec.concepts[lecIdx + 1] : null

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-6 flex-wrap">
        <a href="#map" className="hover:text-white">Карта</a>
        <span>/</span>
        <a href={`#lecture/${lec.id}`} className={clsx('hover:text-white', phase.textColor)}>
          Лекция {lec.id}: {lec.title}
        </a>
        <span>/</span>
        <span className="text-white">{c.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className={clsx('text-xs font-semibold mb-1', phase.textColor)}>
          {lec.title}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{c.name}</h1>
        <p className="text-white/50 text-sm">{c.authors}</p>
      </div>

      {/* Block 1: Location in map */}
      <Section label="📍 Место в курсе">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded border', phase.bg, phase.textColor)}>
            Фаза {phase.number}: {phase.title}
          </span>
          <span className="text-white/40 text-sm">Лекция {lec.id}: {lec.title}</span>
        </div>
      </Section>

      {/* Block 2: Strategic question */}
      <Section label="❓ Стратегический вопрос">
        <p className="text-white/80">{lec.question}</p>
      </Section>

      {/* Block 3: Essence */}
      <Section label="💡 Суть">
        <div className="glass rounded-lg p-4">
          <p className="text-white font-medium leading-relaxed">{c.essence}</p>
        </div>
        <p className="text-white/50 text-sm mt-2">{c.authors}</p>
      </Section>

      {/* Block 4: Explanation */}
      <Section label="📖 Объяснение">
        {c.explanation.split('\n\n').map((para, i) => (
          <p key={i} className="text-white/80 leading-relaxed mb-3 last:mb-0">{para}</p>
        ))}
      </Section>

      {/* Block 5: Connections */}
      {(c.connections.prev.length > 0 || c.connections.next.length > 0) && (
        <Section label="🔗 Связи">
          {c.connections.prev.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-white/40 mb-2">← Приходит из</div>
              <div className="flex flex-wrap gap-2">
                {c.connections.prev.map(pid => <ConceptChip key={pid} id={pid} />)}
              </div>
            </div>
          )}
          {c.connections.next.length > 0 && (
            <div>
              <div className="text-xs text-white/40 mb-2">→ Ведёт к</div>
              <div className="flex flex-wrap gap-2">
                {c.connections.next.map(nid => <ConceptChip key={nid} id={nid} />)}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Block 6: Confusables */}
      {c.confusables.length > 0 && (
        <Section label="⚠️ Не путать с">
          <div className="space-y-3">
            {c.confusables.map((cf, i) => (
              <div key={i} className="glass rounded-lg p-4 border-l-2 border-amber-500/50">
                <div className="font-semibold text-amber-300 text-sm mb-1">{cf.name}</div>
                <p className="text-white/70 text-sm">{cf.distinction}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Block 7: Example */}
      <Section label="🏢 Пример">
        <div className="glass rounded-lg p-4 border-l-2 border-brand-blue/50">
          <p className="text-white/80 leading-relaxed">{c.example}</p>
        </div>
      </Section>

      {/* Block 8: Exam note */}
      <Section label="🎯 На экзамен">
        <div className="glass rounded-lg p-4 border-l-2 border-red-500/50">
          <p className="text-white/80 text-sm leading-relaxed">{c.examNote}</p>
        </div>
      </Section>

      {/* Mark done button */}
      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/10">
        <button
          onClick={() => {
            if (!isDone) progress.markConceptDone(c.id)
          }}
          className={clsx(
            'px-6 py-3 rounded-xl font-semibold text-sm transition-all',
            isDone
              ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
              : 'bg-brand-blue hover:bg-blue-500 text-white'
          )}
        >
          {isDone ? '✓ Изучено' : 'Отметить как изученное'}
        </button>
        <a href={`#lecture/${lec.id}`} className="text-white/40 hover:text-white text-sm">
          ← К лекции {lec.id}
        </a>
      </div>

      {/* Prev/Next in lecture */}
      <div className="flex justify-between mt-6">
        {prevInLec && (
          <a href={`#concept/${prevInLec.id}`} className="text-white/40 hover:text-white text-sm">
            ← {prevInLec.name}
          </a>
        )}
        {nextInLec && (
          <a href={`#concept/${nextInLec.id}`} className="text-white/40 hover:text-white text-sm ml-auto">
            {nextInLec.name} →
          </a>
        )}
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">{label}</h2>
      {children}
    </div>
  )
}

function ConceptChip({ id }: { id: string }) {
  const result = getConcept(id)
  if (!result) return null
  return (
    <a
      href={`#concept/${id}`}
      className="concept-link text-sm"
    >
      {result.concept.name}
    </a>
  )
}
