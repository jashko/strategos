export type PhaseId = 'direction' | 'diagnosis' | 'choice' | 'execution';

export interface Phase {
  id: PhaseId;
  number: number;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  textColor: string;
  lectures: number[];
}

export interface Concept {
  id: string;
  name: string;
  authors: string;
  essence: string;
  explanation: string;
  example: string;
  confusables: { name: string; distinction: string }[];
  connections: { prev: string[]; next: string[] };
  examNote: string;
}

export interface Lecture {
  id: number;
  title: string;
  subtitle: string;
  phase: PhaseId;
  question: string;
  intro: string;
  concepts: Concept[];
  articleIds: string[];
}

export interface Article {
  id: string;
  title: string;
  authors: string;
  source: string;
  year: string;
  lectureIds: number[];
  thesis: string;
  keyPoints: string[];
  quote: string;
  examRelevance: string;
}

export interface CaseQuestion {
  text: string;
  points: number;
  hint: string;
  rubric: string[];
  model: string;
}

export interface Case {
  id: string;
  company: string;
  year: string;
  industry: string;
  context: string;
  lectureIds: number[];
  tools: string[];
  questions: CaseQuestion[];
  pitfalls: string[];
  selfCheck: string[];
}

export type QuestionPart = 1 | 2 | 3 | 4;

export interface Question {
  id: string;
  part: QuestionPart;
  text: string;
  options?: string[];
  correct: number | number[] | string[];
  points: number;
  conceptId: string;
  explanation: string;
}

export interface ComparisonRow {
  label: string;
  cells: string[];
}

export interface ComparisonTable {
  id: string;
  title: string;
  description: string;
  lectureIds: number[];
  columns: string[];
  rows: ComparisonRow[];
}

export interface ExamResult {
  date: string;
  scores: { p1: number; p2: number; p3: number; p4: number };
  total: number;
  timeUsed: number;
}

export interface Progress {
  completedConcepts: string[];
  lectureProgress: Record<number, { stage: number; quizDone: boolean; caseDone: boolean }>;
  quizResults: Record<string, { correct: number; wrong: number }>;
  caseNotes: Record<string, string>;
  examHistory: ExamResult[];
  favoriteArticles: string[];
}
