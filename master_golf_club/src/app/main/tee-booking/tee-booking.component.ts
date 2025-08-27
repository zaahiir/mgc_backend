import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';
import { CollectionService } from '../common-service/collection/collection.service';
import { 
  faUsers, faGolfBall, faCalendarAlt, faClock, faMapMarkerAlt, 
  faPhone, faDirections, faShare, faRoute, faCopy,
  faChevronDown, faChevronUp, faChevronLeft, faChevronRight,
  faWifi, faParking, faUtensils, faShoppingBag
} from '@fortawesome/free-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
  amenityName: string;
  amenityTooltip: string;
  amenitiesDescription?: string;
  amenity_icon_svg?: string;
  amenity_icon_path?: string;
  amenity_viewbox?: string;
}

interface Tee {
  id: number;
  holeNumber: number;
  label: string;
  description: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
  formatted_time: string;
  bookings?: BookingDetail[];
  booking_count?: number;
  slot_status?: 'available' | 'partially_available' | 'booked' | 'selected';
  available_spots?: number;
  total_participants?: number;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  participantCount?: number;
  slot_date?: string;
  formatted_slot_date?: string;
  tee_id?: number;
  tee_name?: string;
  tee_label?: string;
}

interface BookingDetail {
  booking_id: number;
  member_name: string;
  participants: number;
  status: string;
  hole_number: number;
  start_time: string;
  end_time: string;
}

interface SlotSelection {
  id?: number;
  time: string;
  participants: number;
  date: Date | string;
  tee: Tee;
  slot_date: string;
  tee_id: number;
  tee_name: string;
  bookings?: BookingDetail[];
  isJoinRequest?: boolean;
  originalStatus?: string;
  currentParticipants?: number;
  availableSpots?: number;
  isOwnBooking?: boolean;
  canAddParticipants?: boolean;
  canJoinRequest?: boolean;
  userExistingRequest?: {
    id: number;
    status: string;
    participants: number;
    message: string;
  };
  tooltipText?: string;
  originalBookingId?: number;
}

interface BookingConfirmationData {
  totalSlots?: number;
  selectedSlots?: Array<{
    time: string;
    participants: number;
    date?: Date | string;
    tee?: string;
    tee_name?: string;
    teeHoles?: number;
    teeId?: number;
    status?: string;
    isJoinRequest?: boolean;
    isExistingRequest?: boolean;
    existingStatus?: string;
    originalSlotParticipants?: number;
  }>;
  courseName?: string;
  teeLabel?: string;
  date?: Date;
  time?: string;
  participants?: number;
  status?: string;
  // Individual slot booking details
  slotBookings?: Array<{
    id: number | string;
    booking_id: string;
    slot_date: string;
    booking_time: string;
    participants: number;
    status: string;
    created_at: string;
    formatted_created_date: string;
    tee: {
      holeNumber: number;
    };
    course: {
      courseName: string;
    };
    isJoinRequest?: boolean;
    isExistingRequest?: boolean;
    existingStatus?: string;
    originalSlotParticipants?: number;
  }>;
  individualBookingIds?: string[];
  confirmedCount?: number;
  pendingCount?: number;
  addParticipantsCount?: number;
  confirmationType?: string;
  confirmationTitle?: string;
  confirmationSubtitle?: string;
  slotDetails?: Array<{
    bookingId: string;
    date: string;
    tee: string;
    time: string;
    status: string;
    participants: number;
    isJoinRequest: boolean;
    isAddParticipants: boolean;
  }>;
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
  styleUrls: ['./tee-booking.component.css']
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
  calendarIcon = faCalendarAlt;
  clockIcon = faClock;
  usersIcon = faUsers;
  golfBallIcon = faGolfBall;
  mapMarkerIcon = faMapMarkerAlt;
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
  utensilsIcon = faUtensils;
  shoppingBagIcon = faShoppingBag;
  restaurantIcon = faUtensils;
  shopIcon = faShoppingBag;
  golfIcon = faGolfBall;

  // UK timezone utilities
  private ukTimezone = 'Europe/London';
  
