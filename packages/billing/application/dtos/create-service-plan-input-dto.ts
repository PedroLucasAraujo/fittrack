export interface CreateServicePlanInputDTO {
  professionalProfileId: string;
  name: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  durationDays: number;
  sessionAllotment?: number | null;
  type: string;
}
