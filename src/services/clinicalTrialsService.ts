/**
 * Clinical Trials Service
 * Integrates with ClinicalTrials.gov API v2 to find trials for medications
 * and analyze women's participation rates
 */

import axios from 'axios';

interface ClinicalTrial {
  nctId: string;
  title: string;
  overallStatus?: string;
  startDate?: string;
  enrollment: {
    count: number;
    type: string;
  };
  sexes: string[];
  womenPercentage: number;
  studyType?: string;
  studyPhase?: string;
  phases: string[];
}

interface ClinicalTrialsResponse {
  total: number;
  trials: ClinicalTrial[];
  womenParticipationAnalysis: {
    totalTrials: number;
    trialsIncludingWomen: number;
    percentageTrialsWithWomen: number;
    totalEnrollment: number;
    totalWomenEnrollment: number;
    overallWomenPercentage: number;
  };
}

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export class ClinicalTrialsService {
  private normalizeMedicationTerm(term: string): string {
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
      'semaglutide',
      'tirzepatide',
      'liraglutide',
      'dulaglutide',
      'ibuprofen',
      'acetaminophen',
      'naproxen',
      'aspirin',
      'metformin',
      'atorvastatin',
      'lisinopril',
      'amlodipine',
      'omeprazole'
    ];

    for (const generic of prioritizedGenerics) {
      if (cleaned.includes(generic)) {
        return generic;
      }
    }

    const stopWords = new Set([
      'mg', 'mcg', 'ml', 'iu', 'hr', 'hour', 'hours', 'tablet', 'capsule',
      'oral', 'solution', 'suspension', 'extended', 'release', 'delayed',
      'hydrochloride', 'hcl'
    ]);

    return cleaned
      .split(' ')
      .filter((token) => token.length > 2 && !stopWords.has(token))
      .slice(0, 3)
      .join(' ')
      .trim();
  }

  /**
   * Search for clinical trials for a specific medication
   */
  async searchTrials(medicationName: string, limit: number = 100): Promise<ClinicalTrialsResponse> {
    try {
      const normalizedMedicationName = this.normalizeMedicationTerm(medicationName);
      const queryTerm = normalizedMedicationName || medicationName.trim();

      const requestVariants: Array<Record<string, string | number>> = [
        {
          'query.term': queryTerm,
          'filter.overallStatus': 'COMPLETED',
          'countTotal': 'true',
          'pageSize': Math.min(limit, 100)
        },
        {
          'query.term': queryTerm,
          'filter.overallStatus': 'COMPLETED',
          'fields': 'NCTId,BriefTitle,Sex,EnrollmentCount',
          'countTotal': 'true',
          'pageSize': Math.min(limit, 100)
        }
      ];

      let response: any = null;
      let lastError: unknown = null;

      for (const params of requestVariants) {

        try {
          response = await axios.get(API_BASE, { params });
          break;
        } catch (err: unknown) {
          lastError = err;
          const status = axios.isAxiosError(err) ? err.response?.status : undefined;
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.warn('[ClinicalTrials] Request variant failed', status || message);
        }
      }

      if (!response) {
        throw lastError || new Error('All ClinicalTrials field variants failed');
      }

      const apiData = response.data;

      const total = apiData.totalCount || apiData.nStudiesReturned || apiData.nStudiesTotal || 0;
      
      const trials = this.parseTrialsResponse(apiData);
      const analysis = this.analyzeWomenParticipation(trials);

      return {
        total,
        trials,
        womenParticipationAnalysis: analysis
      };
    } catch (error: unknown) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const baseMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ClinicalTrials] Error details:', {
        message: baseMessage,
        status: axiosError?.response?.status,
        statusText: axiosError?.response?.statusText,
        responseData: String(axiosError?.response?.data ?? '').slice(0, 200)
      });
      throw {
        status: axiosError?.response?.status || 500,
        message: `Failed to fetch clinical trials for ${medicationName}: ${baseMessage}`
      };
    }
  }

  /**
   * Parse API response into structured trial data
   */
  private parseTrialsResponse(data: any): ClinicalTrial[] {
    if (!data.studies || !Array.isArray(data.studies)) {
      console.warn('No studies found in API response or invalid format');
      return [];
    }

    return data.studies.map((study: any) => {
      try {
        const protocol = study.protocolSection || {};
        const identification = protocol.identificationModule || {};
        const status = protocol.statusModule || {};
        const design = protocol.designModule || {};
        const eligibility = protocol.eligibilityModule || {};
        const enrollment = design.enrollmentInfo || {};

        const nctId = identification.nctId || '';
        const title = identification.briefTitle || 'Unknown Trial';
        const overallStatus = status.overallStatus || undefined;
        const startDate = status.startDateStruct?.date || undefined;
        const participantCount = enrollment.count || 0;
        const studyType = design.studyType || undefined;
        const phases = design.phases || [];

        // Determine if study includes women
        // This is an approximation since the API doesn't always provide explicit sex breakdown
        const sexes = eligibility.sex ? [eligibility.sex] : [];
        let womenPercentage = 0;
        if (sexes.includes('FEMALE')) {
          womenPercentage = 100;
        } else if (sexes.includes('MALE')) {
          womenPercentage = 0;
        } else if (sexes.includes('ALL')) {
          womenPercentage = 50;
        }
        
        return {
          nctId,
          title,
          overallStatus,
          startDate,
          enrollment: {
            count: participantCount,
            type: enrollment.type || 'ACTUAL'
          },
          sexes,
          womenPercentage,
          studyType,
          studyPhase: phases[0] || undefined,
          phases
        };
      } catch (error: unknown) {
        console.warn('Error parsing trial:', error);
        return null;
      }
    }).filter((trial: ClinicalTrial | null): trial is ClinicalTrial => trial !== null);
  }

  /**
   * Analyze women's participation across all trials
   */
  private analyzeWomenParticipation(trials: ClinicalTrial[]) {
    const trialsWithWomen = trials.filter(t => t.womenPercentage > 0);
    const totalEnrollment = trials.reduce((sum, t) => sum + t.enrollment.count, 0);
    const womenEnrollment = trialsWithWomen.reduce(
      (sum, t) => sum + (t.enrollment.count * t.womenPercentage / 100),
      0
    );

    return {
      totalTrials: trials.length,
      trialsIncludingWomen: trialsWithWomen.length,
      percentageTrialsWithWomen: trials.length > 0 
        ? Math.round((trialsWithWomen.length / trials.length) * 100)
        : 0,
      totalEnrollment,
      totalWomenEnrollment: Math.round(womenEnrollment),
      overallWomenPercentage: totalEnrollment > 0
        ? Math.round((womenEnrollment / totalEnrollment) * 100)
        : 0
    };
  }

  /**
   * Get trial completion rate and diversity metrics
   */
  async getTrialMetrics(medicationName: string): Promise<any> {
    const response = await this.searchTrials(medicationName);
    
    const statusCount = response.trials.reduce((acc, trial) => {
      const statusKey = trial.overallStatus || 'Not reported';
      acc[statusKey] = (acc[statusKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTrials: response.total,
      byStatus: statusCount,
      womenParticipation: response.womenParticipationAnalysis,
      averageEnrollment: response.trials.length > 0
        ? Math.round(response.trials.reduce((sum, t) => sum + t.enrollment.count, 0) / response.trials.length)
        : 0
    };
  }
}

export default new ClinicalTrialsService();
