const DOSAGE_PATTERN = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|kg|ml|l|%|iu|meq|units?)\b/gi
const COUNT_PATTERN = /\b\d+\s*(?:count|ct)\b/gi
const FORMULATION_PATTERN =
  /\b(?:tablet|tablets|capsule|capsules|tab|tabs|pack|kit|dose pack|blister|extended release|delayed release|film coated|coated|injection|injectable|solution|oral|suspension|cream|gel|ointment|patch|spray)\b/gi
const NORMALIZATION_STOP_WORDS = new Set([
  'hr', 'hour', 'hours', 'dose', 'per', 'by', 'and', 'with',
  'hydrochloride', 'hcl', 'extended', 'release', 'oral', 'tablet', 'tablets',
  'capsule', 'capsules', 'solution', 'suspension', 'injection', 'injector',
  'pen', 'kit', 'pack', 'ml', 'mg', 'mcg', 'iu', 'units',
  'hemihydrate', 'invokamet', 'invokana',
])

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function formatMedicationBaseName(name: string): string {
  const cleaned = name
    .split('/')
    .map((segment) => {
      const tokens = segment
        .replace(/[\[\]{}()]/g, ' ')
        .replace(DOSAGE_PATTERN, ' ')
        .replace(COUNT_PATTERN, ' ')
        .replace(FORMULATION_PATTERN, ' ')
        .replace(/[^a-zA-Z\s-]/g, ' ')
        .replace(/-/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length > 2 && !NORMALIZATION_STOP_WORDS.has(token))

      const uniqueTokens: string[] = []
      for (const token of tokens) {
        if (!uniqueTokens.includes(token)) {
          uniqueTokens.push(token)
        }
      }

      return uniqueTokens.join(' ').replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean)

  if (cleaned.length === 0) {
    return normalizeWhitespace(name)
  }

  return toTitleCase(cleaned.join(' / '))
}

export function extractDosages(name: string): string[] {
  const matches = name.match(DOSAGE_PATTERN) || []
  const normalizedMatches = matches.map((match) => normalizeWhitespace(match.toUpperCase()))
  return Array.from(new Set(normalizedMatches))
}

export function normalizeMedicationLabel(name: string): string {
  return normalizeWhitespace(name)
}

export function doesTextMentionDosage(text: string, dosage: string): boolean {
  const dosageMatch = dosage.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z%]+)$/)
  if (!dosageMatch) {
    return false
  }

  const doseValue = dosageMatch[1]
  const doseUnit = dosageMatch[2]
  const dosageRegex = new RegExp(`\\b${doseValue}\\s*${doseUnit}\\b`, 'i')
  return dosageRegex.test(text)
}
