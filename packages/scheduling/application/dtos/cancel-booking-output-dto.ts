export interface CancelBookingOutputDTO {
  bookingId: string;
  status: string;
  cancelledBy: string;
  cancellationReason: string;
  cancelledAtUtc: string;
}
