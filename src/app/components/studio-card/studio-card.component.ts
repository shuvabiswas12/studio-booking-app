import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Studio } from '../../models/studio.model';

@Component({
  selector: 'app-studio-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './studio-card.component.html',
  styleUrls: ['./studio-card.component.css'],
})
export class StudioCardComponent {
  @Input() studio!: Studio;
  @Output() bookNow = new EventEmitter<Studio>();
  @Output() showDetails = new EventEmitter<Studio>();

  constructor() {}

  getTopAmenities(): string[] {
    // Return top 3 amenities
    return this.studio.Amenities.slice(0, 3);
  }

  getShortDescription(): string {
    // Return a shortened description for the card
    const maxLength = 100;
    if (this.studio.Description.length > maxLength) {
      return this.studio.Description.substring(0, maxLength) + '...';
    }
    return this.studio.Description;
  }

  onBookNow(): void {
    this.bookNow.emit(this.studio);
  }

  onShowDetails(): void {
    this.showDetails.emit(this.studio);
  }

  getStarRating(rating: number): (0 | 0.5 | 1)[] {
    const stars: (0 | 0.5 | 1)[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(1);
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push(0.5);
    }

    // Fill the rest with empty stars
    while (stars.length < 5) {
      stars.push(0);
    }

    return stars;
  }
}
