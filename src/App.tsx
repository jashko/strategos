import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import CourseMap from './views/CourseMap'
import LectureView from './views/LectureView'
import ConceptView from './views/ConceptView'
import ArticlesView from './views/ArticlesView'
import ArticleDetail from './views/ArticleDetail'
import ConnectionsView from './views/ConnectionsView'
import CaseStudy from './views/CaseStudy'
import ExamMode from './views/ExamMode'
import Dashboard from './views/Dashboard'

function parseHash(hash: string): { view: string; param?: string } {
  const h = hash.replace(/^#/, '')
  if (!h) return { view: 'map' }
  const [view, param] = h.split('/')
  return { view, param }
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const { view, param } = parseHash(hash)

  function renderView() {
    switch (view) {
      case 'map': return <CourseMap />
      case 'lecture': return <LectureView id={Number(param)} />
      case 'concept': return <ConceptView id={param || ''} />
      case 'articles': return <ArticlesView />
      case 'article': return <ArticleDetail id={param || ''} />
      case 'connections': return <ConnectionsView />
      case 'case': return <CaseStudy id={param || ''} />
      case 'exam': return <ExamMode />
      case 'dashboard': return <Dashboard />
      default: return <CourseMap />
    }
  }

  return (
    <Layout currentView={view} currentParam={param}>
      {renderView()}
    </Layout>
  )
}
