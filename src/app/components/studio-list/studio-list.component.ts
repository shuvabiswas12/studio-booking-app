import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { StudioService } from '../../services/studio.service';
import { Studio } from '../../models/studio.model';
import { StudioCardComponent } from '../studio-card/studio-card.component';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { Booking } from '../../models/booking.model';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-studio-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StudioCardComponent,
    BookingFormComponent,
  ],
  templateUrl: './studio-list.component.html',
  styleUrls: ['./studio-list.component.css'],
})
export class StudioListComponent implements OnInit {
  studios: Studio[] = [];
  filteredStudios: Studio[] = [];
  displayedStudios: Studio[] = [];
  searchTerm: string = '';
  noStudiosFound: boolean = false;

  // Auto-suggestion properties
  showSuggestions: boolean = false;
  suggestions: string[] = [];
  isRealTimeFiltering: boolean = false;

  // Radius search properties
  radiusOptions: number[] = [5, 10, 20, 30, 50];
  selectedRadius: number = 10;
  isSearchingByRadius: boolean = false;
  locationError: string | null = null;
  userLocation: { lat: number; lng: number } | null = null;

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalPages: number = 1;

  selectedStudio: Studio | null = null;
  showBookingForm: boolean = false;

  searchControl = new FormControl('');
  priceRangeControl = new FormControl('all');
  priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: '0-50', label: 'Under $50/hr' },
    { value: '50-100', label: 'Between $50-$100/hr' },
    { value: '100+', label: 'Over $100/hr' },
  ];

  constructor(private studioService: StudioService) {}

  ngOnInit(): void {
    this.loadStudios();

    // Subscribe to form control changes to filter studios
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((searchText) => {
        this.isSearchingByRadius = false;
        this.isRealTimeFiltering = true;
        this.generateSuggestions(searchText || '');
        this.filterStudios(searchText || '');
      });

    this.priceRangeControl.valueChanges.subscribe((priceRange) => {
      this.isSearchingByRadius = false;
      this.filterStudios(this.searchControl.value || '');
    });
  }

  loadStudios(): void {
    this.studioService.getStudios().subscribe(
      (data) => {
        this.studios = data;
        this.filteredStudios = data;
        this.updateTotalPages();
        this.updateDisplayedStudios();
      },
      (error) => {
        console.error('Error loading studios:', error);
      }
    );

    this.studioService.getFilteredStudios().subscribe((data) => {
      this.filteredStudios = data;
      this.noStudiosFound = data.length === 0;
      this.currentPage = 1; // Reset to first page when filter changes
      this.updateTotalPages();
      this.updateDisplayedStudios();
    });
  }

  generateSuggestions(searchText: string): void {
    if (!searchText || searchText.trim() === '') {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }

    const lowerSearchText = searchText.toLowerCase();

    // Get unique suggestions from location areas only
    const areaSuggestions = this.getUniqueSuggestions(
      this.studios.map((studio) => studio.Location.Area),
      lowerSearchText
    );

    // Get unique suggestions from location addresses
    const addressSuggestions = this.getUniqueSuggestions(
      this.studios.map((studio) => studio.Location.Address),
      lowerSearchText
    );

    // Get unique suggestions for cities
    const citySuggestions = this.getUniqueSuggestions(
      this.studios.map((studio) => studio.Location.City),
      lowerSearchText
    );

    // Combine and remove duplicates - only location-based suggestions
    this.suggestions = [
      ...new Set([
        ...areaSuggestions,
        ...addressSuggestions,
        ...citySuggestions,
      ]),
    ];
    this.showSuggestions = this.suggestions.length > 0;
  }

  getUniqueSuggestions(items: string[], searchText: string): string[] {
    return items
      .filter(
        (item, index, self) =>
          item.toLowerCase().includes(searchText) &&
          self.indexOf(item) === index
      )
      .slice(0, 5); // Limit to 5 suggestions per category
  }

  selectSuggestion(suggestion: string): void {
    this.searchControl.setValue(suggestion);
    this.showSuggestions = false;
    this.filterStudios(suggestion);
  }

  hideSearchSuggestions(): void {
    // Small delay to allow click events to register before hiding suggestions
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  searchByRadius(): void {
    this.locationError = null;
    this.isSearchingByRadius = false;
    this.isRealTimeFiltering = false;

    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.performRadiusSearch();
      },
      (error) => {
        this.handleLocationError(error);
      }
    );
  }

  handleLocationError(error: GeolocationPositionError): void {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.locationError = 'Location access was denied by the user';
        break;
      case error.POSITION_UNAVAILABLE:
        this.locationError = 'Location information is unavailable';
        break;
      case error.TIMEOUT:
        this.locationError = 'The request to get user location timed out';
        break;
      default:
        this.locationError =
          'An unknown error occurred while retrieving location';
        break;
    }
  }

  performRadiusSearch(): void {
    if (!this.userLocation) return;

    const radiusInKm = this.selectedRadius;

    this.filteredStudios = this.studios.filter((studio) => {
      if (!studio.Location.Coordinates) return false;

      const distance = this.calculateDistance(
        this.userLocation!.lat,
        this.userLocation!.lng,
        studio.Location.Coordinates.Latitude,
        studio.Location.Coordinates.Longitude
      );

      return distance <= radiusInKm;
    });

    this.isSearchingByRadius = true;
    this.noStudiosFound = this.filteredStudios.length === 0;
    this.currentPage = 1;
    this.updatePagination();
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  resetFilters(): void {
    this.searchControl.setValue('');
    this.priceRangeControl.setValue('all');
    this.isSearchingByRadius = false;
    this.isRealTimeFiltering = false;
    this.locationError = null;
    this.filteredStudios = [...this.studios];
    this.updatePagination();
  }

  openBookingForm(studio: Studio): void {
    this.selectedStudio = studio;
    this.showBookingForm = true;
  }

  closeBookingForm(): void {
    this.showBookingForm = false;
    this.selectedStudio = null;
  }

  filterStudios(searchText?: string): void {
    const searchTerm =
      searchText?.toLowerCase() ||
      this.searchControl.value?.toLowerCase() ||
      '';

    // Reset radius search when using text search
    if (searchTerm) {
      this.isSearchingByRadius = false;
    }

    this.filteredStudios = this.studios.filter((studio) => {
      // Filter by location only area
      const matchesLocation =
        searchTerm === '' ||
        (studio.Location.Area &&
          studio.Location.Area.toLowerCase().includes(searchTerm));

      return matchesLocation;
    });

    this.noStudiosFound = this.filteredStudios.length === 0;
    this.currentPage = 1;
    this.updatePagination();
  }

  updateTotalPages(): void {
    this.totalPages = Math.ceil(
      this.filteredStudios.length / this.itemsPerPage
    );
  }

  updateDisplayedStudios(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedStudios = this.filteredStudios.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedStudios();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    // Show up to 5 page numbers including current page
    const pageNumbers: number[] = [];
    const totalPagesToShow = Math.min(5, this.totalPages);

    // Calculate start page
    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(totalPagesToShow / 2)
    );
    let endPage = startPage + totalPagesToShow - 1;

    // Adjust if we're at the end
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - totalPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return pageNumbers;
  }

  onBookStudio(studio: Studio): void {
    this.selectedStudio = studio;
    this.showBookingForm = true;
  }

  onShowDetails(studio: Studio): void {
    // Navigate to details page or show modal with details
    console.log('Show details for:', studio);
  }

  handleBookingSubmitted(booking: Booking): void {
    // Handle the booking submission
    console.log('Booking submitted:', booking);
    this.closeBookingForm();

    // Show success message to user
    this.showBookingConfirmation(booking);
  }

  showBookingConfirmation(booking: Booking): void {
    // Create a non-modal toast message
    const toast = document.createElement('div');
    toast.className = 'booking-toast';

    toast.innerHTML = `
      <div class="toast-content">
        <i class="fas fa-check-circle"></i>
        <div class="toast-message">
          <h4>Booking Confirmed!</h4>
          <p>Studio: ${booking.studioName}</p>
          <p>Date: ${new Date(booking.date).toLocaleDateString()}</p>
          <p>Time: ${booking.startTime} - ${booking.endTime}</p>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(toast);

    // Add event listener to close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(toast);
      });
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(
      this.filteredStudios.length / this.itemsPerPage
    );
    this.goToPage(this.currentPage);
  }
}
