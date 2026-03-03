import { useState } from 'react'
import '../styles/MedicationSearch.css'

interface MedicationSearchProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export default function MedicationSearch({ onSearch, isLoading }: MedicationSearchProps) {
  const [searchInput, setSearchInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchInput)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  const handleClear = () => {
    setSearchInput('')
    onSearch('')
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search medications... (e.g., ibuprofen, aspirin, metformin)"
          value={searchInput}
          onChange={handleChange}
          className="search-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="search-button"
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
        {searchInput && (
          <button
            type="button"
            className="clear-button"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </button>
        )}
      </div>
    </form>
  )
}
