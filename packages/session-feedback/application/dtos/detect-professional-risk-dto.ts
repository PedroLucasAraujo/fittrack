export interface DetectProfessionalRiskInputDTO {
  professionalProfileId: string;
}

export interface DetectProfessionalRiskOutputDTO {
  professionalProfileId: string;
  negativeFeedbackCount: number;
  riskDetected: boolean;
  /** 'WATCHLIST' | 'FLAGGED' | null (null when no threshold crossed). */
  riskLevel: 'WATCHLIST' | 'FLAGGED' | null;
}
