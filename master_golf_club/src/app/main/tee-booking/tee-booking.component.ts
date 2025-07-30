import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute } from '@angular/router';
import { BookingService } from '../common-service/booking/booking.service';
import { CollectionService } from '../common-service/collection/collection.service';
import { 
  faUsers, faGolfBall, faCalendarAlt, faClock, faMapMarkerAlt, 
  faPhone, faDirections, faShare, faRoute, faCopy,
  faChevronDown, faChevronUp, faChevronLeft, faChevronRight,
  faWifi, faParking, faUtensils, faShoppingBag
} from '@fortawesome/free-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Course {
  id: number;
  name: string;
  lane: string;
  address: string;
  code: string;
  phone: string;
  timing: string;
  imageUrl: string;
}

interface Tee {
  id: number;
  holeNumber: number;
  label: string;
  pricePerPerson: number;
  formattedPrice: string;
  description: string;
  estimatedDuration: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  formatted_time: string;
}

interface CalendarDay {
  date: Date;
  otherMonth: boolean;
}

@Component({
  selector: 'app-tee-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './tee-booking.component.html',
  styleUrls: ['./tee-booking.component.scss']
})
export class TeeBookingComponent implements OnInit, OnDestroy {
  @Input() course: Course = {
    id: 1,
    name: 'Aldenham Golf Club',
    lane: 'Church Lane',
    address: 'Watford, Hertfordshire',
    code: 'WD25 8NN',
    phone: '+44 1923 853929',
    timing: 'Daily 6:00 AM - 8:00 PM',
    imageUrl: 'assets/images/golf-course.jpg'
  };

  // Icons
  usersIcon = faUsers;
  golfIcon = faGolfBall;
  calendarIcon = faCalendarAlt;
  clockIcon = faClock;
  locationIcon = faMapMarkerAlt;
  phoneIcon = faPhone;
  directionsIcon = faDirections;
  shareIcon = faShare;
  routeIcon = faRoute;
  copyIcon = faCopy;
  chevronDownIcon = faChevronDown;
  chevronUpIcon = faChevronUp;
  chevronLeftIcon = faChevronLeft;
  chevronRightIcon = faChevronRight;
  wifiIcon = faWifi;
  parkingIcon = faParking;
  restaurantIcon = faUtensils;
  shopIcon = faShoppingBag;

  // Booking state
  participantCount: number = 1;
  maxParticipants: number = 4;
  selectedTee: Tee | null = null;
  availableTees: Tee[] = [];
  selectedDate: Date = new Date();
  selectedTime: string = '';
  currentTimeSlots: TimeSlot[] = [];
  basePrice: number = 25; // Base price for 9 holes
  
