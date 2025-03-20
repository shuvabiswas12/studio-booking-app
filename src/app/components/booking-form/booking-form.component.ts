import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Studio } from '../../models/studio.model';
import { Booking } from '../../models/booking.model';
import { BookingService } from '../../services/booking.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css'],
})
export class BookingFormComponent {
  @Input() studio!: Studio | null;
  @Output() formSubmitted = new EventEmitter<Booking>();
  @Output() formCancelled = new EventEmitter<void>();

  bookingForm: FormGroup;

  constructor(private fb: FormBuilder, private bookingService: BookingService) {
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.bookingForm.valid && this.studio) {
      const formData = this.bookingForm.value;

      const booking: Booking = {
        id: this.generateBookingId(),
        studioId: this.studio.Id.toString(),
        studioName: this.studio.Name,
        studioType: this.studio.Type,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        clientName: formData.name,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        totalPrice: this.calculateTotalPrice(
          formData.startTime,
          formData.endTime
        ),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      this.formSubmitted.emit(booking);
    }
  }

  onCancel(): void {
    this.formCancelled.emit();
  }

  private generateBookingId(): string {
    // Simple booking ID generator - in a real app this would come from the backend
    return 'BK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private calculateTotalPrice(startTime: string, endTime: string): number {
    if (!this.studio) return 0;

    // Calculate hours between start and end time
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return this.studio.PricePerHour * hours;
  }
}
