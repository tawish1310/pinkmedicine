import axios from 'axios';

interface FaersStrategyAuditEntry {
  label: string;
  femaleCount: number;
  maleCount: number;
  totalCount: number;
  femaleQuery: string;
  maleQuery: string;
}

interface FaersTermAuditEntry {
  term: string;
  selectedStrategy: string;
  selectedFemaleCount: number;
  selectedMaleCount: number;
  selectedTotalCount: number;
  runningFemaleCount: number;
  runningMaleCount: number;
  runningTotalCount: number;
  strategies: FaersStrategyAuditEntry[];
}

interface FaersCountAuditTrail {
  inputMedication: string;
  inputGenericName?: string;
  normalizedSearchTerms: string[];
  terms: FaersTermAuditEntry[];
  finalCounts: {
    femaleCount: number;
    maleCount: number;
    totalCount: number;
  };
}

/**
 * FAERS Service - Handles live queries to OpenFDA FAERS API
 * FAERS: FDA Adverse Event Reporting System
 */
export class FAERSService {
  private source: string = 'FAERS';
  private apiBaseUrl = 'https://api.fda.gov/drug/event.json';
  private apiKey = process.env.OPENFDA_API_KEY;

  /**
   * Extract generic drug names from product names
   * Handles common abbreviations and patterns (e.g., "APAP 325 MG / ibuprofen 97.5 MG" -> ["acetaminophen", "ibuprofen"])
   */
  private extractGenericNames(productName: string): string[] {
    const mappings: { [key: string]: string } = {
      'APAP': 'acetaminophen',
      'acetaminophen': 'acetaminophen',
      'ibuprofen': 'ibuprofen',
      'bupropion': 'bupropion',
      'semaglutide': 'semaglutide',
      'tirzepatide': 'tirzepatide',
      'liraglutide': 'liraglutide',
      'dulaglutide': 'dulaglutide',
      'naproxen': 'naproxen',
      'aspirin': 'aspirin',
      'diphenhydramine': 'diphenhydramine',
      'omeprazole': 'omeprazole',
      'metformin': 'metformin',
      'lisinopril': 'lisinopril',
      'atorvastatin': 'atorvastatin',
      'amoxicillin': 'amoxicillin',
      'fluoxetine': 'fluoxetine',
      'sertraline': 'sertraline',
      'vitamin': 'vitamin',
      'iron': 'iron',
      'levothyroxine': 'levothyroxine',
      'amlodipine': 'amlodipine',
      'albuterol': 'albuterol',
      'prednisone': 'prednisone'
    };

    const names = new Set<string>();
    const lowerName = productName.toLowerCase();
    
    // Try to match drug names in different formats
    const parts = productName.split(/\/|;|\band\b/i);
    
    for (const part of parts) {
      // Remove dosage information (e.g., "325 MG", "500mg")
      const cleaned = part.replace(/\b(\d+\.?\d*)\s*(mg|mcg|g|ml|units?|iu|%)\b/gi, '').trim();
      
      // Remove form info (e.g., "Oral Tablet", "Capsule")
      const withoutForm = cleaned.replace(/\b(tablet|capsule|suspension|solution|cream|ointment|spray|injection|patch|oral|topical|extended\.?release|sustained\.?release)\b/gi, '').trim();
      
      if (withoutForm.length > 2) {
        const cleanedLower = withoutForm.toLowerCase();
        
        // Check exact mappings first
        if (mappings[cleanedLower]) {
          names.add(mappings[cleanedLower]);
        } else {
          // Check if any mapping key appears in cleaned text
          let found = false;
          for (const [abbrev, generic] of Object.entries(mappings)) {
            if (cleanedLower.includes(abbrev.toLowerCase())) {
              names.add(generic);
              found = true;
              break;
            }
          }
          
          // If no mapping found and text is long enough, use it as-is
          if (!found && cleanedLower.length > 3 && !cleanedLower.includes('unknown')) {
            names.add(cleanedLower);
          }
        }
      }
    }
    
    return Array.from(names);
  }