  // Helper method to get current UK time
  private getCurrentUKTime(): Date {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: this.ukTimezone }));
  }
  
  // Helper method to format date for UK timezone
  private formatDateForUK(date: Date): string {
    return date.toLocaleDateString('en-GB', { 
      timeZone: this.ukTimezone,
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
  
  // Helper method to format time for UK timezone
  private formatTimeForUK(date: Date): string {
    return date.toLocaleTimeString('en-GB', { 
      timeZone: this.ukTimezone,
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  }
  
  // Helper method to check if date is today in UK timezone
  private isTodayInUK(date: Date): boolean {
    const ukNow = this.getCurrentUKTime();
    return date.toDateString() === ukNow.toDateString();
  }

  // Core state
  selectedTee: Tee | null = null;
  availableTees: Tee[] = [];
  selectedDate: Date = new Date();
  currentTimeSlots: TimeSlot[] = [];
  
  // Calendar state
  showCalendar: boolean = false;
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // UI state
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Booking modal properties
  showBookingModal: boolean = false;
  bookingConfirmationData: BookingConfirmationData | null = null;

  // Slot management
  selectedSlots: SlotSelection[] = [];
  showSlotModal: boolean = false;
  currentSlotForModal: (TimeSlot & { isOwnBooking?: boolean }) | null = null;
  currentSlotParticipants: number = 1;

  private destroy$ = new Subject<void>();
  private pageUnloadHandler: (() => void) | null = null;

  constructor(
    private collectionService: CollectionService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      // Initialize with current UK date
      const ukNow = this.getCurrentUKTime();
      this.currentDate = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
      this.selectedDate = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
      
      this.loadCourseData();
      this.generateCalendar();
      this.setMinimumDate();
      
      // Handle fresh page load
      this.handleFreshPageLoad();
      
      this.loadStoredSelections(); // Load any previously stored selections
      
      // Check if this is a page refresh after booking
      this.checkForPostBookingRefresh();
      
      // Setup page unload handler
      this.setupPageUnloadHandler();
      
      // Setup page load handler
      this.setupPageLoadHandler();
      
      // Setup navigation event handlers
      this.setupNavigationHandlers();
      
      // Load existing join requests to prevent duplicates
      // this.loadExistingJoinRequests(); // Method doesn't exist
    }, 100);
  }

  private loadCourseData(): void {
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const courseId = params['courseId'];
      if (courseId) {
        this.loadCourseById(courseId);
      } else {
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
    // Store current selections before destroying component
    if (this.selectedDate && this.selectedTee) {
      this.storeSelections();
    }
    
    // Remove the page unload event listener
    if (this.pageUnloadHandler) {
      window.removeEventListener('beforeunload', this.pageUnloadHandler);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
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
          description: `${tee.holeNumber} holes of golf`
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
    console.log('Tee selected:', tee);
    
    // Store current selections before switching
    if (this.selectedTee && this.selectedDate) {
      this.storeSelections();
    }
    
    this.selectedTee = tee;
    
    // Load time slots if date is already selected
    if (this.selectedDate) {
      this.loadAvailableTimeSlots();
      
      // After loading time slots, restore any stored selections for the new tee
      setTimeout(() => {
        this.restoreSlotSelectionState();
        this.forceSlotDisplayUpdate();
      }, 100);
    }
  }

  // Date management
  setMinimumDate(): void {
    // Use UK time for minimum date
    const ukNow = this.getCurrentUKTime();
    const ukToday = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
    
    if (this.selectedDate < ukToday) {
      this.selectedDate = new Date(ukToday);
      console.log('Minimum date set to UK today:', this.selectedDate.toDateString());
    }
  }

  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
  }

  generateCalendar(): void {
    this.calendarDays = [];
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      this.calendarDays.push({
        date: date,
        otherMonth: true,
        available: false
      });
    }
    
    // Add all days of the current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push({
        date: date,
        otherMonth: false,
        available: this.isDayAvailable(date)
      });
    }
    
    // Add days from next month
    const lastDayOfWeek = lastDay.getDay();
    for (let day = 1; day <= 6 - lastDayOfWeek; day++) {
      const date = new Date(year, month + 1, day);
      this.calendarDays.push({
        date: date,
        otherMonth: true,
        available: false
      });
    }
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  selectDate(date: Date): void {
    if (this.isDayAvailable(date)) {
      // Store current selections before switching
      if (this.selectedDate && this.selectedTee) {
        this.storeSelections();
      }
      
      this.selectedDate = new Date(date);
      
      this.showCalendar = false;
      
      // Load time slots if tee is already selected
      if (this.selectedTee) {
        this.loadAvailableTimeSlots();
      }
      
      // After loading time slots, restore any stored selections for the new date
      setTimeout(() => {
        if (this.selectedTee) {
          this.restoreSlotSelectionState();
          this.forceSlotDisplayUpdate();
        }
      }, 100);
    }
  }

  isDateSelected(date: Date): boolean {
    return this.selectedDate && 
           date.toDateString() === this.selectedDate.toDateString();
  }

  isToday(date: Date): boolean {
    // Use UK time for comparison
    const ukNow = this.getCurrentUKTime();
    const ukToday = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
    ukToday.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === ukToday.getTime();
  }

  isSelectedDateToday(): boolean {
    if (!this.selectedDate) return false;
    
    // Use UK time for consistent date comparison with filterTimeSlotsForDate
    const ukNow = this.getCurrentUKTime();
    const ukToday = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
    ukToday.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate.getTime() === ukToday.getTime();
  }

  isDayAvailable(date: Date): boolean {
    // Use UK time for calendar availability
    const ukNow = this.getCurrentUKTime();
    const ukToday = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
    ukToday.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Only allow next 7 days from today (including today)
    const maxDate = new Date(ukToday);
    maxDate.setDate(ukToday.getDate() + 6);
    
    const isAvailable = checkDate >= ukToday && checkDate <= maxDate;
    
    return isAvailable;
  }

  // Time slot management
  async loadAvailableTimeSlots(): Promise<void> {
    if (!this.selectedTee || !this.selectedDate) {
      this.currentTimeSlots = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Use the selected date directly without UK timezone conversion for backend
      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await this.collectionService.getAvailableSlotsWithParticipants(
        this.course.id,
        dateStr, // Use selected date directly
        this.selectedTee.id,
        1 // Default participant count for slot display
      );

      if (response && response.data && response.data.code === 1) {
        const responseData = response.data.data;
        let slots = [];
        
        if (Array.isArray(responseData)) {
          slots = responseData;
        } else if (responseData && responseData.slots && Array.isArray(responseData.slots)) {
          slots = responseData.slots;
        } else {
          console.error('Unexpected response format:', responseData);
          this.currentTimeSlots = [];
          this.errorMessage = 'Invalid response format from server';
          return;
        }
        
        // Filter slots based on current date vs other dates
        const filteredSlots = this.filterTimeSlotsForDate(slots);
        
        this.currentTimeSlots = filteredSlots.map((slot: any) => {
          // Use the selected date directly for slot_date to ensure proper date matching
          const year = this.selectedDate.getFullYear();
          const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(this.selectedDate.getDate()).padStart(2, '0');
          const slotDate = `${year}-${month}-${day}`;
          
          // Format for display using the selected date directly
          const formattedSlotDate = this.selectedDate.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          });
          
          const mappedSlot = {
            time: slot.time,
            available: slot.available,
            formatted_time: slot.formatted_time,
            slot_status: slot.slot_status,
            available_spots: slot.available_spots,
            total_participants: slot.total_participants,
            bookings: slot.bookings || [],
            booking_count: slot.booking_count || 0,
            tee_id: slot.tee_id,
            tee_name: slot.tee_name,
            slot_date: slotDate,
            formatted_slot_date: formattedSlotDate
          };
          

          
          return mappedSlot;
        });

        // Restore selection state for slots that were previously selected
        this.restoreSlotSelectionState();
        
        // Force update the display to ensure selections are visible
        setTimeout(() => {
          this.forceSlotDisplayUpdate();
        }, 50);
        

      } else {
        this.currentTimeSlots = [];
        this.errorMessage = response?.data?.message || 'Failed to load time slots';
      }
    } catch (error) {
      console.error('Error loading time slots:', error);
      this.currentTimeSlots = [];
      this.errorMessage = 'Failed to load time slots. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // Filter time slots based on current date vs other dates
  filterTimeSlotsForDate(slots: any[]): any[] {
    if (!Array.isArray(slots)) {
      return [];
    }
    
    // Use UK time for comparison
    const ukNow = this.getCurrentUKTime();
    const ukToday = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate());
    ukToday.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Compare dates using time values (more reliable than toDateString)
    const isToday = selectedDate.getTime() === ukToday.getTime();
    
    if (!isToday) {
      // For all future dates, show all slots (no filtering)
      return slots;
    }
    
    // Only for today, filter out slots that have already passed using UK time
    const ukCurrentTime = ukNow.getHours() * 60 + ukNow.getMinutes();
    
    const filteredSlots = slots.filter((slot: any) => {
      if (!slot || !slot.time) {
        return false;
      }
      
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      
      // Round up to next 8-minute slot
      const slotDuration = 8;
      const roundedCurrentTime = Math.ceil(ukCurrentTime / slotDuration) * slotDuration;
      
      const isAvailable = slotTimeInMinutes >= roundedCurrentTime;
      
      return isAvailable;
    });
    
    return filteredSlots;
  }

  // Slot selection methods
  selectSlot(slot: TimeSlot): void {
    if (slot.slot_status === 'booked' || !slot.available) {
      return;
    }

    // Check if slot is already selected
    const isAlreadySelected = this.isSlotAlreadySelected(slot);

    if (isAlreadySelected) {
      // If slot is already selected, deselect it
      this.deselectSlot(slot);
      return;
    }

    // Open modal for available and partially_available slots
    if (slot.slot_status === 'available' || slot.slot_status === 'partially_available') {
      this.openSlotModal(slot).catch(error => {
        console.error('Error opening slot modal:', error);
      });
      return;
    }
  }

  // Toggle slot selection (for direct clicking on time slots)
  toggleSlotSelection(slot: TimeSlot): void {
    if (slot.slot_status === 'booked' || !slot.available) {
      return;
    }

    const isAlreadySelected = this.isSlotAlreadySelected(slot);

    if (isAlreadySelected) {
      // If slot is already selected, open modal to allow modification
      this.openSlotModal(slot).catch(error => {
        console.error('Error opening slot modal:', error);
      });
    } else {
      // Select the slot
      this.openSlotModal(slot).catch(error => {
        console.error('Error opening slot modal:', error);
      });
    }
  }

  // Deselect slot directly (for right-click or long-press)
  deselectSlotDirect(slot: TimeSlot): void {
    if (slot.slot_status === 'booked' || !slot.available) {
      return;
    }

    const isAlreadySelected = this.isSlotAlreadySelected(slot);

    if (isAlreadySelected) {
      // Deselect the slot
      this.deselectSlot(slot);
    }
  }

  public isSlotAlreadySelected(slot: TimeSlot): boolean {
    if (!slot.slot_date || !slot.tee_id) {
      return false;
    }

    const slotDateKey = this.getDateKey(new Date(slot.slot_date));
    const slotTeeId = slot.tee_id;

    return this.selectedSlots.some(selectedSlot => {
      const selectedSlotDateKey = this.getDateKey(selectedSlot.date);
      return selectedSlot.time === slot.time &&
             selectedSlotDateKey === slotDateKey &&
             selectedSlot.tee_id === slotTeeId;
    });
  }

  async openSlotModal(slot: TimeSlot): Promise<void> {
    // Check slot availability first to get the correct isOwnBooking status
    await this.checkSingleSlotAvailability(slot);
    
    const isAlreadySelected = this.isSlotAlreadySelected(slot);
    
    let requestedParticipants = 1;
    
    if (isAlreadySelected) {
      const selectedSlot = this.selectedSlots.find(s => 
        s.time === slot.time &&
        this.getDateKey(s.date) === this.getDateKey(new Date(slot.slot_date || '')) &&
        s.tee_id === slot.tee_id
      );
      if (selectedSlot) {
        requestedParticipants = selectedSlot.participants;
      }
    } else {
      const maxAllowed = Math.min(slot.available_spots || 4, 4);
      requestedParticipants = Math.min(1, maxAllowed);
    }
    
    // Ensure all required properties are set for the modal
    this.currentSlotForModal = {
      ...slot,
      formatted_time: slot.formatted_time || slot.time,
      slot_status: isAlreadySelected ? 'selected' : (slot.slot_status || (slot.available ? 'available' : 'booked')),
      available_spots: slot.available_spots || 4,
      total_participants: slot.total_participants || 0,
      slot_date: slot.slot_date || this.getDateKey(this.selectedDate),
      tee_id: slot.tee_id || this.selectedTee?.id,
      tee_name: slot.tee_name || this.selectedTee?.label,
      // Set isOwnBooking property for partially available slots
      isOwnBooking: (slot as any).isOwnBooking || false
    };
    
    this.currentSlotParticipants = requestedParticipants;
    this.showSlotModal = true;
  }

  closeSlotModal(): void {
    this.showSlotModal = false;
    this.currentSlotForModal = null;
    this.currentSlotParticipants = 1;
  }

  async checkSingleSlotAvailability(slot: TimeSlot): Promise<void> {
    // Check availability for partially available slots to get isOwnBooking status
    if (slot.slot_status === 'partially_available') {
      try {
        const teeId = slot.tee_id || this.selectedTee?.id;
        if (!teeId) {
          console.warn('No tee ID available for slot availability check');
          return;
        }
        
        const response = await this.collectionService.checkSlotAvailability(
          this.course.id,
          teeId,
          slot.slot_date || this.getDateKey(this.selectedDate),
          slot.time
        );
        
        if (response && response.data && response.data.code === 1) {
          const availabilityData = response.data.data;
          
          // Update slot information with availability details
          (slot as any).isOwnBooking = availabilityData.isOwnBooking;
          slot.available_spots = availabilityData.availableSpots;
          slot.total_participants = availabilityData.originalParticipants || slot.total_participants;
        }
      } catch (error) {
        console.error(`Error checking availability for slot ${slot.time}:`, error);
        // Keep existing values if availability check fails
      }
    }
  }

  incrementModalParticipants(): void {
    if (this.currentSlotForModal) {
      const maxAllowed = Math.min(this.currentSlotForModal.available_spots || 4, 4);
      if (this.currentSlotParticipants < maxAllowed) {
        this.currentSlotParticipants++;
      }
    }
  }

  decrementModalParticipants(): void {
    if (this.currentSlotParticipants > 1) {
      this.currentSlotParticipants--;
    }
  }

  confirmSlotSelection(): void {
    if (this.currentSlotForModal) {
      const slot = this.currentSlotForModal;
      
      // Check if this is an existing slot that needs to be updated
      const existingSlotIndex = this.selectedSlots.findIndex(s => 
        s.time === slot.time &&
        this.getDateKey(s.date) === this.getDateKey(new Date(slot.slot_date || '')) &&
        s.tee_id === slot.tee_id
      );
      
      if (existingSlotIndex !== -1) {
        // Update existing slot
        this.selectedSlots[existingSlotIndex].participants = this.currentSlotParticipants;
        // Update the slot type based on original status
        this.selectedSlots[existingSlotIndex].isJoinRequest = slot.slot_status === 'partially_available';
        this.selectedSlots[existingSlotIndex].originalStatus = slot.slot_status;
        this.selectedSlots[existingSlotIndex].currentParticipants = slot.total_participants || 0;
      } else {
        // Add new slot with enhanced information for partially available slots
        const newSlot: SlotSelection = {
          time: slot.time,
          participants: this.currentSlotParticipants,
          date: slot.slot_date ? new Date(slot.slot_date) : this.selectedDate,
          tee: this.selectedTee!,
          slot_date: slot.slot_date || this.getDateKey(this.selectedDate),
          tee_id: slot.tee_id || this.selectedTee!.id,
          tee_name: slot.tee_name || this.selectedTee!.label,
          // Enhanced properties for partially available slots
          isJoinRequest: slot.slot_status === 'partially_available',
          originalStatus: slot.slot_status,
          currentParticipants: slot.total_participants || 0,
          availableSpots: slot.available_spots || 4
        };
        
        this.selectedSlots.push(newSlot);
      }
      
      // Store the updated selections
      if (this.selectedDate && this.selectedTee) {
        this.storeSelections();
      }
      
      this.closeSlotModal();
      
      // Force immediate visual update of the slot display
      this.forceSlotDisplayUpdate();
    }
  }

  // Deselect slot from TimeSlot (used in time slot grid)
  deselectSlot(slot: TimeSlot): void {
    if (!slot.slot_date || !slot.tee_id) return;
    
    const slotDateKey = this.getDateKey(new Date(slot.slot_date));
    const slotTeeId = slot.tee_id;
    
    // Remove from selectedSlots
    this.selectedSlots = this.selectedSlots.filter(s => 
      !(s.time === slot.time &&
        this.getDateKey(s.date) === slotDateKey &&
        s.tee_id === slotTeeId)
    );
    
    // Update stored selections
    if (this.selectedDate && this.selectedTee) {
      this.storeSelections();
    }
    
    // Force immediate visual update
    this.forceSlotDisplayUpdate();
  }

  // Deselect slot from SlotSelection (used in booking summary)
  deselectSlotFromSummary(slot: SlotSelection): void {
    if (!slot.slot_date || !slot.tee_id) return;
    
    const slotDateKey = this.getDateKey(new Date(slot.slot_date));
    const slotTeeId = slot.tee_id;
    
    this.selectedSlots = this.selectedSlots.filter(s => 
      !(s.time === slot.time &&
        this.getDateKey(s.date) === slotDateKey &&
        s.tee_id === slotTeeId)
    );
    
    // Update stored selections
    if (this.selectedDate && this.selectedTee) {
      this.storeSelections();
    }
    
    // Force immediate visual update
    this.forceSlotDisplayUpdate();
  }

  // Helper methods
  private getDateKey(date: Date | string | any): string {
    // Handle null/undefined
    if (date == null) {
      return '';
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // For other string formats, create a Date object and use local date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    }
    
    // Handle Date objects - use local date to avoid timezone issues
    if (date instanceof Date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // Handle other types - try to convert to Date
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // If conversion fails, return a safe fallback
        return '';
      }
      // Use local date to avoid timezone issues
      return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error converting date in getDateKey:', error, 'Input:', date);
      return '';
    }
  }

  private formatDateForBackend(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Simple session storage for selections
  private storeSelections(): void {
    if (this.selectedSlots.length > 0) {
      sessionStorage.setItem('tee_booking_selections', JSON.stringify(this.selectedSlots));
    } else {
      sessionStorage.removeItem('tee_booking_selections');
    }
  }

  private loadStoredSelections(): void {
    const stored = sessionStorage.getItem('tee_booking_selections');
    if (stored) {
      try {
        const selections = JSON.parse(stored);
        this.selectedSlots = selections.map((selection: any) => ({
          ...selection,
          date: new Date(selection.date)
        }));
      } catch (error) {
        console.error('Error loading stored selections:', error);
        sessionStorage.removeItem('tee_booking_selections');
      }
    }
  }

  private clearAllStoredSelections(): void {
    sessionStorage.removeItem('tee_booking_selections');
  }

  private restoreSlotSelectionState(): void {
    if (!this.selectedDate || !this.selectedTee) return;

    // Reset all slots to unselected state
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.participantCount = undefined;
    });

    // Mark slots as selected based on selectedSlots array - ONLY for current date and tee
    this.selectedSlots.forEach(selectedSlot => {
      // Check if this selection matches the current date and tee
      const selectedSlotDate = this.getDateKey(selectedSlot.date);
      const currentDate = this.getDateKey(this.selectedDate);
      const selectedSlotTeeId = selectedSlot.tee_id;
      const currentTeeId = this.selectedTee?.id;

      if (selectedSlotDate === currentDate && selectedSlotTeeId === currentTeeId) {
        const currentSlot = this.currentTimeSlots.find(slot => 
          slot.time === selectedSlot.time
        );
        if (currentSlot) {
          currentSlot.isSelected = true;
          currentSlot.participantCount = selectedSlot.participants;
        }
      }
    });
  }

  // Force immediate visual update of slot display
  private forceSlotDisplayUpdate(): void {
    if (!this.selectedDate || !this.selectedTee) return;
    
    // Reset all slots to unselected state first
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.participantCount = undefined;
    });
    
    // Mark slots as selected based on selectedSlots array - ONLY for current date and tee
    this.selectedSlots.forEach(selectedSlot => {
      // Check if this selection matches the current date and tee
      const selectedSlotDate = this.getDateKey(selectedSlot.date);
      const currentDate = this.getDateKey(this.selectedDate);
      const selectedSlotTeeId = selectedSlot.tee_id;
      const currentTeeId = this.selectedTee?.id;

      if (selectedSlotDate === currentDate && selectedSlotTeeId === currentTeeId) {
        const currentSlot = this.currentTimeSlots.find(slot => 
          slot.time === selectedSlot.time
        );
        
        if (currentSlot) {
          currentSlot.isSelected = true;
          currentSlot.participantCount = selectedSlot.participants;
        }
      }
    });
    
    // Force change detection to update the UI
    this.cdr.detectChanges();
  }

  // Slot display methods
  getSlotClass(slot: TimeSlot): string {
    if (slot.slot_status === 'booked' || !slot.available) {
      return 'booked-slot';
    } else if (slot.isSelected) {
      return 'selected';
    } else if (slot.slot_status === 'partially_available') {
      return 'partial-slot-theme';
    } else {
      return 'available-slot';
    }
  }

  getSlotTooltip(slot: TimeSlot): string {
    if (slot.slot_status === 'booked' || !slot.available) {
      if (slot.bookings && slot.bookings.length > 0) {
        const bookingDetails = slot.bookings.map(booking => 
          `${booking.member_name} (${booking.participants} player${booking.participants > 1 ? 's' : ''}, ${booking.hole_number} holes)`
        ).join('\n');
        return `Booked:\n${bookingDetails}`;
      }
      return 'Booked';
    }
    
    if (slot.isSelected) {
      const selectedSlot = this.selectedSlots.find(s => 
        s.time === slot.time &&
        this.getDateKey(s.date) === this.getDateKey(new Date(slot.slot_date || '')) &&
        s.tee_id === slot.tee_id
      );
      
      if (selectedSlot && selectedSlot.isJoinRequest) {
        return `Selected for Join Request: ${slot.participantCount || 0} participant${(slot.participantCount || 0) > 1 ? 's' : ''}\nThis will create a pending join request\nRight-click to deselect`;
      }
      
      return `Selected: ${slot.participantCount || 0} participant${(slot.participantCount || 0) > 1 ? 's' : ''}\nRight-click to deselect`;
    }
    
    if (slot.slot_status === 'partially_available') {
      const availableSpots = slot.available_spots || 0;
      const currentParticipants = slot.total_participants || 0;
      return `Partially Available: ${availableSpots} spots left (${currentParticipants}/4 participants)\nClick to join this slot`;
    }
    
    return `Available: ${slot.available_spots || 4} spots`;
  }

  // Booking methods
  canBook(): boolean {
    return this.selectedSlots.length > 0 && this.isAuthenticated() && !this.isLoading;
  }

  async checkSlotAvailabilityForSelectedSlots(): Promise<void> {
    // Check availability for partially available slots to provide better user feedback
    const partiallyAvailableSlots = this.selectedSlots.filter(slot => slot.originalStatus === 'partially_available');
    
    for (const slot of partiallyAvailableSlots) {
      try {
        const response = await this.collectionService.checkSlotAvailability(
          this.course.id,
          slot.tee_id,
          typeof slot.date === 'string' ? slot.date : this.getDateKey(slot.date),
          slot.time
        );
        
        if (response && response.data && response.data.code === 1) {
          const availabilityData = response.data.data;
          
          // Update slot information with availability details
          slot.isOwnBooking = availabilityData.isOwnBooking;
          slot.canAddParticipants = availabilityData.canAddParticipants;
          slot.canJoinRequest = availabilityData.canJoinRequest;
          slot.userExistingRequest = availabilityData.userExistingRequest;
          slot.availableSpots = availabilityData.availableSpots;
          slot.originalBookingId = availabilityData.slotId;
          
          // Update tooltip text based on availability
          if (availabilityData.isOwnBooking) {
            slot.tooltipText = `Your booking: ${availabilityData.originalParticipants} participant(s). You can add up to ${availabilityData.availableSpots} more participant(s).`;
          } else if (availabilityData.userExistingRequest) {
            slot.tooltipText = `You already have a ${availabilityData.userExistingRequest.status} request for ${availabilityData.userExistingRequest.participants} participant(s).`;
          } else if (availabilityData.canJoinRequest) {
            slot.tooltipText = `Partially Available: ${availabilityData.availableSpots} spots left. Click to join this slot.`;
          } else {
            slot.tooltipText = `Slot is full. No more participants can be added.`;
          }
        }
      } catch (error) {
        console.error(`Error checking availability for slot ${slot.time}:`, error);
        // Keep existing tooltip if availability check fails
      }
    }
  }

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) {
      this.errorMessage = 'Please select at least one slot and ensure you are logged in';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Check slot availability for partially available slots before processing
      await this.checkSlotAvailabilityForSelectedSlots();
      
      // Separate slots by type: available vs partially available
      const availableSlots = this.selectedSlots.filter(slot => slot.originalStatus === 'available');
      const partiallyAvailableSlots = this.selectedSlots.filter(slot => slot.originalStatus === 'partially_available');
      
      const successfulBookings = [];
      const failedBookings = [];
      const joinRequests = [];
      
      // Process available slots (confirmed bookings)
      for (const slot of availableSlots) {
        try {
          const bookingData = {
            course: this.course.id,
            tee: slot.tee_id,
            slotDate: typeof slot.date === 'string' ? slot.date : this.getDateKey(slot.date),
            bookingTime: slot.time,
            participants: slot.participants
          };
          
          const response = await this.collectionService.createBooking(bookingData);
          
          if (response && response.data && response.data.code === 1) {
            successfulBookings.push({
              ...response,
              slotType: 'confirmed',
              slot: slot
            });
          } else {
            failedBookings.push({
              slot,
              error: response?.data?.message || 'Unknown error',
              slotType: 'confirmed'
            });
          }
        } catch (error) {
          console.error(`Error creating confirmed booking for slot ${slot.time}:`, error);
          failedBookings.push({
            slot,
            error: error instanceof Error ? error.message : 'Network error',
            slotType: 'confirmed'
          });
        }
      }
      
      // Process partially available slots (join requests or add participants)
      for (const slot of partiallyAvailableSlots) {
        try {
          if (slot.isOwnBooking && slot.canAddParticipants) {
            // User can add participants to their own slot
            if (!slot.originalBookingId) {
              failedBookings.push({
                slot,
                error: 'Original booking ID not found',
                slotType: 'add_participants'
              });
              continue;
            }
            
            const response = await this.collectionService.addParticipants(
              slot.originalBookingId,
              slot.participants
            );
            
            if (response && response.data && response.data.code === 1) {
              successfulBookings.push({
                ...response,
                slotType: 'add_participants',
                slot: slot
              });
            } else {
              failedBookings.push({
                slot,
                error: response?.data?.message || 'Failed to add participants',
                slotType: 'add_participants'
              });
            }
          } else if (slot.canJoinRequest) {
            // Create a join request for someone else's slot
            const joinRequestData = {
              course: this.course.id,
              tee: slot.tee_id,
              slotDate: typeof slot.date === 'string' ? slot.date : this.getDateKey(slot.date),
              bookingTime: slot.time,
              participants: slot.participants,
              originalSlotParticipants: slot.currentParticipants || 0
            };
            
            const response = await this.collectionService.createJoinRequest(joinRequestData);
            
            if (response && response.data && response.data.code === 1) {
              // Check if this is an existing request response
              if (response.data.data?.type === 'existing_request') {
                // Handle existing request as a special type of join request
                joinRequests.push({
                  ...response,
                  slotType: 'existing_request',
                  slot: slot,
                  existingRequestData: response.data.data
                });
              } else {
                // Normal join request
                joinRequests.push({
                  ...response,
                  slotType: 'join_request',
                  slot: slot
                });
              }
            } else {
              // Handle actual errors
              let errorMessage = response?.data?.message || 'Failed to create join request';
              
              failedBookings.push({
                slot,
                error: errorMessage,
                slotType: 'join_request'
              });
            }
          } else {
            // Slot is not available for this user
            failedBookings.push({
              slot,
              error: 'This slot is not available for your request',
              slotType: 'unavailable'
            });
          }
        } catch (error) {
          console.error(`Error processing slot ${slot.time}:`, error);
          failedBookings.push({
            slot,
            error: error instanceof Error ? error.message : 'Network error',
            slotType: 'error'
          });
        }
      }
      
      // Check if we have any successful operations
      const totalSuccessful = successfulBookings.length + joinRequests.length;
      
      if (totalSuccessful > 0) {
        // Prepare success message based on what was created
        let successMessage = '';
        const addParticipantsCount = successfulBookings.filter(b => b.slotType === 'add_participants').length;
        const confirmedBookingsCount = successfulBookings.filter(b => b.slotType === 'confirmed').length;
        
        if (confirmedBookingsCount > 0 && addParticipantsCount > 0 && joinRequests.length > 0) {
          successMessage = `Successfully created ${confirmedBookingsCount} confirmed booking(s), added participants to ${addParticipantsCount} existing booking(s), and created ${joinRequests.length} join request(s)!`;
        } else if (confirmedBookingsCount > 0 && addParticipantsCount > 0) {
          successMessage = `Successfully created ${confirmedBookingsCount} confirmed booking(s) and added participants to ${addParticipantsCount} existing booking(s)!`;
        } else if (confirmedBookingsCount > 0 && joinRequests.length > 0) {
          successMessage = `Successfully created ${confirmedBookingsCount} confirmed booking(s) and ${joinRequests.length} join request(s)!`;
        } else if (addParticipantsCount > 0 && joinRequests.length > 0) {
          successMessage = `Successfully added participants to ${addParticipantsCount} existing booking(s) and created ${joinRequests.length} join request(s)!`;
        } else if (confirmedBookingsCount > 0) {
          successMessage = `Successfully created ${confirmedBookingsCount} confirmed booking(s)!`;
        } else if (addParticipantsCount > 0) {
          successMessage = `Successfully added participants to ${addParticipantsCount} existing booking(s)!`;
        } else {
          successMessage = `Successfully created ${joinRequests.length} join request(s)!`;
        }
        
        this.successMessage = successMessage;
        
        // Extract individual booking IDs and details
        const individualBookingIds = successfulBookings.map(response => 
          response.data.data.bookingId || response.data.data.booking_id || response.data.data.id
        );
        
        // Create slot bookings array with proper status
        const slotBookings: Array<{
          id: number | string;
          booking_id: string;
          slot_date: string;
          booking_time: string;
          participants: number;
          status: string;
          created_at: string;
          formatted_created_date: string;
          tee: {
            holeNumber: number;
          };
          course: {
            courseName: string;
          };
          isJoinRequest?: boolean;
          isExistingRequest?: boolean;
          existingStatus?: string;
          originalSlotParticipants?: number;
        }> = [];
        
        // Add confirmed bookings and add participants
        successfulBookings.forEach((response) => {
          const slot = response.slot;
          const bookingData = response.data.data;
          
          if (response.slotType === 'add_participants') {
            // Handle add participants case
            slotBookings.push({
              id: bookingData.bookingId || bookingData.booking_id || bookingData.id,
              booking_id: bookingData.bookingId || bookingData.booking_id || bookingData.id,
              slot_date: slot.slot_date,
              booking_time: slot.time,
              participants: slot.participants,
              status: 'participants_added',
              created_at: new Date().toISOString(),
              formatted_created_date: this.formatDateForDisplayUK(new Date()),
              tee: {
                holeNumber: slot.tee.holeNumber
              },
              course: {
                courseName: this.course.name
              },
              isJoinRequest: false,
              originalSlotParticipants: slot.currentParticipants || 0
            });
          } else {
            // Handle confirmed booking case
            slotBookings.push({
              id: bookingData.id,
              booking_id: bookingData.bookingId || bookingData.booking_id || bookingData.id,
              slot_date: slot.slot_date,
              booking_time: slot.time,
              participants: slot.participants,
              status: 'confirmed',
              created_at: new Date().toISOString(),
              formatted_created_date: this.formatDateForDisplayUK(new Date()),
              tee: {
                holeNumber: slot.tee.holeNumber
              },
              course: {
                courseName: this.course.name
              }
            });
          }
        });
        
        // Add join requests (including existing requests)
        joinRequests.forEach((response, index) => {
          const slot = response.slot; // Use slot from response instead of index
          const requestData = response.data.data;
          
          // Handle existing requests differently
          if (response.slotType === 'existing_request') {
            slotBookings.push({
              id: requestData.existingRequestId,
              booking_id: requestData.existingRequestId,
              slot_date: requestData.slotDate || slot.slot_date,
              booking_time: requestData.bookingTime || slot.time,
              participants: requestData.existingParticipants || slot.participants,
              status: 'existing_request',
              created_at: new Date().toISOString(),
              formatted_created_date: this.formatDateForDisplayUK(new Date()),
              tee: {
                holeNumber: slot.tee.holeNumber
              },
              course: {
                courseName: requestData.courseName || this.course.name
              },
              isJoinRequest: true,
              isExistingRequest: true,
              existingStatus: requestData.existingStatus,
              originalSlotParticipants: slot.currentParticipants || 0
            });
          } else {
            // Handle new join requests
            slotBookings.push({
              id: requestData.requestId || requestData.id,
              booking_id: requestData.requestId || requestData.id,
              slot_date: slot.slot_date,
              booking_time: slot.time,
              participants: slot.participants,
              status: 'pending',
              created_at: new Date().toISOString(),
              formatted_created_date: this.formatDateForDisplayUK(new Date()),
              tee: {
                holeNumber: slot.tee.holeNumber
              },
              course: {
                courseName: this.course.name
              },
              isJoinRequest: true,
              originalSlotParticipants: slot.currentParticipants || 0
            });
          }
        });
        
        // Determine if this is a multi-slot booking
        const isMultiSlot = this.selectedSlots.length > 1;
        
        // Generate appropriate confirmation message
        const confirmationMessage = this.generateConfirmationMessage(
          successfulBookings.length,
          joinRequests.length,
          addParticipantsCount,
          isMultiSlot
        );
        
        this.bookingConfirmationData = {
          courseName: this.course.name,
          teeLabel: this.selectedTee?.label,
          date: this.selectedDate,
          totalSlots: totalSuccessful,
          selectedSlots: this.selectedSlots.map(slot => ({
            time: slot.time,
            participants: slot.participants,
            date: slot.slot_date,
            tee: slot.tee_name,
            tee_name: slot.tee_name,
            teeHoles: slot.tee.holeNumber,
            teeId: slot.tee_id,
            status: slot.isJoinRequest ? 'pending' : 'confirmed',
            isJoinRequest: slot.isJoinRequest,
            originalSlotParticipants: slot.currentParticipants || 0
          })),
          status: joinRequests.length > 0 ? 'Mixed' : 'Completed',
          // Individual slot booking details
          slotBookings: slotBookings,
          individualBookingIds: individualBookingIds,
          // Separate counts for display
          confirmedCount: successfulBookings.length,
          pendingCount: joinRequests.length,
          addParticipantsCount: addParticipantsCount,
          // New fields for enhanced confirmation
          confirmationType: confirmationMessage.type as any,
          confirmationTitle: confirmationMessage.title,
          confirmationSubtitle: confirmationMessage.subtitle,
          slotDetails: this.generateSlotDetails(this.selectedSlots, slotBookings)
        };
        
        this.showBookingModal = true;
      } else {
        // All operations failed
        this.errorMessage = 'All booking operations failed. Please try again.';
        console.error('Failed bookings:', failedBookings);
      }
    } catch (error) {
      console.error('Error creating bookings:', error);
      this.errorMessage = 'Failed to create bookings. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.bookingConfirmationData = null;
    
    // Set a flag to indicate booking was completed
    sessionStorage.setItem('booking_completed', 'true');
    
    // Clear all selected slots and session storage after successful booking
    this.clearAllSelections();
    this.clearAllStoredSelections();
    
    // Reset the component state
    this.resetBookingForm();
  }

  // Generate enhanced confirmation messages based on booking type
  generateConfirmationMessage(
    confirmedCount: number,
    pendingCount: number,
    addParticipantsCount: number,
    isMultiSlot: boolean = false
  ): { title: string; subtitle: string; type: string } {
    if (isMultiSlot) {
      // Multi-slot booking
      if (confirmedCount > 0 && pendingCount === 0 && addParticipantsCount === 0) {
        return {
          title: 'Your tee time has been booked successfully!',
          subtitle: `${confirmedCount} individual booking${confirmedCount > 1 ? 's' : ''} created`,
          type: 'multi_success'
        };
      } else if (pendingCount > 0 && confirmedCount === 0 && addParticipantsCount === 0) {
        return {
          title: 'Your tee time requests have been processed!',
          subtitle: `${pendingCount} request${pendingCount > 1 ? 's' : ''} processed`,
          type: 'multi_request'
        };
      } else if (addParticipantsCount > 0 && confirmedCount === 0 && pendingCount === 0) {
        return {
          title: 'Your participant add in the existing slot!',
          subtitle: `${addParticipantsCount} participant${addParticipantsCount > 1 ? 's' : ''} added`,
          type: 'multi_add'
        };
      } else {
        return {
          title: 'Your tee time has been partially processed!',
          subtitle: `${confirmedCount} confirmed, ${pendingCount} requested, ${addParticipantsCount} added`,
          type: 'multi_mixed'
        };
      }
    } else {
      // Single slot booking
      if (confirmedCount > 0 && pendingCount === 0 && addParticipantsCount === 0) {
        return {
          title: 'Your tee time has been booked successfully!',
          subtitle: `${confirmedCount} individual booking${confirmedCount > 1 ? 's' : ''} created`,
          type: 'single_available'
        };
      } else if (pendingCount > 0 && confirmedCount === 0 && addParticipantsCount === 0) {
        return {
          title: 'Your tee time request has been processed!',
          subtitle: `${pendingCount} request${pendingCount > 1 ? 's' : ''} processed`,
          type: 'single_partial_request'
        };
      } else if (addParticipantsCount > 0 && confirmedCount === 0 && pendingCount === 0) {
        return {
          title: 'Your participant add in the existing slot!',
          subtitle: `${addParticipantsCount} participant${addParticipantsCount > 1 ? 's' : ''} added`,
          type: 'single_partial_add'
        };
      } else {
        return {
          title: 'Your tee time has been processed!',
          subtitle: `${confirmedCount} confirmed, ${pendingCount} requested, ${addParticipantsCount} added`,
          type: 'single_mixed'
        };
      }
    }
  }

  // Generate slot details for confirmation display
  generateSlotDetails(
    selectedSlots: SlotSelection[],
    slotBookings: any[]
  ): Array<{
    bookingId: string;
    date: string;
    tee: string;
    time: string;
    status: string;
    statusText: string;
    participants: number;
    isJoinRequest: boolean;
    isAddParticipants: boolean;
    isExistingRequest?: boolean;
    existingStatus?: string;
  }> {
    return selectedSlots.map((slot, index) => {
      const booking = slotBookings[index];
      const isJoinRequest = slot.isJoinRequest || false;
      const isAddParticipants = slot.isOwnBooking || false;
      const isExistingRequest = booking?.isExistingRequest || false;
      
      // Determine status and status text
      let status: string;
      let statusText: string;
      
      if (isExistingRequest) {
        status = 'existing_request';
        statusText = `Already Requested (${booking.existingStatus})`;
      } else if (isJoinRequest) {
        status = 'pending';
        statusText = 'Pending';
      } else if (isAddParticipants) {
        status = 'completed';
        statusText = 'Completed';
      } else {
        status = 'confirmed';
        statusText = 'Completed';
      }
      
      return {
        bookingId: booking?.booking_id || 'N/A',
        date: slot.slot_date ? this.formatDateForDisplayUK(new Date(slot.slot_date)) : 'N/A',
        tee: `${slot.tee.holeNumber} Holes`,
        time: slot.time,
        status: status,
        statusText: statusText,
        participants: slot.participants,
        isJoinRequest,
        isAddParticipants,
        isExistingRequest,
        existingStatus: booking?.existingStatus
      };
    });
  }

  resetBookingForm(): void {
    this.selectedTee = null;
    this.selectedDate = new Date();
    this.currentTimeSlots = [];
    this.showCalendar = false;
    this.selectedSlots = [];
    
    // Clear modal properties
    this.showSlotModal = false;
    this.currentSlotForModal = null;
    this.currentSlotParticipants = 1;
    
    // Clear session storage
    this.clearAllStoredSelections();
    
    // Reload course data to ensure fresh state
    this.loadCourseData();
  }

  // Utility methods
  getSlotsGroupedByTee(): Array<{
    teeLabel: string;
    slots: SlotSelection[];
  }> {
    const teeGroups = new Map<string, SlotSelection[]>();
    
    this.selectedSlots.forEach(slot => {
      const teeLabel = slot.tee_name || 'Unknown Tee';
      
      if (!teeGroups.has(teeLabel)) {
        teeGroups.set(teeLabel, []);
      }
      teeGroups.get(teeLabel)!.push(slot);
    });
    
    return Array.from(teeGroups.entries())
      .map(([teeLabel, slots]) => ({
        teeLabel,
        slots: slots.sort((a, b) => {
          // Ensure dates are Date objects before calling getTime()
          const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
          const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
          const dateComparison = dateA.getTime() - dateB.getTime();
          if (dateComparison !== 0) return dateComparison;
          return a.time.localeCompare(b.time);
        })
      }))
      .sort((a, b) => a.teeLabel.localeCompare(b.teeLabel));
  }

  // Computed properties for template
  get totalParticipants(): number {
    return this.selectedSlots.reduce((sum, slot) => sum + slot.participants, 0);
  }

  get participantsText(): string {
    return this.totalParticipants === 1 ? 'participant' : 'participants';
  }

  clearAllSelections(): void {
    this.selectedSlots = [];
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.participantCount = undefined;
    });
    
    // Clear session storage
    this.clearAllStoredSelections();
    
    // Force immediate visual update
    this.forceSlotDisplayUpdate();
  }

  // Clear selections for specific date and tee
  clearSelectionsForDateAndTee(date: Date, teeId: number): void {
    // Remove slots for specific date and tee
    this.selectedSlots = this.selectedSlots.filter(slot => 
      !(this.getDateKey(slot.date) === this.getDateKey(date) && slot.tee_id === teeId)
    );
    
    // Store updated selections
    this.storeSelections();
    
    // Update visual state if this is the current date and tee
    if (this.selectedDate && this.selectedTee && 
        this.getDateKey(this.selectedDate) === this.getDateKey(date) && 
        this.selectedTee.id === teeId) {
      this.forceSlotDisplayUpdate();
    }
  }

  // Contact actions
  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Address copied to clipboard');
    });
  }

  makeCall(): void {
    window.open(`tel:${this.course.phone}`, '_self');
  }

  getDirections(): void {
    const address = this.course.address;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  }

  shareLocation(): void {
    const address = this.course.address;
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

  // Safe SVG rendering method
  getSafeSvgIcon(amenity: Amenity): SafeHtml | null {
    if (amenity.amenity_icon_svg && amenity.amenity_icon_svg.trim()) {
      return this.sanitizer.bypassSecurityTrustHtml(amenity.amenity_icon_svg);
    }
    return null;
  }

  // TrackBy function for performance
  trackByAmenity(index: number, amenity: Amenity): number {
    return amenity.id;
  }

  // Authentication helper
  isAuthenticated(): boolean { 
    return !!localStorage.getItem('access_token');
  }

  // Get max modal participants
  getMaxModalParticipants(): number {
    if (!this.currentSlotForModal) {
      return 1;
    }
    
    const maxParticipants = Math.min(this.currentSlotForModal.available_spots || 4, 4);
    return maxParticipants;
  }

  // Amenity icon helper
  getAmenityIcon(amenity: Amenity): any {
    const iconMap: { [key: string]: any } = {
      'WiFi': this.wifiIcon,
      'Free WiFi': this.wifiIcon,
      'Parking': this.parkingIcon,
      'Free Parking': this.parkingIcon,
      'Restaurant': this.restaurantIcon,
      'Pro Shop': this.shopIcon,
      'Golf Shop': this.shopIcon,
      'Clubhouse': this.restaurantIcon,
      'Driving Range': this.golfIcon,
      'Practice Green': this.golfIcon,
      'Golf Cart': this.golfIcon,
      'Golf Cart Rental': this.golfIcon,
      'Spa & Wellness': this.wifiIcon,
      'Conference Rooms': this.wifiIcon,
      'Locker Room': this.wifiIcon,
      'Shower': this.wifiIcon,
      'Bar': this.restaurantIcon,
      'Cafe': this.restaurantIcon
    };
    
    const exactMatch = iconMap[amenity.amenityName];
    if (exactMatch) {
      return exactMatch;
    }
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (amenity.amenityName.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    
    return this.wifiIcon;
  }

  private checkForPostBookingRefresh(): void {
    // Check if this is a page refresh after successful booking
    const wasBookingCompleted = sessionStorage.getItem('booking_completed');
    if (wasBookingCompleted === 'true') {
      // Clear the flag and all stored selections
      sessionStorage.removeItem('booking_completed');
      this.clearAllStoredSelections();
      this.selectedSlots = [];
    }
    
    // Check if this is a manual page refresh
    this.checkForManualPageRefresh();
  }

  private checkForManualPageRefresh(): void {
    // Check if this is a manual page refresh (not navigation)
    const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type;
    if (navigationType === 'reload') {
      // Clear all stored selections on manual refresh
      this.clearAllStoredSelections();
      this.selectedSlots = [];
      console.log('Manual page refresh detected, cleared all stored selections');
    }
  }

  // Add a method to detect if this is a fresh page load
  private isFreshPageLoad(): boolean {
    // Check if this is the first time the page is loaded in this session
    const hasVisited = sessionStorage.getItem('has_visited_tee_booking');
    if (!hasVisited) {
      sessionStorage.setItem('has_visited_tee_booking', 'true');
      return true;
    }
    return false;
  }

  // Add a method to handle fresh page loads
  private handleFreshPageLoad(): void {
    if (this.isFreshPageLoad()) {
      console.log('Fresh page load detected, clearing any stale data');
      // Clear any stale booking completion flags
      sessionStorage.removeItem('booking_completed');
      // Don't clear stored selections on fresh page load - let user continue where they left off
    }
  }

  // Add window beforeunload event listener to clear storage on page refresh
  private setupPageUnloadHandler(): void {
    this.pageUnloadHandler = () => {
      // Clear all stored selections when page is refreshed or closed
      this.clearAllStoredSelections();
    };
    window.addEventListener('beforeunload', this.pageUnloadHandler);
    
    // Also listen for page visibility change (when user switches tabs or minimizes)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Store current selections when page becomes hidden
        if (this.selectedDate && this.selectedTee) {
          this.storeSelections();
        }
      }
    });
  }

  // Add a method to handle page refresh detection
  private detectPageRefresh(): void {
    // Use the navigation timing API to detect page refresh
    if (performance.navigation.type === 1) {
      console.log('Page refresh detected, clearing all stored selections');
      this.clearAllStoredSelections();
      this.selectedSlots = [];
    }
  }

  // Add a method to handle page load events
  private setupPageLoadHandler(): void {
    // Listen for page load events
    window.addEventListener('load', () => {
      this.detectPageRefresh();
    });
    
    // Also check on DOM content loaded
    document.addEventListener('DOMContentLoaded', () => {
      this.detectPageRefresh();
    });
  }

  private setupNavigationHandlers(): void {
    // Handle navigation events to ensure proper session storage management
    this.router.events.pipe(
      takeUntil(this.destroy$)
    ).subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Store current selections before navigating away
        if (this.selectedDate && this.selectedTee) {
          this.storeSelections();
        }
      }
    });
  }



  // Add a method to get selections for a specific date and tee
  getSelectionsForDateAndTee(date: Date, teeId: number): SlotSelection[] {
    return this.selectedSlots.filter(slot => 
      this.getDateKey(slot.date) === this.getDateKey(date) && slot.tee_id === teeId
    );
  }

  // Add a method to check if a specific slot is selected for a date and tee
  isSlotSelectedForDateAndTee(slotTime: string, date: Date, teeId: number): boolean {
    return this.selectedSlots.some(slot => 
      slot.time === slotTime &&
      this.getDateKey(slot.date) === this.getDateKey(date) &&
      slot.tee_id === teeId
    );
  }

  // Add a method to get participant count for a specific slot on a specific date and tee
  getParticipantCountForSlot(slotTime: string, date: Date, teeId: number): number {
    const selectedSlot = this.selectedSlots.find(slot => 
      slot.time === slotTime &&
      this.getDateKey(slot.date) === this.getDateKey(date) &&
      slot.tee_id === teeId
    );
    return selectedSlot ? selectedSlot.participants : 0;
  }











  // Timezone utility methods
  /**
   * Convert a date to UK timezone (Europe/London)
   * This ensures consistency with the backend which uses UK time
   */
  private convertToUKTime(date: Date): Date {
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date passed to convertToUKTime:', date);
      return new Date();
    }

    try {
      // Get current UK timezone offset (handles GMT/BST automatically)
      const now = new Date();
      const ukOffset = this.getUKTimezoneOffset(now);
      
      // Create UK date by applying the offset
      const ukDate = new Date(date.getTime() + (ukOffset * 60000));
      
      console.log(`Timezone conversion: Local: ${date.toISOString()}, UK: ${ukDate.toISOString()}, Offset: ${ukOffset} minutes`);
      
      return ukDate;
    } catch (error) {
      console.error('Error in convertToUKTime:', error);
      return date; // Fallback to original date
    }
  }

  /**
   * Get UK timezone offset for a specific date
   * UK switches between GMT (UTC+0) and BST (UTC+1)
   */
  private getUKTimezoneOffset(date: Date): number {
    try {
      // Use Intl.DateTimeFormat to get timezone offset reliably
      const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const ukParts = ukFormatter.formatToParts(utcDate);
      const ukDate = new Date(
        parseInt(ukParts.find(p => p.type === 'year')?.value || '0'),
        parseInt(ukParts.find(p => p.type === 'month')?.value || '1') - 1,
        parseInt(ukParts.find(p => p.type === 'day')?.value || '1'),
        parseInt(ukParts.find(p => p.type === 'hour')?.value || '0'),
        parseInt(ukParts.find(p => p.type === 'minute')?.value || '0'),
        parseInt(ukParts.find(p => p.type === 'second')?.value || '0')
      );
      
      // Calculate offset in minutes
      const offset = (ukDate.getTime() - utcDate.getTime()) / 60000;
      
      console.log(`UK timezone offset for ${date.toISOString()}: ${offset} minutes`);
      
      return offset;
    } catch (error) {
      console.error('Error in getUKTimezoneOffset:', error);
      // Fallback: UK is typically UTC+0 (GMT) or UTC+1 (BST)
      // Check if it's summer time (BST) - roughly March to October
      const month = date.getMonth() + 1; // getMonth() returns 0-11
      const isBST = month >= 3 && month <= 10;
      return isBST ? 60 : 0; // 60 minutes for BST, 0 for GMT
    }
  }

  /**
   * Format date for backend API calls in UK timezone
   * This ensures the backend receives the correct date
   */
  private formatDateForBackendUK(date: Date): string {
    try {
      // Convert to UK timezone using proper date arithmetic
      const ukDate = this.convertToUKTime(date);
      const formattedDate = ukDate.toISOString().split('T')[0];
      
      console.log(`Date formatting: Original: ${date.toISOString()}, UK: ${ukDate.toISOString()}, Formatted: ${formattedDate}`);
      
      return formattedDate;
    } catch (error) {
      console.error('Error in formatDateForBackendUK:', error);
      // Fallback to original date formatting
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Format date for display in UK timezone with proper formatting
   * This ensures consistent display formatting
   */
  private formatDateForDisplayUK(date: Date): string {
    try {
      // Convert to UK timezone using proper date arithmetic
      const ukDate = this.convertToUKTime(date);
      
      // Format for display using UK locale
      const formattedDate = ukDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      
      console.log(`Display date formatting: Original: ${date.toISOString()}, UK: ${ukDate.toISOString()}, Formatted: ${formattedDate}`);
      
      return formattedDate;
    } catch (error) {
      console.error('Error in formatDateForDisplayUK:', error);
      // Fallback to original date formatting
      return date.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  }

  /**
   * Get date key in UK timezone for consistent comparison
   */
  private getDateKeyUK(date: Date | string | any): string {
    if (date == null) {
      return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return date;
      }
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      try {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          return '';
        }
      } catch (error) {
        console.error('Error converting date in getDateKeyUK:', error, 'Input:', date);
        return '';
      }
    }
    
    // Convert to UK time before getting the key
    try {
      const ukDate = this.convertToUKTime(dateObj);
      const dateKey = ukDate.toISOString().split('T')[0];
      
      console.log(`Date key generation: Original: ${dateObj.toISOString()}, UK: ${ukDate.toISOString()}, Key: ${dateKey}`);
      
      return dateKey;
    } catch (error) {
      console.error('Error in date key generation:', error);
      return dateObj.toISOString().split('T')[0];
    }
  }

  /**
   * Check if a date is today in UK timezone
   */
  private isTodayUK(date: Date): boolean {
    try {
      // Get both dates in UK timezone using our reliable conversion method
      const ukDate = this.convertToUKTime(date);
      const ukToday = this.convertToUKTime(new Date());
      
      const isToday = ukDate.toDateString() === ukToday.toDateString();
      
      console.log(`Today check: Date: ${date.toISOString()}, UK Date: ${ukDate.toISOString()}, UK Today: ${ukToday.toISOString()}, Is Today: ${isToday}`);
      
      return isToday;
    } catch (error) {
      console.error('Error in isTodayUK:', error);
      return false;
    }
  }

  /**
   * Get current date in UK timezone
   */
  private getCurrentDateUK(): Date {
    try {
      // Get current date in UK timezone using our reliable conversion method
      const ukDate = this.convertToUKTime(new Date());
      
      console.log(`Current date: Local: ${new Date().toISOString()}, UK: ${ukDate.toISOString()}`);
      
      return ukDate;
    } catch (error) {
      console.error('Error in getCurrentDateUK:', error);
      return new Date(); // Fallback to local date
    }
  }








}