  // Calendar state
  showCalendar: boolean = false;
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // UI state
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private bookingService: BookingService,
    private collectionService: CollectionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCourseData();
    this.loadAvailableTees();
    this.generateCalendar();
    this.setMinimumDate();
  }

  private loadCourseData(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const courseId = params['courseId'];
      if (courseId) {
        // Load course data based on courseId
        this.loadCourseById(courseId);
      }
    });
  }

  private async loadCourseById(courseId: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const response = await this.collectionService.getCourseDetail(parseInt(courseId));
      
      if (response.data.code === 1 && response.data.data) {
        const courseData = response.data.data;
        
        // Map the API response to our Course interface
        this.course = {
          id: courseData.id,
          name: courseData.name || 'Unnamed Course',
          lane: courseData.location || '',
          address: courseData.address || '',
          code: courseData.location || '',
          phone: courseData.phone || '',
          timing: courseData.timing || '',
          imageUrl: courseData.imageUrl || 'assets/images/golf-course.jpg'
        };
      } else {
        this.errorMessage = response.data.message || 'Failed to load course details';
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      this.errorMessage = 'Failed to load course details. Please try again later.';
    } finally {
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Participant management
  incrementParticipants(): void {
    if (this.participantCount < this.maxParticipants) {
      this.participantCount++;
      this.updateTotalPrice();
    }
  }

  decrementParticipants(): void {
    if (this.participantCount > 1) {
      this.participantCount--;
      this.updateTotalPrice();
    }
  }

  // Tee selection
  loadAvailableTees(): void {
    this.bookingService.getTeesByCourse(this.course.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.code === 1 && response.data) {
            this.availableTees = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading tees:', error);
          this.errorMessage = 'Failed to load available tees';
        }
      });
  }

  selectTee(tee: Tee): void {
    this.selectedTee = tee;
    this.selectedTime = '';
    this.loadAvailableTimeSlots();
  }

  // Date management
  setMinimumDate(): void {
    const today = new Date();
    if (this.selectedDate < today) {
      this.selectedDate = today;
    }
  }

  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the beginning of the week
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Generate 42 days (6 weeks)
    this.calendarDays = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      this.calendarDays.push({
        date: date,
        otherMonth: date.getMonth() !== month
      });
    }
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  selectDate(date: Date): void {
    if (this.isDayAvailable(date)) {
      this.selectedDate = new Date(date);
      this.selectedTime = '';
      this.showCalendar = false;
      this.loadAvailableTimeSlots();
    }
  }

  isDateSelected(date: Date): boolean {
    return this.selectedDate && 
           date.toDateString() === this.selectedDate.toDateString();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isDayAvailable(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date >= today;
  }

  // Time slot management
  loadAvailableTimeSlots(): void {
    if (!this.selectedTee || !this.selectedDate) {
      return;
    }

    this.isLoading = true;
    const dateString = this.selectedDate.toISOString().split('T')[0];
    
    this.bookingService.getAvailableSlots(this.course.id, dateString, this.selectedTee.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 1 && response.data) {
            this.currentTimeSlots = response.data;
          } else {
            this.errorMessage = 'Failed to load available time slots';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error loading time slots:', error);
          this.errorMessage = 'Failed to load available time slots';
        }
      });
  }

  selectTime(time: string): void {
    this.selectedTime = time;
  }

  // Booking validation and submission
  canBook(): boolean {
    return !!(
      this.participantCount > 0 &&
      this.selectedTee &&
      this.selectedDate &&
      this.selectedTime &&
      !this.isLoading
    );
  }

  updateTotalPrice(): void {
    // This will be called whenever participants change
    // The total price calculation is handled in the backend
  }

  getTotalPrice(): number {
    if (!this.selectedTee) return 0;
    return this.selectedTee.pricePerPerson * this.participantCount;
  }

  bookTeeTime(): void {
    if (!this.canBook()) {
      this.errorMessage = 'Please complete all booking details';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bookingData = {
      member: 1, // This should come from authentication service
      course: this.course.id,
      tee: this.selectedTee!.id,
      bookingDate: this.selectedDate.toISOString().split('T')[0],
      bookingTime: this.selectedTime,
      participants: this.participantCount,
      totalPrice: this.getTotalPrice(),
      status: 'pending' as const
    };

    this.bookingService.createBooking(bookingData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.code === 1) {
            this.successMessage = 'Booking created successfully!';
            this.resetBookingForm();
          } else {
            this.errorMessage = response.message || 'Booking failed';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Booking error:', error);
          this.errorMessage = error.message || 'Failed to create booking';
        }
      });
  }

  resetBookingForm(): void {
    this.participantCount = 1;
    this.selectedTee = null;
    this.selectedDate = new Date();
    this.selectedTime = '';
    this.currentTimeSlots = [];
    this.showCalendar = false;
  }

  // Contact actions
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      // Show toast or feedback
      console.log('Address copied to clipboard');
    });
  }

  makeCall(): void {
    window.open(`tel:${this.course.phone}`, '_self');
  }

  getDirections(): void {
    const address = `${this.course.lane}, ${this.course.address}, ${this.course.code}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  }

  shareLocation(): void {
    const address = `${this.course.lane}, ${this.course.address}, ${this.course.code}`;
    if (navigator.share) {
      navigator.share({
        title: this.course.name,
        text: `Check out ${this.course.name}`,
        url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      });
    } else {
      this.copyToClipboard(address);
    }
  }
}