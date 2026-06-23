import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Progress, ExamResult } from '../types'

const defaultProgress: Progress = {
  completedConcepts: [],
  lectureProgress: {},
  quizResults: {},
  caseNotes: {},
  examHistory: [],
  favoriteArticles: [],
}

interface ProgressStore extends Progress {
  markConceptDone: (id: string) => void;
  setLectureStage: (lectureId: number, stage: number) => void;
  markLectureQuizDone: (lectureId: number) => void;
  markLectureCaseDone: (lectureId: number) => void;
  recordQuizAnswer: (qid: string, correct: boolean) => void;
  saveCaseNote: (caseId: string, note: string) => void;
  addExamResult: (result: ExamResult) => void;
  toggleFavoriteArticle: (id: string) => void;
  resetAll: () => void;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...defaultProgress,

      markConceptDone(id) {
        const { completedConcepts } = get()
        if (!completedConcepts.includes(id)) {
          set({ completedConcepts: [...completedConcepts, id] })
        }
      },

      setLectureStage(lectureId, stage) {
        const prev = get().lectureProgress[lectureId] || { stage: 0, quizDone: false, caseDone: false }
        set({ lectureProgress: { ...get().lectureProgress, [lectureId]: { ...prev, stage: Math.max(prev.stage, stage) } } })
      },

      markLectureQuizDone(lectureId) {
        const prev = get().lectureProgress[lectureId] || { stage: 0, quizDone: false, caseDone: false }
        set({ lectureProgress: { ...get().lectureProgress, [lectureId]: { ...prev, quizDone: true, stage: Math.max(prev.stage, 2) } } })
      },

      markLectureCaseDone(lectureId) {
        const prev = get().lectureProgress[lectureId] || { stage: 0, quizDone: false, caseDone: false }
        set({ lectureProgress: { ...get().lectureProgress, [lectureId]: { ...prev, caseDone: true, stage: Math.max(prev.stage, 3) } } })
      },

      recordQuizAnswer(qid, correct) {
        const prev = get().quizResults[qid] || { correct: 0, wrong: 0 }
        set({ quizResults: { ...get().quizResults, [qid]: {
          correct: prev.correct + (correct ? 1 : 0),
          wrong: prev.wrong + (correct ? 0 : 1),
        }}})
      },

      saveCaseNote(caseId, note) {
        set({ caseNotes: { ...get().caseNotes, [caseId]: note } })
      },

      addExamResult(result) {
        set({ examHistory: [...get().examHistory, result] })
      },

      toggleFavoriteArticle(id) {
        const favs = get().favoriteArticles
        set({ favoriteArticles: favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id] })
      },

      resetAll() {
        set(defaultProgress)
      },
    }),
    { name: 'strategos-v2' }
  )
)

export function getLectureStage(progress: Progress, lectureId: number): number {
  return progress.lectureProgress[lectureId]?.stage ?? 0
}

export function getTotalConceptsDone(progress: Progress): number {
  return progress.completedConcepts.length
}

export function getLecturesCompleted(progress: Progress): number {
  return Object.values(progress.lectureProgress).filter(p => p.caseDone).length
}

export function getOverallAccuracy(progress: Progress): number {
  const results = Object.values(progress.quizResults)
  if (!results.length) return 0
  const total = results.reduce((s, r) => s + r.correct + r.wrong, 0)
  const correct = results.reduce((s, r) => s + r.correct, 0)
  return total ? Math.round((correct / total) * 100) : 0
}
