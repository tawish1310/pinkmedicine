// Type definitions for the Medication Research API

export interface MedicationDTO {
  id: number;
  name: string;
  genericName?: string;
  fdaApproved: boolean;
  drugClass?: string;
  indication?: string;
  description?: string;
}

export interface ResearchFindingDTO {
  id: number;
  findingType: string;
  description: string;
  sexDifference?: string;
  percentageWomen?: number;
  percentageMen?: number;
  confidenceLevel?: string;
  mechanism?: string;
}

export interface MedicationDetailDTO extends MedicationDTO {
  findings: ResearchFindingDTO[];
  researchCount: number;
}

export interface SearchQuery {
  q?: string;
  findingType?: string;
  source?: string;
  skip?: number;
  take?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}
