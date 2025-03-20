import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Booking } from '../models/booking.model';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly STORAGE_KEY = 'studio_bookings';

  constructor() {}

  getBookings(): Observable<Booking[]> {
    const bookingsJson = localStorage.getItem(this.STORAGE_KEY);
    if (!bookingsJson) {
      return of([]);
    }

    try {
      const bookings = JSON.parse(bookingsJson);
      return of(bookings);
    } catch (error) {
      console.error('Error parsing bookings from localStorage:', error);
      return of([]);
    }
  }

  saveBooking(booking: Booking): Observable<boolean> {
    try {
      const bookingsJson = localStorage.getItem(this.STORAGE_KEY);
      let bookings: Booking[] = [];

      if (bookingsJson) {
        bookings = JSON.parse(bookingsJson);
      }

      // Don't overwrite the booking ID if it already exists
      bookings.push({
        ...booking,
        createdAt: booking.createdAt || new Date().toISOString(),
      });

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookings));
      return of(true);
    } catch (error) {
      console.error('Error saving booking to localStorage:', error);
      return of(false);
    }
  }

  checkAvailability(
    studioId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Observable<boolean> {
    const bookingsJson = localStorage.getItem(this.STORAGE_KEY);
    if (!bookingsJson) {
      return of(true); // No bookings yet, so time slot is available
    }

    try {
      const bookings: Booking[] = JSON.parse(bookingsJson);

      // Check if there's any booking for the same studio, date and overlapping time
      const overlappingBooking = bookings.find((booking) => {
        return (
          booking.studioId === studioId &&
          booking.date === date &&
          ((startTime >= booking.startTime && startTime < booking.endTime) ||
            (endTime > booking.startTime && endTime <= booking.endTime) ||
            (startTime <= booking.startTime && endTime >= booking.endTime))
        );
      });

      return of(!overlappingBooking);
    } catch (error) {
      console.error('Error checking availability:', error);
      return of(false);
    }
  }

  deleteBooking(bookingId: string): Observable<boolean> {
    try {
      const bookingsJson = localStorage.getItem(this.STORAGE_KEY);
      if (!bookingsJson) {
        return of(false);
      }

      const bookings: Booking[] = JSON.parse(bookingsJson);
      const updatedBookings = bookings.filter(
        (booking) => booking.id !== bookingId
      );

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedBookings));
      return of(true);
    } catch (error) {
      console.error('Error deleting booking:', error);
      return of(false);
    }
  }

  private generateBookingId(): string {
    return Date.now().toString() + Math.random().toString(36).substring(2, 9);
  }
}
