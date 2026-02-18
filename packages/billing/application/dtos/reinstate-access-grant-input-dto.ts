export interface ReinstateAccessGrantInputDTO {
  accessGrantId: string;
  /** Tenant isolation guard (ADR-0025): must match the grant's professionalProfileId. */
  professionalProfileId: string;
}
