import { Router, Request, Response } from 'express';
import { FAERSService } from '../services/dataCollectionService';
import clinicalTrialsService from '../services/clinicalTrialsService';

const router = Router();
const faersService = new FAERSService();

// Simple in-memory cache for research results (1 hour TTL)
interface CacheEntry {
  data: any;
  timestamp: number;
}
const researchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedResult(key: string): any | null {
  const entry = researchCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    researchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResult(key: string, data: any): void {
  researchCache.set(key, { data, timestamp: Date.now() });
}

type ReactionSummary = {
  reaction: string;
  count: number;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

function getErrorStatus(error: unknown, fallback: number = 500): number {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return fallback;
}

function isTruthyQueryValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function extractTopReactions(events: any[] = [], topN: number = 10): ReactionSummary[] {
  const reactionCounts = new Map<string, number>();

  for (const event of events) {
    const reactions = event?.patient?.reaction || [];
    for (const reaction of reactions) {
      const name = reaction?.reactionmeddrapt;
      if (!name) continue;
      const normalized = String(name).toLowerCase().trim();
      reactionCounts.set(normalized, (reactionCounts.get(normalized) || 0) + 1);
    }
  }

  return Array.from(reactionCounts.entries())
    .map(([reaction, count]) => ({ reaction, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

function getSeriousEventRate(events: any[] = []): number {
  if (!events.length) return 0;
  const seriousCount = events.filter((event) => String(event?.serious) === '1').length;
  return Math.round((seriousCount / events.length) * 100);
}

function summarizeClinicalTrials(clinicalTrials: any) {
  const trials = clinicalTrials?.trials || [];
  const startYears = trials
    .map((trial: any) => trial?.startDate?.slice?.(0, 4))
    .filter((year: string | undefined) => !!year)
    .map((year: string) => parseInt(year, 10))
    .filter((year: number) => !isNaN(year));

  const womenOnlyTrials = trials.filter((trial: any) => trial?.sexes?.includes?.('FEMALE')).length;
  const menOnlyTrials = trials.filter((trial: any) => trial?.sexes?.includes?.('MALE')).length;
  const allSexTrials = trials.filter((trial: any) => trial?.sexes?.includes?.('ALL')).length;

  const phaseBreakdown: Record<string, number> = {};
  for (const trial of trials) {
    const phase = trial?.studyPhase || 'Unknown';
    phaseBreakdown[phase] = (phaseBreakdown[phase] || 0) + 1;
  }

  return {
    totalTrialsMatched: clinicalTrials?.total || 0,
    sampleTrialsAnalyzed: trials.length,
    womenInclusionRatePercent: clinicalTrials?.womenParticipationAnalysis?.percentageTrialsWithWomen || 0,
    womenOnlyTrials,
    menOnlyTrials,
    mixedOrAllSexTrials: allSexTrials,
    totalEnrollmentInSample: clinicalTrials?.womenParticipationAnalysis?.totalEnrollment || 0,
    estimatedWomenEnrollmentInSample: clinicalTrials?.womenParticipationAnalysis?.totalWomenEnrollment || 0,
    phaseBreakdown,
    trialStartYearRange: startYears.length
      ? { min: Math.min(...startYears), max: Math.max(...startYears) }
      : null
  };
}

function summarizeFaers(faersData: any) {
  const femaleEvents = faersData?.femaleEvents || [];
  const maleEvents = faersData?.maleEvents || [];
  const femaleCount = faersData?.femaleCount || 0;
  const maleCount = faersData?.maleCount || 0;
  const totalCount = faersData?.totalCount || 0;

  const topFemaleReactions = faersData?.femaleTopReactions?.length
    ? faersData.femaleTopReactions
    : extractTopReactions(femaleEvents, 10);
  const topMaleReactions = faersData?.maleTopReactions?.length
    ? faersData.maleTopReactions
    : extractTopReactions(maleEvents, 10);

  return {
    femaleReportCount: femaleCount,
    maleReportCount: maleCount,
    totalSexSpecificReports: totalCount,
    femaleToMaleReportRatio: maleCount > 0 ? Number((femaleCount / maleCount).toFixed(2)) : null,
    womenReportSharePercent: totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0,
    menReportSharePercent: totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0,
    femaleSeriousEventRatePercent: getSeriousEventRate(femaleEvents),
    maleSeriousEventRatePercent: getSeriousEventRate(maleEvents),
    topFemaleReactions,
    topMaleReactions
  };
}

// GET /api/research/sources - List available research sources
router.get('/sources', (req: Request, res: Response) => {
  res.json({
    sources: [
      {
        source: 'FAERS',
        description: 'OpenFDA FAERS - Live adverse event reporting system',
        endpoint: '/api/research/faers/sex-specific'
      },
      {
        source: 'CLINICAL_TRIALS',
        description: 'ClinicalTrials.gov - Clinical trial enrollment and women participation data',
        endpoint: '/api/research/clinical-trials/search'
      }
    ],
    total: 2
  });
});

// GET /api/research/faers/query - Query live FAERS adverse events for a medication
router.get('/faers/query', async (req: Request, res: Response) => {
  try {
    const medicationName = req.query.medication as string;
    const genericName = req.query.genericName as string;
    const reaction = req.query.reaction as string;
    const limit = parseInt(req.query.limit as string) || 500;

    if (!medicationName && !genericName) {
      return res.status(400).json({ error: 'Medication name or generic name is required' });
    }

    let result;
    if (reaction) {
      result = await faersService.queryAdverseEventsWithReaction(
        medicationName || genericName || '',
        reaction,
        limit
      );
    } else {
      result = await faersService.queryAdverseEvents(
        medicationName || '',
        genericName,
        limit
      );
    }

    res.json({
      source: 'OpenFDA FAERS',
      medication: medicationName || genericName,
      reaction: reaction || null,
      ...result
    });
  } catch (error) {
    console.error('Error querying FAERS:', error);
    res.status(500).json({ error: 'Failed to query FAERS API' });
  }
});

// GET /api/research/faers/sex-specific - Query sex-specific adverse events from FAERS
router.get('/faers/sex-specific', async (req: Request, res: Response) => {
  try {
    const medicationName = req.query.medication as string;
    const genericName = req.query.genericName as string;

    if (!medicationName && !genericName) {
      return res.status(400).json({ error: 'Medication name or generic name is required' });
    }

    const result = await faersService.querySexSpecificEvents(
      medicationName || '',
      genericName
    );

    res.json({
      source: 'OpenFDA FAERS',
      medication: medicationName || genericName,
      ...result
    });
  } catch (error) {
    console.error('Error querying FAERS sex-specific data:', error);
    const medicationName = req.query.medication as string;
    res.json({
      source: 'OpenFDA FAERS',
      medication: medicationName || 'unknown',
      femaleCount: 0,
      maleCount: 0,
      unknownCount: 0,
      totalCount: 0,
      femaleEvents: [],
      maleEvents: [],
      note: 'Unable to fetch live FAERS data. Ensure OPENFDA_API_KEY is set.'
    });
  }
});

// GET /api/research/clinical-trials/search - Query ClinicalTrials.gov for medication trials
router.get('/clinical-trials/search', async (req: Request, res: Response) => {
  try {
    const medicationName = req.query.medication as string;

    if (!medicationName) {
      return res.status(400).json({ error: 'Medication name is required' });
    }

    const result = await clinicalTrialsService.searchTrials(medicationName);

    res.json({
      source: 'ClinicalTrials.gov',
      medication: medicationName,
      ...result
    });
  } catch (error: unknown) {
    console.error('[Clinical Trials] Error:', error);
    res.status(getErrorStatus(error)).json({ 
      error: getErrorMessage(error, 'Failed to query clinical trials')
    });
  }
});

// GET /api/research/clinical-trials/metrics - Get trial metrics for a medication
router.get('/clinical-trials/metrics', async (req: Request, res: Response) => {
  try {
    const medicationName = req.query.medication as string;

    if (!medicationName) {
      return res.status(400).json({ error: 'Medication name is required' });
    }

    const metrics = await clinicalTrialsService.getTrialMetrics(medicationName);

    res.json({
      source: 'ClinicalTrials.gov',
      medication: medicationName,
      ...metrics
    });
  } catch (error: unknown) {
    console.error('Error fetching trial metrics:', error);
    res.status(getErrorStatus(error)).json({ 
      error: getErrorMessage(error, 'Failed to fetch trial metrics')
    });
  }
});

// GET /api/research/combined/search - Get combined data from multiple sources (MAIN ENDPOINT)
router.get('/combined/search', async (req: Request, res: Response) => {
  try {
    const medicationName = req.query.medication as string;
    const debugRequested = isTruthyQueryValue(req.query.debug) || isTruthyQueryValue(req.query.includeRaw);
    const isDevMode = process.env.NODE_ENV !== 'production';

    if (!medicationName) {
      return res.status(400).json({ error: 'Medication name is required' });
    }

    if (debugRequested && !isDevMode) {
      return res.status(403).json({
        error: 'Debug mode is only available in development environments'
      });
    }

    // Check cache first (skip for debug mode)
    const cacheKey = medicationName.toLowerCase().trim();
    if (!debugRequested) {
      const cachedResult = getCachedResult(cacheKey);
      if (cachedResult) {
        console.log(`Cache hit for: ${medicationName}`);
        return res.json({ ...cachedResult, cached: true });
      }
    }

    console.log(`Cache miss for: ${medicationName} - fetching from APIs...`);

    // Fetch from all available sources in parallel
    const [clinicalTrials, faersData] = await Promise.all([
      clinicalTrialsService.searchTrials(medicationName).catch(err => ({
        error: err.message,
        trials: [],
        womenParticipationAnalysis: null
      })),
      faersService.querySexSpecificEvents(medicationName, undefined, debugRequested && isDevMode).catch(err => ({
        femaleCount: 0,
        maleCount: 0,
        totalCount: 0,
        femaleEvents: [],
        maleEvents: [],
        femaleTopReactions: [],
        maleTopReactions: [],
        countAuditTrail: debugRequested && isDevMode
          ? {
              inputMedication: medicationName,
              normalizedSearchTerms: [],
              terms: [],
              finalCounts: {
                femaleCount: 0,
                maleCount: 0,
                totalCount: 0
              }
            }
          : undefined,
        error: err.message
      }))
    ]);

    const clinicalTrialsSummary = summarizeClinicalTrials(clinicalTrials);
    const faersSummary = summarizeFaers(faersData);

    const researchSummary = {
      clinicalTrials: clinicalTrialsSummary,
      faers: faersSummary,
      keyInsights: {
        question1_wasResearchedInWomen: (clinicalTrials?.womenParticipationAnalysis?.trialsIncludingWomen || 0) > 0,
        question1_percentTrialsIncludedWomen: clinicalTrials?.womenParticipationAnalysis?.percentageTrialsWithWomen || 0,
        question2_womenReportingPostMarketEvents: faersData?.femaleCount || 0,
        question2_topWomenReportedEffects: faersSummary.topFemaleReactions.slice(0, 5)
      }
    };

    const responseBody: any = {
      medication: medicationName,
      clinicalTrials: {
        source: 'ClinicalTrials.gov',
        ...clinicalTrials
      },
      adverseEvents: {
        source: 'OpenFDA FAERS',
        ...faersData
      },
      researchSummary
    };

    if (debugRequested && isDevMode) {
      responseBody.debug = {
        mode: process.env.NODE_ENV || 'development',
        generatedAt: new Date().toISOString(),
        request: {
          medication: medicationName,
          query: req.query
        },
        validation: {
          topFemaleMatchesKeyInsight:
            responseBody.researchSummary?.faers?.topFemaleReactions?.[0]?.reaction ===
            responseBody.researchSummary?.keyInsights?.question2_topWomenReportedEffects?.[0]?.reaction,
          trialCountMatchesSample:
            (responseBody.clinicalTrials?.trials?.length || 0) ===
            (responseBody.researchSummary?.clinicalTrials?.sampleTrialsAnalyzed || 0)
        },
        rawSources: {
          clinicalTrials,
          faersData
        }
      };
    }

    // Cache the result (skip for debug mode)
    if (!debugRequested) {
      setCachedResult(cacheKey, responseBody);
    }

    // Set HTTP cache headers (1 hour for browsers/CDN)
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(responseBody);
  } catch (error) {
    console.error('Error fetching combined research data:', error);
    res.status(500).json({ error: 'Failed to fetch combined research data' });
  }
});

export default router;
