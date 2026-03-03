import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import axios from 'axios'
import './App.css'
import MedicationSearch from './components/MedicationSearch'
import MedicationList from './components/MedicationList'
import MedicationDetail from './components/MedicationDetail'
import ResearchSources from './components/ResearchSources'

function AppContent() {
  const location = useLocation()
  const isDetailPage = location.pathname.startsWith('/medication/')

  if (isDetailPage) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <img src="/logo.png" alt="Pink Medicine" className="app-logo" />
            <h1>Understand Your Medicine</h1>
          </div>
        </header>
        <div className="app-container">
          <main className="app-main">
            <MedicationDetail />
          </main>
        </div>
      </div>
    )
  }

  return <AppHome />
}

function AppHome() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalResults, setTotalResults] = useState(0)

  const API_BASE = import.meta.env.VITE_API_URL || ''
  const PAGE_SIZE = 20

  // Fetch medications
  const fetchMedications = async (query: string = '', page: number = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      const skip = page * PAGE_SIZE
      const url = query
        ? `${API_BASE}/api/medications/search?q=${encodeURIComponent(query)}&skip=${skip}&take=${PAGE_SIZE}`
        : `${API_BASE}/api/medications?skip=${skip}&take=${PAGE_SIZE}`

      const response = await axios.get(url)
      setMedications(response.data.data)
      setTotalResults(response.data.total)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch medications')
      setMedications([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load initial data
  useEffect(() => {
    fetchMedications('', 0)
  }, [])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(0)
    fetchMedications(query, 0)
  }

  // Handle pagination
  const handleNextPage = () => {
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    fetchMedications(searchQuery, nextPage)
  }

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      const prevPage = currentPage - 1
      setCurrentPage(prevPage)
      fetchMedications(searchQuery, prevPage)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <img src="/logo.png" alt="Pink Medicine" className="app-logo" />
          <h1>Understand Your Medicine</h1>
        </div>
      </header>

      <div className="app-container">
        <main className="app-main">
          {/* Search Component */}
          <MedicationSearch onSearch={handleSearch} isLoading={isLoading} />

          {/* Error Display */}
          {error && <div className="error-banner">{error}</div>}

          {/* Loading State */}
          {isLoading && <div className="loading">Loading medications...</div>}

          {/* Results */}
          {!isLoading && (
            <>
              {medications.length > 0 ? (
                <>
                  <div className="results-info">
                    Showing {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalResults)} of {totalResults} results
                  </div>
                  <MedicationList medications={medications} />

                  {/* Pagination */}
                  <div className="pagination">
                    <button
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      className="pagination-btn"
                    >
                      ← Previous
                    </button>
                    <span className="pagination-info">
                      Page {currentPage + 1} of {Math.ceil(totalResults / PAGE_SIZE)}
                    </span>
                    <button
                      onClick={handleNextPage}
                      disabled={(currentPage + 1) * PAGE_SIZE >= totalResults}
                      className="pagination-btn"
                    >
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                !isLoading && <div className="no-results">No medications found. Try a different search.</div>
              )}
            </>
          )}
        </main>

        <aside className="app-sidebar">
          <div className="info-box">
            <h3>About This Project</h3>
            <p>
              This research tool aggregates medication data from multiple sources to help identify how medications affect women differently than men.
            </p>
            <ul>
              <li><strong>ClinicalTrials.gov:</strong> Clinical trial enrollment and</li>
              <li><strong>OpenFDA FAERS:</strong> Adverse event reports</li>
            </ul>
          </div>

          <div className="info-box">
            <h3>How to Use</h3>
            <ol>
              <li>Search for a medication name</li>
              <li>Review sex-specific findings</li>
              <li>Check research sources for citations</li>
              <li>Consult your healthcare provider</li>
            </ol>
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        <p>Built with ❤️ for women's health research | Open Source Project</p>
      </footer>
    </div>
  )
}

interface Medication {
  id: number
  name: string
  genericName?: string
  fdaApproved: boolean
  drugClass?: string
  indication?: string
  dosages?: string[]
  variantCount?: number
  variantLabels?: string[]
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/medication/:id" element={<AppContent />} />
      </Routes>
    </Router>
  )
}

export default App
