import { useState } from 'react'
import { PHASES } from '../content/phases'
import { LECTURES } from '../content/lectures'
import { useProgress, getTotalConceptsDone, getOverallAccuracy } from '../store/progress'
import clsx from 'clsx'

const TOTAL_CONCEPTS = LECTURES.reduce((sum, l) => sum + l.concepts.length, 0)

interface Props {
  currentView: string
  currentParam?: string
  children: React.ReactNode
}

export default function Layout({ currentView, currentParam, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const progress = useProgress()
  const done = getTotalConceptsDone(progress)
  const accuracy = getOverallAccuracy(progress)

  return (
    <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-dark-800 border-r border-white/5 transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-64' : 'w-14'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-6 h-6 text-white/50 hover:text-white transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          {sidebarOpen && (
            <a href="#map" className="font-bold text-white text-lg leading-tight">
              СТРАТЕГОС
              <span className="block text-xs font-normal text-white/40">Экзаменатор НИУ ВШЭ</span>
            </a>
          )}
        </div>

        {/* Progress bar */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>{done}/{TOTAL_CONCEPTS} концепций</span>
              <span>{accuracy}% точность</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-blue rounded-full transition-all"
                style={{ width: `${Math.round((done / TOTAL_CONCEPTS) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          <NavLink href="#dashboard" icon="⚡" label="Дашборд" open={sidebarOpen} active={currentView === 'dashboard'} />
          <NavLink href="#map" icon="🗺" label="Карта курса" open={sidebarOpen} active={currentView === 'map'} />

          {/* Phases & Lectures */}
          {PHASES.map(phase => (
            <div key={phase.id} className="pt-2">
              {sidebarOpen && (
                <div className={clsx('text-xs font-semibold px-3 py-1 mb-1', phase.textColor)}>
                  Ф{phase.number}: {phase.title}
                </div>
              )}
              {phase.lectures.map(lid => {
                const lec = LECTURES.find(l => l.id === lid)!
                const lp = progress.lectureProgress[lid]
                const conceptsDone = progress.completedConcepts.filter(
                  cid => lec.concepts.some(c => c.id === cid)
                ).length
                const allDone = conceptsDone === lec.concepts.length
                return (
                  <NavLink
                    key={lid}
                    href={`#lecture/${lid}`}
                    icon={allDone ? '✓' : `${lid}`}
                    label={lec.title}
                    open={sidebarOpen}
                    active={currentView === 'lecture' && currentParam === String(lid)}
                    indent
                    done={allDone}
                  />
                )
              })}
            </div>
          ))}

          <div className="pt-2 border-t border-white/5">
            <NavLink href="#articles" icon="📄" label="Статьи HBR" open={sidebarOpen} active={currentView === 'articles'} />
            <NavLink href="#connections" icon="🔗" label="Связи и таблицы" open={sidebarOpen} active={currentView === 'connections'} />
          </div>

          <div className="pt-2 border-t border-white/5">
            {sidebarOpen && <div className="text-xs font-semibold text-white/30 px-3 py-1">Кейсы</div>}
            <NavLink href="#case/mts" icon="📱" label="МТС" open={sidebarOpen} active={currentView === 'case' && currentParam === 'mts'} indent />
            <NavLink href="#case/aeroflot" icon="✈️" label="Аэрофлот" open={sidebarOpen} active={currentView === 'case' && currentParam === 'aeroflot'} indent />
            <NavLink href="#case/vtb-wb" icon="🏦" label="ВТБ×WB" open={sidebarOpen} active={currentView === 'case' && currentParam === 'vtb-wb'} indent />
            <NavLink href="#case/wink" icon="📺" label="Wink" open={sidebarOpen} active={currentView === 'case' && currentParam === 'wink'} indent />
          </div>
        </nav>

        {/* Exam button */}
        <div className="p-3 border-t border-white/5">
          <a
            href="#exam"
            className={clsx(
              'flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold text-sm transition-all',
              currentView === 'exam'
                ? 'bg-red-500 text-white'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
              !sidebarOpen && 'justify-center'
            )}
          >
            <span>🎯</span>
            {sidebarOpen && 'Экзамен'}
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

interface NavLinkProps {
  href: string
  icon: string
  label: string
  open: boolean
  active: boolean
  indent?: boolean
  done?: boolean
}

function NavLink({ href, icon, label, open, active, indent, done }: NavLinkProps) {
  return (
    <a
      href={href}
      className={clsx(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all',
        indent && 'pl-5',
        active ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5',
        done && !active && 'text-green-400/70',
        !open && 'justify-center px-2'
      )}
      title={!open ? label : undefined}
    >
      <span className="flex-shrink-0 text-base leading-none w-5 text-center">{icon}</span>
      {open && <span className="truncate">{label}</span>}
    </a>
  )
}
