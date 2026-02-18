export interface CancelBookingInputDTO {
  bookingId: string;
  professionalProfileId: string;
  cancelledBy: 'CLIENT' | 'PROFESSIONAL';
  reason: string;
}
