import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../styles/MedicationDetail.css'

interface FAERSData {
  femaleCount: number
  maleCount: number
  totalCount: number
  femaleEvents?: any[]
  maleEvents?: any[]
}

interface ClinicalTrial {
  nctId: string
  title: string
  overallStatus?: string
  phases?: string[]
  enrollment: {
    count: number
    type: string
  }
  sexes: string[]
  womenPercentage: number
  studyType?: string
  studyPhase?: string
}

interface ClinicalTrialsSummary {
  total: number
  trials: ClinicalTrial[]
  womenParticipationAnalysis?: {
    totalTrials: number
    trialsIncludingWomen: number
    percentageTrialsWithWomen: number
    totalEnrollment: number
    totalWomenEnrollment: number
    overallWomenPercentage: number
  }
}

interface ReactionCount {
  reaction: string
  count: number
}

interface ResearchSummary {
  faers?: {
    femaleReportCount: number
    maleReportCount: number
    totalSexSpecificReports: number
    femaleToMaleReportRatio: number | null
    womenReportSharePercent: number
    menReportSharePercent: number
    femaleSeriousEventRatePercent: number
    maleSeriousEventRatePercent: number
    topFemaleReactions: ReactionCount[]
    topMaleReactions: ReactionCount[]
  }
  keyInsights?: {
    question1_wasResearchedInWomen: boolean
    question1_percentTrialsIncludedWomen: number
    question2_womenReportingPostMarketEvents: number
    question2_topWomenReportedEffects: ReactionCount[]
  }
}

interface CombinedResearchResponse {
  medication: string
  clinicalTrials?: ClinicalTrialsSummary
  adverseEvents?: FAERSData
  researchSummary?: ResearchSummary
  debug?: {
    mode?: string
    generatedAt?: string
    validation?: {
      topFemaleMatchesKeyInsight?: boolean
      trialCountMatchesSample?: boolean
    }
    request?: unknown
    rawSources?: unknown
  }
}

interface MedicationDetail {
  id: number
  genericName: string
  brandNames: string[]
  fdaApproved: boolean
  drugClass?: string
  indication?: string
}

const API_BASE = import.meta.env.VITE_API_URL || ''

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  }
  return fallback
}

