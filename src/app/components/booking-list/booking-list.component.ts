import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Booking } from '../../models/booking.model';
import { BookingService } from '../../services/booking.service';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css',
})
export class BookingListComponent implements OnInit {
  bookings: Booking[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  sortField: string = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.bookingService.getBookings().subscribe(
      (bookings) => {
        this.bookings = bookings;
        this.sortBookings();
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Error loading bookings. Please try again.';
        this.isLoading = false;
      }
    );
  }

  sortBookings(): void {
    this.bookings.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // Extract values based on sort field
      switch (this.sortField) {
        case 'date':
          valueA = new Date(a.date + 'T' + a.startTime);
          valueB = new Date(b.date + 'T' + b.startTime);
          break;
        case 'studioName':
          valueA = a.studioName.toLowerCase();
          valueB = b.studioName.toLowerCase();
          break;
        case 'clientName':
          valueA = a.clientName.toLowerCase();
          valueB = b.clientName.toLowerCase();
          break;
        default:
          valueA = new Date(a.createdAt);
          valueB = new Date(b.createdAt);
      }

      // Compare based on direction
      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  setSortField(field: string): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.sortBookings();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return '';
    }

    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  deleteBooking(bookingId: string): void {
    if (confirm('Are you sure you want to cancel this booking?')) {
      this.bookingService.deleteBooking(bookingId).subscribe(
        (success) => {
          if (success) {
            this.loadBookings();
          } else {
            this.errorMessage = 'Failed to cancel booking. Please try again.';
          }
        },
        (error) => {
          this.errorMessage = 'Error cancelling booking. Please try again.';
        }
      );
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }
}
