import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { StudioService } from '../../services/studio.service';
import { Studio } from '../../models/studio.model';
import { StudioCardComponent } from '../studio-card/studio-card.component';
import { BookingFormComponent } from '../booking-form/booking-form.component';
import { Booking } from '../../models/booking.model';

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
  areas: string[] = [];
  searchTerm: string = '';
  selectedArea: string = '';
  noStudiosFound: boolean = false;

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
    this.loadAreas();

    // Subscribe to form control changes to filter studios
    this.searchControl.valueChanges.subscribe((searchText) => {
      this.filterStudios();
    });

    this.priceRangeControl.valueChanges.subscribe((priceRange) => {
      this.filterStudios();
    });
  }

  loadStudios(): void {
    this.studioService.getStudios().subscribe(
      (data) => {
        this.studios = data;
        this.filteredStudios = data;
        this.extractAreas();
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

  loadAreas(): void {
    this.studioService.getUniqueAreas().subscribe(
      (areas) => {
        this.areas = areas;
      },
      (error) => {
        console.error('Error loading areas:', error);
      }
    );
  }

  onAreaChange(): void {
    this.studioService.searchByArea(this.selectedArea);
  }

  onAreaSearch(): void {
    this.studioService.searchByArea(this.searchTerm);
  }

  resetFilters(): void {
    this.searchControl.setValue('');
    this.priceRangeControl.setValue('all');
    this.selectedArea = '';
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

  filterStudios(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    const priceRange = this.priceRangeControl.value || 'all';

    this.filteredStudios = this.studios.filter((studio) => {
      // Filter by search term
      const matchesSearch =
        studio.Name.toLowerCase().includes(searchTerm) ||
        studio.Description.toLowerCase().includes(searchTerm) ||
        studio.Type.toLowerCase().includes(searchTerm) ||
        (studio.Location.Address &&
          studio.Location.Address.toLowerCase().includes(searchTerm)) ||
        (studio.Location.Area &&
          studio.Location.Area.toLowerCase().includes(searchTerm));

      // Filter by price range
      let matchesPrice = true;
      const hourlyRate = studio.PricePerHour;

      if (priceRange === '0-50') {
        matchesPrice = hourlyRate < 50;
      } else if (priceRange === '50-100') {
        matchesPrice = hourlyRate >= 50 && hourlyRate <= 100;
      } else if (priceRange === '100+') {
        matchesPrice = hourlyRate > 100;
      }

      // Filter by area
      const matchesArea =
        !this.selectedArea || studio.Location.Area === this.selectedArea;

      return matchesSearch && matchesPrice && matchesArea;
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

  extractAreas(): void {
    // Extract unique areas from studios
    const areaSet = new Set<string>();
    this.studios.forEach((studio) => {
      if (studio.Location.Area) {
        areaSet.add(studio.Location.Area);
      }
    });
    this.areas = Array.from(areaSet).sort();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(
      this.filteredStudios.length / this.itemsPerPage
    );
    this.goToPage(this.currentPage);
  }
}
