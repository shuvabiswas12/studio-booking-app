import { Component, OnInit, HostListener } from '@angular/core';
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
  currentSuggestionIndex: number = -1; // Track selected suggestion

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

  // Properties for UI state
  isLoading: boolean = true;
  noStudiosInRadius: boolean = false;

  constructor(private studioService: StudioService) {}

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Only handle keyboard events when suggestions are visible
    if (!this.showSuggestions || this.suggestions.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault(); // Prevent scrolling the page
        this.navigateSuggestion(1);
        break;
      case 'ArrowUp':
        event.preventDefault(); // Prevent scrolling the page
        this.navigateSuggestion(-1);
        break;
      case 'Enter':
        if (
          this.currentSuggestionIndex >= 0 &&
          this.currentSuggestionIndex < this.suggestions.length
        ) {
          event.preventDefault();
          this.selectSuggestion(this.suggestions[this.currentSuggestionIndex]);
        }
        break;
      case 'Escape':
        this.showSuggestions = false;
        this.currentSuggestionIndex = -1;
        break;
    }
  }

  navigateSuggestion(direction: number): void {
    // Calculate the new index with wrapping
    const newIndex = this.currentSuggestionIndex + direction;

    if (newIndex < 0) {
      // Wrap to the end when going up from the first item
      this.currentSuggestionIndex = this.suggestions.length - 1;
    } else if (newIndex >= this.suggestions.length) {
      // Wrap to the beginning when going down from the last item
      this.currentSuggestionIndex = 0;
    } else {
      this.currentSuggestionIndex = newIndex;
    }

    // Preview the selected suggestion in the input field
    const selectedSuggestion = this.suggestions[this.currentSuggestionIndex];
    if (selectedSuggestion) {
      this.searchControl.setValue(selectedSuggestion, { emitEvent: false });
    }
  }

  ngOnInit(): void {
    this.loadStudios();

    // Subscribe to form control changes to filter studios
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((searchText) => {
        this.isSearchingByRadius = false;
        this.isRealTimeFiltering = true;
        this.currentSuggestionIndex = -1; // Reset selected index when input changes
        this.generateSuggestions(searchText || '');
        this.filterStudios(searchText || '');
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
          item &&
          item.toLowerCase().includes(searchText) &&
          self.indexOf(item) === index
      )
      .slice(0, 5); // Limit to 5 suggestions per category
  }

  selectSuggestion(suggestion: string): void {
    // Set the selected suggestion as the search input value
    this.searchControl.setValue(suggestion);

    // Small delay to ensure the value is set before hiding the suggestions
    setTimeout(() => {
      // Close the suggestions dropdown
      this.showSuggestions = false;
      this.currentSuggestionIndex = -1; // Reset selected index

      // Filter studios based on the selected suggestion
      this.filterStudios(suggestion);

      // Focus back on the input field for better UX
      document.getElementById('searchInput')?.focus();
    }, 50);
  }

  hideSearchSuggestions(): void {
    // Small delay to allow click events to register before hiding suggestions
    setTimeout(() => {
      this.showSuggestions = false;
      this.currentSuggestionIndex = -1; // Reset selected index
    }, 200);
  }

  // Auto-run radius search when user location is available
  runRadiusSearchIfLocationAvailable(): void {
    if (this.userLocation) {
      this.performRadiusSearch();
    } else {
      this.getUserLocation();
    }
  }

  // Get user location once
  getUserLocation(): void {
    this.locationError = null;

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser';
      return;
    }

    // Check if we have permission for geolocation
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'denied') {
            this.locationError =
              'Location access is blocked. Please enable location in your browser settings and try again.';
            return;
          }

          // Get the location if permissions are granted or prompt the user
          this.getGeoLocation();

          // Listen for permission changes
          permissionStatus.addEventListener('change', () => {
            if (permissionStatus.state === 'granted') {
              this.getGeoLocation();
            } else if (permissionStatus.state === 'denied') {
              this.locationError =
                'Location access was denied. Please enable location in your browser settings and try again.';
            }
          });
        });
    } else {
      // Fallback for browsers that don't support permissions API
      this.getGeoLocation();
    }
  }

  // Separate method to get the actual geolocation
  private getGeoLocation(): void {
    // Show loading state
    this.locationError = 'Requesting your location...';

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.locationError = null;
        this.performRadiusSearch();
      },
      (error) => {
        this.handleLocationError(error);
      },
      options
    );
  }

  searchByRadius(): void {
    this.runRadiusSearchIfLocationAvailable();
  }

  // Called when radius selection changes
  onRadiusChange(): void {
    if (this.isSearchingByRadius && this.userLocation) {
      this.performRadiusSearch();
    }
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

    // Set flags for UI updates
    this.isSearchingByRadius = true;
    this.isRealTimeFiltering = false;
    this.noStudiosFound = this.filteredStudios.length === 0;

    // Add more specific flag for radius search with no results
    this.noStudiosInRadius = this.filteredStudios.length === 0;

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
    this.isSearchingByRadius = false;
    this.isRealTimeFiltering = false;
    this.locationError = null;
    this.noStudiosInRadius = false;
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
