import { Link } from 'react-router-dom'
import '../styles/MedicationList.css'

interface Medication {
  id: number
  genericName: string
  brandNames: string[]
  fdaApproved: boolean
  drugClass?: string
  indication?: string
}

interface MedicationListProps {
  medications: Medication[]
}

export default function MedicationList({ medications }: MedicationListProps) {
  if (medications.length === 0) {
    return <div className="medication-list-empty">No medications to display</div>
  }

  return (
    <div className="medication-list">
      {medications.map((med) => {
        // Filter out brand names that are same as generic
        const distinctBrands = med.brandNames.filter(
          b => b.toLowerCase() !== med.genericName.toLowerCase()
        );
        
        return (
          <div key={med.id} className="medication-card">
            <div className="medication-header">
              <h3 className="medication-name">
                {med.genericName}
              </h3>
              {med.fdaApproved && (
                <span className="fda-badge">FDA Approved</span>
              )}
            </div>

            <div className="medication-body">
              {distinctBrands.length > 0 && (
                <p className="medication-brands">
                  <strong>Brand Names:</strong> {distinctBrands.join(', ')}
                </p>
              )}

              {med.drugClass && (
                <p className="medication-property">
                  <strong>Drug Class:</strong> {med.drugClass}
                </p>
              )}

              {med.indication && (
                <p className="medication-property">
                  <strong>Indication:</strong> {med.indication}
                </p>
              )}
            </div>

            <div className="medication-footer">
              <Link to={`/medication/${med.id}`} className="view-details-btn">
                View Research Details →
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
