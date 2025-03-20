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

  // List of dummy image URLs for different studio types
  private dummyImageUrls: Record<string, string[]> = {
    'Recording Studio': [
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04',
      'https://images.unsplash.com/photo-1598653222000-6b7b7a552625',
      'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0',
    ],
    Photography: [
      'https://images.unsplash.com/photo-1581094376818-c5e9879198b8',
      'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4',
      'https://images.unsplash.com/photo-1551269901-5c5e14c25df7',
    ],
    'Rehearsal Space': [
      'https://images.unsplash.com/photo-1525201548942-d8732f6617a0',
      'https://images.unsplash.com/photo-1511379938547-c1f69419868d',
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae',
    ],
    'Art Studio': [
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f',
      'https://images.unsplash.com/photo-1537192830142-e93305a3c165',
      'https://images.unsplash.com/photo-1572783915226-20c3e9d29bc8',
    ],
  };

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

  getStudioImage(): string {
    // Get studio type or use a default
    const studioType = this.studio.Type || 'Recording Studio';

    // Select images available for this studio type or use first category as default
    const availableImages =
      this.dummyImageUrls[studioType] ||
      this.dummyImageUrls['Recording Studio'];

    // Use studio ID to consistently select the same image for the same studio
    // Modulo operation ensures we don't go out of bounds
    const imageIndex = this.studio.Id % availableImages.length;

    // Add size parameters to the Unsplash URL (600x400 pixels)
    return `${availableImages[imageIndex]}?auto=format&fit=crop&w=600&h=400&q=80`;
  }

  onBookNow(): void {
    this.bookNow.emit(this.studio);
  }

  onShowDetails(): void {
    this.showDetails.emit(this.studio);
  }

  handleImageError(event: Event): void {
    // Set the source to a placeholder image when error occurs
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/studio-placeholder.jpg';
    imgElement.classList.add('placeholder');

    // Optional: Add a title attribute to show on hover
    imgElement.setAttribute('title', 'Original image could not be loaded');
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