export default function MedicationDetail() {
  const isDevMode = import.meta.env.DEV
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [medication, setMedication] = useState<MedicationDetail | null>(null)
  const [combinedData, setCombinedData] = useState<CombinedResearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCombinedLoading, setIsCombinedLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [combinedError, setCombinedError] = useState<string | null>(null)
  const [showDebugJson, setShowDebugJson] = useState(false)

  useEffect(() => {
    const fetchMedicationDetail = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`${API_BASE}/api/medications/${id}`)
        setMedication(response.data)
        setError(null)

        // Always use genericName for API queries (consistent across brand names)
        await fetchCombinedData(response.data.genericName)
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to fetch medication details'))
        setMedication(null)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchMedicationDetail()
    }
  }, [id])

  const fetchCombinedData = async (medicationName: string) => {
    try {
      setIsCombinedLoading(true)
      setCombinedError(null)

      const response = await axios.get(`${API_BASE}/api/research/combined/search`, {
        params: {
          medication: medicationName,
          ...(isDevMode ? { debug: 'true' } : {})
        }
      })

      setCombinedData(response.data)
    } catch (err: unknown) {
      setCombinedError(getErrorMessage(err, 'Failed to fetch combined research data'))
    } finally {
      setIsCombinedLoading(false)
    }
  }

  const faersData = combinedData?.adverseEvents || null
  const clinicalTrials = combinedData?.clinicalTrials || null
  const womenAnalysis = clinicalTrials?.womenParticipationAnalysis
  const faersSummary = combinedData?.researchSummary?.faers
  
  // Get distinct brand names (filter out those that match generic name)
  const distinctBrands = medication 
    ? medication.brandNames.filter(b => b.toLowerCase() !== medication.genericName.toLowerCase())
    : [];

  if (isLoading) {
    return <div className="detail-loading">Loading medication details...</div>
  }

  if (error) {
    return (
      <div className="detail-error">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Search
        </button>
      </div>
    )
  }

  if (!medication) {
    return (
      <div className="detail-not-found">
        <p>Medication not found</p>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Search
        </button>
      </div>
    )
  }

  return (
    <div className="medication-detail">
      <button onClick={() => navigate('/')} className="back-btn">
        ← Back to Search
      </button>

      <div className="detail-header">
        <div className="detail-title">
          <h1>{medication.genericName}</h1>
          {medication.fdaApproved && (
            <span className="fda-badge">FDA Approved</span>
          )}
        </div>

        <div className="detail-meta">
          {distinctBrands.length > 0 && (
            <div className="meta-item brands-highlight">
              <strong>Brand Names:</strong> {distinctBrands.join(', ')}
            </div>
          )}
          {medication.drugClass && (
            <div className="meta-item">
              <strong>Drug Class:</strong> {medication.drugClass}
            </div>
          )}
          {medication.indication && (
            <div className="meta-item">
              <strong>Indication:</strong> {medication.indication}
            </div>
          )}
        </div>
      </div>

      {/* Combined Research Section */}
      <div className="section-block">
        <h2>🔬 Combined Live Research (ClinicalTrials.gov + OpenFDA FAERS)</h2>
        {isCombinedLoading && <div className="loading-small">Loading live research data...</div>}
        {combinedError && <div className="info-note">{combinedError}</div>}

        {isDevMode && combinedData && (
          <div className="debug-panel">
            <div className="debug-panel-header">
              <strong>Dev Debug: Combined Response Object</strong>
              <button
                type="button"
                className="debug-toggle-btn"
                onClick={() => setShowDebugJson((previous) => !previous)}
              >
                {showDebugJson ? 'Hide JSON' : 'Show JSON'}
              </button>
            </div>

            {combinedData.debug?.validation && (
              <div className="debug-validation-row">
                <span>Top reactions match insight: <strong>{String(combinedData.debug.validation.topFemaleMatchesKeyInsight)}</strong></span>
                <span>Trial count matches sample: <strong>{String(combinedData.debug.validation.trialCountMatchesSample)}</strong></span>
              </div>
            )}

            {showDebugJson && (
              <pre className="debug-json-box">
                {JSON.stringify(combinedData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* FDA FAERS Data Section */}
      {faersData && (
        <div className="faers-section">
          <h2>📊 FDA Adverse Event Reports (FAERS)</h2>
          <div className="faers-stats">
            <div className="stat-box female">
              <div className="stat-number">{faersData.femaleCount.toLocaleString()}</div>
              <div className="stat-label">FAERS Case Reports in Women</div>
            </div>
            <div className="stat-box male">
              <div className="stat-number">{faersData.maleCount.toLocaleString()}</div>
              <div className="stat-label">FAERS Case Reports in Men</div>
            </div>
            <div className="stat-box total">
              <div className="stat-number">{faersData.totalCount.toLocaleString()}</div>
              <div className="stat-label">Total FAERS Case Reports</div>
            </div>
          </div>

          <div className="info-note">
            These are <strong>post-market FAERS case reports</strong> (real-world safety reports), not the number of women enrolled in clinical trials.
            FAERS totals can be higher than trial enrollment because they aggregate reports across years and can include multiple reports per patient.
          </div>

          {faersData.totalCount > 0 && (
            <div className="faers-insight">
              {faersData.femaleCount > faersData.maleCount ? (
                <p className="insight-text">
                  ⚠️ Women reported adverse events <strong>{(faersData.femaleCount / Math.max(faersData.maleCount, 1)).toFixed(1)}x more frequently</strong> than men for this medication.
                </p>
              ) : faersData.maleCount > faersData.femaleCount ? (
                <p className="insight-text">
                  ⚠️ Men reported adverse events <strong>{(faersData.maleCount / Math.max(faersData.femaleCount, 1)).toFixed(1)}x more frequently</strong> than women for this medication.
                </p>
              ) : (
                <p className="insight-text">
                  Reports are relatively balanced between men and women.
                </p>
              )}
            </div>
          )}

          {faersSummary?.topFemaleReactions?.length ? (
            <div className="women-effects-card">
              <h3>Top 5 adverse effects reported by women</h3>
              <p className="women-effects-subtext">
                Women report share: <strong>{faersSummary.womenReportSharePercent}%</strong> · Serious event rate: <strong>{faersSummary.femaleSeriousEventRatePercent}%</strong>
                <br />
                Ranked by FAERS report frequency (not incidence rate).
              </p>
              <ul className="women-effects-list">
                {faersSummary.topFemaleReactions.slice(0, 5).map((item) => (
                  <li key={item.reaction}>
                    <span className="effect-name">{item.reaction}</span>
                    <span className="effect-count">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {/* Clinical Trials Section */}
      {clinicalTrials && (
        <div className="faers-section">
          <h2>🧪 ClinicalTrials.gov — Trial References</h2>

          <div className="faers-insight">
            <p className="insight-text">
              Women included in <strong>{womenAnalysis?.percentageTrialsWithWomen || 0}%</strong> of sampled trials.
              {' '}Trials analyzed: <strong>{womenAnalysis?.totalTrials?.toLocaleString?.() || 0}</strong>
              {' '}of <strong>{clinicalTrials.total?.toLocaleString?.() || 0}</strong> total matched trials.
              {' '}Estimated women participants: <strong>{womenAnalysis?.totalWomenEnrollment?.toLocaleString?.() || 0}</strong>
              {' '}of <strong>{womenAnalysis?.totalEnrollment?.toLocaleString?.() || 0}</strong>.
            </p>
          </div>

          {clinicalTrials.trials?.length > 0 && (
            <div className="trial-table-wrapper">
              <table className="trial-table">
                <thead>
                  <tr>
                    <th>NCT</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Phases</th>
                    <th>Enrollment</th>
                    <th>Women %</th>
                    <th>Est. Women</th>
                    <th>Sex</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicalTrials.trials.slice(0, 10).map((trial) => (
                    <tr key={trial.nctId}>
                      <td>
                        <a
                          href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="trial-link"
                        >
                          {trial.nctId}
                        </a>
                      </td>
                      <td className="trial-title-cell">{trial.title}</td>
                      <td>{trial.overallStatus || 'Not reported'}</td>
                      <td>{trial.phases?.length ? trial.phases.join(', ') : (trial.studyPhase || 'Not reported')}</td>
                      <td>{(trial.enrollment?.count || 0).toLocaleString()}</td>
                      <td>{trial.womenPercentage || 0}%</td>
                      <td>{Math.round(((trial.enrollment?.count || 0) * (trial.womenPercentage || 0)) / 100).toLocaleString()}</td>
                      <td>{trial.sexes?.join(', ') || 'Not reported'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

