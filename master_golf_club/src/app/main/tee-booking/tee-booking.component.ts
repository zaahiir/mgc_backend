import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute } from '@angular/router';
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
  description?: string;
  amenities?: Amenity[];
}

interface Amenity {
  id: number;
  name: string;
  description: string;
  icon_svg?: string;
  icon_path?: string;
  viewbox?: string;
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
  available: boolean;
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
    private collectionService: CollectionService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadCourseData();
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
      } else {
        // If no courseId, try to load tees for default course
        console.log('No courseId provided, using default course');
        this.loadAvailableTees();
      }
    });
  }

  private async loadCourseById(courseId: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      console.log('Loading course with ID:', courseId);
      const response = await this.collectionService.getCourseDetail(parseInt(courseId));
      
      console.log('Course response:', response);
      
      if (response.data.code === 1 && response.data.data) {
        const courseData = response.data.data;
        
        // Map the API response to our Course interface
        this.course = {
          id: courseData.id,
          name: courseData.name || 'Unnamed Course',
          lane: courseData.lane || courseData.address || '',
          address: courseData.address || '',
          code: courseData.code || '',
          phone: courseData.phone || '',
          timing: courseData.timing || '',
          imageUrl: courseData.imageUrl || 'assets/images/golf-course.jpg',
          description: courseData.description || '',
          amenities: courseData.amenities || []
        };
        
        console.log('Course loaded:', this.course);
        
        // Load tees after course data is loaded
        await this.loadAvailableTees();
      } else {
        console.error('Failed to load course:', response.data);
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
  async loadAvailableTees(): Promise<void> {
    try {
      console.log('Loading tees for course ID:', this.course.id);
      const response = await this.collectionService.getTeesByCourse(this.course.id);
      
      console.log('Tee response:', response);
      
      if (response.data.code === 1 && response.data.data) {
        this.availableTees = response.data.data.map((tee: any) => ({
          id: tee.id,
          holeNumber: tee.holeNumber,
          label: tee.label || `${tee.holeNumber} Holes`,
          pricePerPerson: tee.pricePerPerson,
          formattedPrice: tee.formattedPrice || `£${tee.pricePerPerson}`,
          description: `${tee.holeNumber} holes of golf`,
          estimatedDuration: `${Math.round(tee.holeNumber * 10)} minutes`
        }));
        
        console.log('Available tees loaded:', this.availableTees);
      } else {
        console.error('Failed to load tees:', response.data);
        this.errorMessage = response.data.message || 'Failed to load available tees';
      }
    } catch (error) {
      console.error('Error loading tees:', error);
      this.errorMessage = 'Failed to load available tees. Please try again later.';
    }
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
        otherMonth: date.getMonth() !== month,
        available: this.isDayAvailable(date)
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
    
    // Only allow next 8 days from today
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 8);
    
    return date >= today && date <= maxDate;
  }

  // Time slot management
  async loadAvailableTimeSlots(): Promise<void> {
    if (!this.selectedTee || !this.selectedDate) {
      return;
    }

    this.isLoading = true;
    const dateString = this.selectedDate.toISOString().split('T')[0];
    
    try {
      const response = await this.collectionService.getAvailableSlots(
        this.course.id, 
        dateString, 
        this.selectedTee.id
      );
      
      this.isLoading = false;
      if (response.data.code === 1 && response.data.data) {
        this.currentTimeSlots = response.data.data;
      } else {
        this.errorMessage = 'Failed to load available time slots';
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Error loading time slots:', error);
      this.errorMessage = 'Failed to load available time slots';
    }
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

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) {
      this.errorMessage = 'Please complete all booking details';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const bookingData = {
      member: 1, // Default member ID for non-logged users
      course: this.course.id,
      tee: this.selectedTee!.id,
      bookingDate: this.selectedDate.toISOString().split('T')[0],
      bookingTime: this.selectedTime,
      participants: this.participantCount,
      totalPrice: this.getTotalPrice(),
      status: 'pending' as const
    };

    try {
      const response = await this.collectionService.createBooking(bookingData);
      
      this.isLoading = false;
      if (response.data.code === 1) {
        this.successMessage = 'Booking created successfully!';
        this.resetBookingForm();
      } else {
        this.errorMessage = response.data.message || 'Booking failed';
      }
    } catch (error: any) {
      this.isLoading = false;
      console.error('Booking error:', error);
      this.errorMessage = error.response?.data?.message || 'Failed to create booking';
    }
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

  // Amenity icon helper
  getAmenityIcon(amenity: Amenity): any {
    // Map amenity names to FontAwesome icons
    const iconMap: { [key: string]: any } = {
      'WiFi': this.wifiIcon,
      'Parking': this.parkingIcon,
      'Restaurant': this.restaurantIcon,
      'Pro Shop': this.shopIcon
    };
    
    return iconMap[amenity.name] || this.wifiIcon; // Default to WiFi icon
  }
}