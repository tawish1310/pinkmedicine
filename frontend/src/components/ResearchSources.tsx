import { useEffect, useState } from 'react'
import axios from 'axios'
import '../styles/ResearchSources.css'

interface ResearchSourceInfo {
  source: string
  medications: number
  lastSync?: string
  description?: string
}

export default function ResearchSources() {
  const [sources, setSources] = useState<ResearchSourceInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_BASE = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`${API_BASE}/api/research/sources`)
        setSources(response.data.sources || [])
      } catch (err) {
        setError('Failed to load research sources')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSources()
  }, [API_BASE])

  if (isLoading) {
    return <div className="sources-loading">Loading data sources...</div>
  }

  return (
    <div className="research-sources">
      <h2>📚 Research Data Sources</h2>
      {error && <p className="sources-error">{error}</p>}

      <div className="sources-grid">
        {sources.length > 0 ? (
          sources.map((source) => (
            <div key={source.source} className="source-card">
              <h3 className="source-name">{formatSourceName(source.source)}</h3>
              <p className="source-description">{source.description}</p>
              <div className="source-stats">
                <p>
                  <strong>{source.medications}</strong> medications
                </p>
                {source.lastSync && (
                  <p className="source-sync">
                    Last updated: {new Date(source.lastSync).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="sources-empty">No research sources available</p>
        )}
      </div>
    </div>
  )
}

function formatSourceName(source: string): string {
  const names: { [key: string]: string } = {
    AWAREX: '🧠 AwareDX',
    EQUAL_CARE: '👩‍⚕️ EQUAL CARE Registry',
    FAERS: '⚠️ OpenFDA FAERS'
  }
  return names[source] || source
}
