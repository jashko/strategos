import type { Phase } from '../types'

export const PHASES: Phase[] = [
  {
    id: 'direction',
    number: 1,
    title: 'КУДА',
    subtitle: 'Направление и смысл стратегии',
    color: '#4f8ef7',
    bg: 'bg-blue-500/10 border-blue-500/30',
    textColor: 'text-blue-400',
    lectures: [1, 2],
  },
  {
    id: 'diagnosis',
    number: 2,
    title: 'ДИАГНОЗ',
    subtitle: 'Где мы и что вокруг нас',
    color: '#22c55e',
    bg: 'bg-green-500/10 border-green-500/30',
    textColor: 'text-green-400',
    lectures: [3, 4, 5, 6],
  },
  {
    id: 'choice',
    number: 3,
    title: 'ВЫБОР',
    subtitle: 'Какую стратегию строить',
    color: '#a855f7',
    bg: 'bg-purple-500/10 border-purple-500/30',
    textColor: 'text-purple-400',
    lectures: [7, 8, 9, 10],
  },
  {
    id: 'execution',
    number: 4,
    title: 'РЕАЛИЗАЦИЯ',
    subtitle: 'Исполнение и будущее',
    color: '#f59e0b',
    bg: 'bg-amber-500/10 border-amber-500/30',
    textColor: 'text-amber-400',
    lectures: [11, 12],
  },
]

export function getPhase(id: string): Phase | undefined {
  return PHASES.find(p => p.id === id)
}
