import type { ISchedulingEventPublisher } from '../../application/ports/scheduling-event-publisher-port.js';
import type { BookingCancelled } from '../../domain/events/booking-cancelled.js';
import type { BookingCancelledBySystem } from '../../domain/events/booking-cancelled-by-system.js';
import type { BookingCompleted } from '../../domain/events/booking-completed.js';
import type { BookingConfirmed } from '../../domain/events/booking-confirmed.js';
import type { BookingNoShow } from '../../domain/events/booking-no-show.js';
import type { BookingRescheduled } from '../../domain/events/booking-rescheduled.js';
import type { RecurringScheduleCreated } from '../../domain/events/recurring-schedule-created.js';

export class InMemorySchedulingEventPublisherStub implements ISchedulingEventPublisher {
  public publishedBookingConfirmed: BookingConfirmed[] = [];
  public publishedBookingCancelled: BookingCancelled[] = [];
  public publishedBookingCancelledBySystem: BookingCancelledBySystem[] = [];
  public publishedBookingCompleted: BookingCompleted[] = [];
  public publishedBookingNoShow: BookingNoShow[] = [];
  public publishedBookingRescheduled: BookingRescheduled[] = [];
  public publishedRecurringScheduleCreated: RecurringScheduleCreated[] = [];

  async publishBookingConfirmed(event: BookingConfirmed): Promise<void> {
    this.publishedBookingConfirmed.push(event);
  }

  async publishBookingCancelled(event: BookingCancelled): Promise<void> {
    this.publishedBookingCancelled.push(event);
  }

  async publishBookingCancelledBySystem(event: BookingCancelledBySystem): Promise<void> {
    this.publishedBookingCancelledBySystem.push(event);
  }

  async publishBookingCompleted(event: BookingCompleted): Promise<void> {
    this.publishedBookingCompleted.push(event);
  }

  async publishBookingNoShow(event: BookingNoShow): Promise<void> {
    this.publishedBookingNoShow.push(event);
  }

  async publishBookingRescheduled(event: BookingRescheduled): Promise<void> {
    this.publishedBookingRescheduled.push(event);
  }

  async publishRecurringScheduleCreated(event: RecurringScheduleCreated): Promise<void> {
    this.publishedRecurringScheduleCreated.push(event);
  }
}