  /**
   * Normalize free-form medication labels to OpenFDA-safe drug terms
   */
  private normalizeFaersTerm(term: string): string {
    const stopWords = new Set([
      'mg', 'mcg', 'ml', 'iu', 'dose', 'doses', 'pen', 'injector', 'injection',
      'tablet', 'capsule', 'oral', 'solution', 'suspension', 'kit', 'prefilled',
      'auto', 'subcutaneous', 'extended', 'release', 'delayed', 'patch',
      'hydrochloride', 'hcl', 'hr', 'hour', 'hours'
    ]);

    const cleaned = term
      .toLowerCase()
      .replace(/[\[\]{}()]/g, ' ')
      .replace(/["'`]/g, ' ')
      .replace(/\b\d+(\.\d+)?\b/g, ' ')
      .replace(/[^a-z\s\/-]/g, ' ')
      .replace(/[\/-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return '';
    }

    const prioritizedGenerics = [
      'bupropion',
      'semaglutide', 'tirzepatide', 'liraglutide', 'dulaglutide',
      'ibuprofen', 'acetaminophen', 'naproxen', 'aspirin', 'metformin',
      'atorvastatin', 'lisinopril', 'amlodipine', 'omeprazole'
    ];

    for (const generic of prioritizedGenerics) {
      if (cleaned.includes(generic)) {
        return generic;
      }
    }

    return cleaned
      .split(' ')
      .filter(token => token.length > 2 && !stopWords.has(token))
      .slice(0, 3)
      .join(' ')
      .trim();
  }

  /**
   * Build OpenFDA API search query
   * Uses quoted terms and logical AND. URL serializer converts spaces to '+'
   */
  private buildSearchQuery(
    drugName: string,
    filters?: { patientsex?: string; reactionMedDRA?: string }
  ): string {
    let query = `patient.drug.generic_name:"${drugName}"`;
    
    if (filters?.patientsex) {
      query += ` AND patient.patientsex:${filters.patientsex}`;
    }

    if (filters?.reactionMedDRA) {
      query += ` AND patient.reaction.reactionmeddrapt:"${filters.reactionMedDRA}"`;
    }
    
    return query;
  }

  /**
   * Serialize OpenFDA search query to URL form using '+' separators
   * Example: patient.drug.generic_name:"semaglutide"+AND+patient.patientsex:2
   */
  private serializeSearchQuery(query: string): string {
    return encodeURIComponent(query).replace(/%20/g, '+');
  }

  /**
   * Execute FAERS search query with consistent URL syntax
   */
  private async executeFaersSearch(
    query: string,
    limit: number = 500,
    tolerateNoMatches: boolean = false
  ): Promise<any> {
    const encodedQuery = this.serializeSearchQuery(query);
    const requestUrl = `${this.apiBaseUrl}?api_key=${this.apiKey}&search=${encodedQuery}&limit=${Math.min(limit, 500)}`;

    try {
      const response = await axios.get(requestUrl);
      return response.data;
    } catch (error: any) {
      if (tolerateNoMatches && error.response?.status === 404) {
        return { meta: { results: { total: 0 } }, results: [] };
      }
      throw error;
    }
  }

  /**
   * Get top adverse reactions for a query using FAERS count aggregation
   */
  private async getTopReactionsForQuery(query: string, topN: number = 10): Promise<Array<{ reaction: string; count: number }>> {
    try {
      const encodedQuery = this.serializeSearchQuery(query);
      const countField = 'patient.reaction.reactionmeddrapt.exact';
      const requestUrl = `${this.apiBaseUrl}?api_key=${this.apiKey}&search=${encodedQuery}&count=${countField}`;

      const response = await axios.get(requestUrl);
      const results = response.data?.results || [];

      return results.slice(0, topN).map((item: any) => ({
        reaction: String(item.term || '').toLowerCase(),
        count: item.count || 0
      }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      console.warn('[FAERS] Unable to fetch top reactions for query:', query, error.message);
      return [];
    }
  }

  /**
   * Query FAERS for adverse events related to a medication
   */
  async queryAdverseEvents(
    medicationName: string,
    genericName?: string,
    limit: number = 500
  ): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('OPENFDA_API_KEY environment variable not set');
      }

      const query = this.buildSearchQuery(genericName || medicationName);

      return await this.executeFaersSearch(query, limit);
    } catch (error) {
      console.error(`Error querying FAERS for ${medicationName}:`, error);
      throw error;
    }
  }

  /**
   * Query FAERS for adverse events with specific reaction
   */
  async queryAdverseEventsWithReaction(
    medicationName: string,
    reaction: string,
    limit: number = 500
  ): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('OPENFDA_API_KEY environment variable not set');
      }

      const query = this.buildSearchQuery(medicationName, { reactionMedDRA: reaction });

      return await this.executeFaersSearch(query, limit);
    } catch (error) {
      console.error(`Error querying FAERS for ${medicationName} with reaction ${reaction}:`, error);
      throw error;
    }
  }

  /**
   * Search for sex-specific adverse events
   * patient.patientsex: 1 = male, 2 = female
   * Gracefully handles "no matches found" by returning zero counts
   */
  async querySexSpecificEvents(
    medicationName: string,
    genericName?: string,
    includeCountAuditTrail: boolean = false
  ): Promise<{
    femaleCount: number;
    maleCount: number;
    totalCount: number;
    femaleEvents?: any[];
    maleEvents?: any[];
    femaleTopReactions?: Array<{ reaction: string; count: number }>;
    maleTopReactions?: Array<{ reaction: string; count: number }>;
    countAuditTrail?: FaersCountAuditTrail;
  }> {
    try {
      if (!this.apiKey) {
        console.warn('OPENFDA_API_KEY not configured - returning empty results');
        return {
          femaleCount: 0,
          maleCount: 0,
          totalCount: 0,
          femaleEvents: [],
          maleEvents: [],
          femaleTopReactions: [],
          maleTopReactions: [],
          countAuditTrail: includeCountAuditTrail
            ? {
                inputMedication: medicationName,
                inputGenericName: genericName,
                normalizedSearchTerms: [],
                terms: [],
                finalCounts: {
                  femaleCount: 0,
                  maleCount: 0,
                  totalCount: 0
                }
              }
            : undefined
        };
      }

      let searchTerms = [this.normalizeFaersTerm(genericName || medicationName)].filter(Boolean);
      
      // If genericName not provided, try to extract from product name
      if (!genericName && medicationName) {
        const extracted = this.extractGenericNames(medicationName);
        if (extracted.length > 0) {
          const normalizedExtracted = extracted
            .map((term) => this.normalizeFaersTerm(term))
            .filter(Boolean);

          if (normalizedExtracted.length > 0) {
            searchTerms = normalizedExtracted;
          }
        }
      }

      searchTerms = Array.from(new Set(searchTerms));

      // Try querying with all available terms
      const results = {
        femaleCount: 0,
        maleCount: 0,
        totalCount: 0,
        femaleEvents: [] as any[],
        maleEvents: [] as any[],
        femaleTopReactions: [] as Array<{ reaction: string; count: number }>,
        maleTopReactions: [] as Array<{ reaction: string; count: number }>,
        countAuditTrail: includeCountAuditTrail
          ? {
              inputMedication: medicationName,
              inputGenericName: genericName,
              normalizedSearchTerms: searchTerms,
              terms: [] as FaersTermAuditEntry[],
              finalCounts: {
                femaleCount: 0,
                maleCount: 0,
                totalCount: 0
              }
            }
          : undefined
      };

      const buildGenericMatch = (terms: string[], operator: 'AND' | 'OR') => {
        const clause = terms.map((term) => `patient.drug.generic_name:"${term}"`).join(` ${operator} `);
        return terms.length > 1 ? `(${clause})` : clause;
      };

      const buildMedicinalProductMatch = (terms: string[], operator: 'AND' | 'OR') => {
        const clause = terms
          .map((term) => `patient.drug.medicinalproduct:"${term.toUpperCase()}"`)
          .join(` ${operator} `);
        return terms.length > 1 ? `(${clause})` : clause;
      };

      const baseStrategies = searchTerms.length > 1
        ? [
            {
              label: 'generic_name_all_terms',
              femaleQuery: `${buildGenericMatch(searchTerms, 'AND')} AND patient.patientsex:2`,
              maleQuery: `${buildGenericMatch(searchTerms, 'AND')} AND patient.patientsex:1`
            },
            {
              label: 'medicinalproduct_all_terms',
              femaleQuery: `${buildMedicinalProductMatch(searchTerms, 'AND')} AND patient.patientsex:2`,
              maleQuery: `${buildMedicinalProductMatch(searchTerms, 'AND')} AND patient.patientsex:1`
            },
            {
              label: 'generic_name_any_term',
              femaleQuery: `${buildGenericMatch(searchTerms, 'OR')} AND patient.patientsex:2`,
              maleQuery: `${buildGenericMatch(searchTerms, 'OR')} AND patient.patientsex:1`
            },
            {
              label: 'medicinalproduct_any_term',
              femaleQuery: `${buildMedicinalProductMatch(searchTerms, 'OR')} AND patient.patientsex:2`,
              maleQuery: `${buildMedicinalProductMatch(searchTerms, 'OR')} AND patient.patientsex:1`
            }
          ]
        : [
            {
              label: 'generic_name',
              femaleQuery: this.buildSearchQuery(searchTerms[0], { patientsex: '2' }),
              maleQuery: this.buildSearchQuery(searchTerms[0], { patientsex: '1' })
            },
            {
              label: 'medicinalproduct',
              femaleQuery: `patient.drug.medicinalproduct:"${searchTerms[0].toUpperCase()}" AND patient.patientsex:2`,
              maleQuery: `patient.drug.medicinalproduct:"${searchTerms[0].toUpperCase()}" AND patient.patientsex:1`
            }
          ];

      const strategyExecutions = await Promise.all(
        baseStrategies.map(async (strategy) => {
          const [femaleResponse, maleResponse] = await Promise.all([
            this.executeFaersSearch(strategy.femaleQuery, 500, true),
            this.executeFaersSearch(strategy.maleQuery, 500, true)
          ]);

          const femaleCount = femaleResponse.meta?.results?.total || 0;
          const maleCount = maleResponse.meta?.results?.total || 0;
          const totalCount = femaleCount + maleCount;

          return {
            label: strategy.label,
            femaleQuery: strategy.femaleQuery,
            maleQuery: strategy.maleQuery,
            femaleResponse,
            maleResponse,
            femaleCount,
            maleCount,
            totalCount
          };
        })
      );

      const selectedExecution = searchTerms.length > 1
        ? strategyExecutions.find((execution) => execution.totalCount > 0) || strategyExecutions[0]
        : strategyExecutions.reduce((best, current) =>
            current.totalCount > best.totalCount ? current : best,
          strategyExecutions[0]);

      results.femaleCount = selectedExecution.femaleCount;
      results.maleCount = selectedExecution.maleCount;
      results.totalCount = selectedExecution.totalCount;

      if (selectedExecution.femaleResponse.results?.length) {
        results.femaleEvents = selectedExecution.femaleResponse.results.slice(0, 10);
      }
      if (selectedExecution.maleResponse.results?.length) {
        results.maleEvents = selectedExecution.maleResponse.results.slice(0, 10);
      }

      results.femaleTopReactions = await this.getTopReactionsForQuery(selectedExecution.femaleQuery, 10);
      results.maleTopReactions = await this.getTopReactionsForQuery(selectedExecution.maleQuery, 10);

      if (includeCountAuditTrail && results.countAuditTrail) {
        results.countAuditTrail.terms.push({
          term: searchTerms.join(' + '),
          selectedStrategy: selectedExecution.label,
          selectedFemaleCount: selectedExecution.femaleCount,
          selectedMaleCount: selectedExecution.maleCount,
          selectedTotalCount: selectedExecution.totalCount,
          runningFemaleCount: results.femaleCount,
          runningMaleCount: results.maleCount,
          runningTotalCount: results.totalCount,
          strategies: strategyExecutions.map((execution) => ({
            label: execution.label,
            femaleCount: execution.femaleCount,
            maleCount: execution.maleCount,
            totalCount: execution.totalCount,
            femaleQuery: execution.femaleQuery,
            maleQuery: execution.maleQuery
          }))
        });
      }

      if (includeCountAuditTrail && results.countAuditTrail) {
        results.countAuditTrail.finalCounts = {
          femaleCount: results.femaleCount,
          maleCount: results.maleCount,
          totalCount: results.totalCount
        };
      }

      return results;
    } catch (error) {
      console.error(`[FAERS] Error querying sex-specific events for ${medicationName}:`, error);
      // Return empty results instead of throwing
      return {
        femaleCount: 0,
        maleCount: 0,
        totalCount: 0,
        femaleEvents: [],
        maleEvents: [],
        femaleTopReactions: [],
        maleTopReactions: [],
        countAuditTrail: includeCountAuditTrail
          ? {
              inputMedication: medicationName,
              inputGenericName: genericName,
              normalizedSearchTerms: [],
              terms: [],
              finalCounts: {
                femaleCount: 0,
                maleCount: 0,
                totalCount: 0
              }
            }
          : undefined
      };
    }
  }
}
