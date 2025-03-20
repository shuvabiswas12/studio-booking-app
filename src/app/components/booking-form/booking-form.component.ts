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
  isCheckingAvailability: boolean = false;
  availabilityError: string | null = null;
  bookingSuccess: string | null = null;
  estimatedPrice: number = 0;

  // Min date should be today
  minDate: string = new Date().toISOString().split('T')[0];

  // Define available time slots based on studio hours
  availableStartTimes: string[] = [];
  availableEndTimes: string[] = [];

  constructor(private fb: FormBuilder, private bookingService: BookingService) {
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
    });

    // Subscribe to form value changes to calculate price
    this.bookingForm.get('startTime')?.valueChanges.subscribe(() => {
      this.updateEstimatedPrice();
      this.clearAvailabilityError();
    });

    this.bookingForm.get('endTime')?.valueChanges.subscribe(() => {
      this.updateEstimatedPrice();
      this.clearAvailabilityError();
    });

    this.bookingForm.get('date')?.valueChanges.subscribe(() => {
      this.clearAvailabilityError();
    });
  }

  ngOnInit(): void {
    if (this.studio) {
      this.setupTimeSlots();
    }
  }

  ngOnChanges(): void {
    if (this.studio) {
      this.setupTimeSlots();
    }
  }

  setupTimeSlots(): void {
    if (!this.studio) return;

    // Parse studio opening and closing times
    const openTime = this.convertTimeToHours(this.studio.Availability.Open);
    const closeTime = this.convertTimeToHours(this.studio.Availability.Close);

    this.availableStartTimes = [];
    this.availableEndTimes = [];

    // Generate hourly slots from opening time to 1 hour before closing
    for (let hour = openTime; hour < closeTime; hour++) {
      this.availableStartTimes.push(this.formatHourToTimeString(hour));
    }

    // Generate hourly slots from 1 hour after opening to closing time
    for (let hour = openTime + 1; hour <= closeTime; hour++) {
      this.availableEndTimes.push(this.formatHourToTimeString(hour));
    }
  }

  convertTimeToHours(timeString: string): number {
    const [hours] = timeString.split(':').map(Number);
    return hours;
  }

  formatHourToTimeString(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  updateEstimatedPrice(): void {
    const startTime = this.bookingForm.get('startTime')?.value;
    const endTime = this.bookingForm.get('endTime')?.value;

    if (startTime && endTime && this.studio) {
      this.estimatedPrice = this.calculateTotalPrice(startTime, endTime);
    } else {
      this.estimatedPrice = 0;
    }
  }

  clearAvailabilityError(): void {
    this.availabilityError = null;
  }

  onSubmit(): void {
    if (this.bookingForm.valid && this.studio) {
      const formData = this.bookingForm.value;

      // Check if end time is after start time
      const startDate = new Date(`2000-01-01T${formData.startTime}`);
      const endDate = new Date(`2000-01-01T${formData.endTime}`);

      if (endDate <= startDate) {
        this.availabilityError = 'End time must be after start time.';
        return;
      }

      this.isCheckingAvailability = true;
      this.availabilityError = null;

      // Check availability before proceeding
      this.bookingService
        .checkAvailability(
          this.studio.Id.toString(),
          formData.date,
          formData.startTime,
          formData.endTime
        )
        .subscribe(
          (isAvailable) => {
            this.isCheckingAvailability = false;

            if (isAvailable) {
              this.createAndSaveBooking(formData);
            } else {
              this.availabilityError =
                'The selected time slot is not available. Please choose another time.';
            }
          },
          (error) => {
            this.isCheckingAvailability = false;
            this.availabilityError =
              'Error checking availability. Please try again.';
            console.error('Error checking availability:', error);
          }
        );
    }
  }

  createAndSaveBooking(formData: any): void {
    if (!this.studio) return;

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
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage
    this.bookingService.saveBooking(booking).subscribe(
      (success) => {
        if (success) {
          this.bookingSuccess = 'Booking confirmed! Details have been saved.';
          setTimeout(() => {
            this.formSubmitted.emit(booking);
          }, 2000); // Show success message for 2 seconds before closing
        } else {
          this.availabilityError =
            'Error saving your booking. Please try again.';
        }
      },
      (error) => {
        this.availabilityError = 'Error saving your booking. Please try again.';
        console.error('Error saving booking:', error);
      }
    );
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
