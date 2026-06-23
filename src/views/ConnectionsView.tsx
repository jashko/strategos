import { useState } from 'react'
import { COMPARISON_TABLES, AUTHOR_DEBATES } from '../content/connections'

export default function ConnectionsView() {
  const [activeTab, setActiveTab] = useState<'tables' | 'debates'>('tables')
  const [activeTable, setActiveTable] = useState(COMPARISON_TABLES[0].id)

  const table = COMPARISON_TABLES.find(t => t.id === activeTable)!

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Связи и сравнения</h1>
        <p className="text-white/60">Таблицы сравнений концепций и дебаты авторов</p>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2 mb-6">
        {(['tables', 'debates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-brand-blue text-white'
                : 'text-white/50 hover:text-white bg-white/5'
            }`}
          >
            {tab === 'tables' ? '📊 Таблицы сравнений' : '⚔️ Дебаты авторов'}
          </button>
        ))}
      </div>

      {activeTab === 'tables' && (
        <div className="flex gap-6">
          {/* Table list */}
          <div className="w-48 flex-shrink-0 space-y-1">
            {COMPARISON_TABLES.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTable(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTable === t.id
                    ? 'bg-brand-blue text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          {/* Table content */}
          <div className="flex-1 glass rounded-xl p-5 overflow-x-auto">
            <div className="mb-4">
              <h2 className="font-bold text-white text-lg">{table.title}</h2>
              <p className="text-white/50 text-sm">{table.description}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {table.columns.map((col, i) => (
                    <th
                      key={i}
                      className="text-left py-2 pr-4 text-white/60 font-semibold text-xs uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4 text-white/70 font-medium">{row.label}</td>
                    {row.cells.map((cell, j) => (
                      <td key={j} className="py-3 pr-4 text-white/60 leading-relaxed">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'debates' && (
        <div className="space-y-6">
          {AUTHOR_DEBATES.map(debate => (
            <div key={debate.id} className="glass rounded-xl p-6">
              <h2 className="font-bold text-white text-lg mb-4">{debate.topic}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="text-blue-400 font-semibold text-sm mb-1">
                    {debate.position1.author} ({debate.position1.year})
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{debate.position1.claim}</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold text-sm mb-1">
                    {debate.position2.author} ({debate.position2.year})
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{debate.position2.claim}</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-xs font-bold uppercase text-white/40 mb-2">Синтез</div>
                <p className="text-white/70 text-sm leading-relaxed">{debate.synthesis}</p>
              </div>
              <div className="mt-3 glass rounded-lg p-3 border-l-2 border-red-500/40">
                <div className="text-xs font-bold text-red-400 mb-1">На экзамен</div>
                <p className="text-white/60 text-xs">{debate.examNote}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
