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
  time: string;
  participants: number;
  date: Date | string;
  tee: Tee;
  slot_date: string;
  tee_id: number;
  tee_name: string;
  bookings?: BookingDetail[];
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
  }>;
  courseName?: string;
  teeLabel?: string;
  date?: Date;
  time?: string;
  participants?: number;
  status?: string;
  // Individual slot booking details
  slotBookings?: Array<{
    id: number;
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
  }>;
  individualBookingIds?: string[];
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
  currentSlotForModal: TimeSlot | null = null;
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
      // Initialize with current date (2025)
      const now = new Date();
      this.currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
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
    // Use current date directly for minimum date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (this.selectedDate < today) {
      this.selectedDate = new Date(today);
      console.log('Minimum date set to today:', this.selectedDate.toDateString());
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
      console.log('=== DATE SELECTION DEBUG ===');
      console.log('Original selected date:', date);
      console.log('Original date ISO string:', date.toISOString());
      console.log('Original date local string:', date.toLocaleDateString());
      
      // Store current selections before switching
      if (this.selectedDate && this.selectedTee) {
        this.storeSelections();
      }
      
      this.selectedDate = new Date(date);
      
      // Log timezone conversion details
      const ukDate = this.convertToUKTime(this.selectedDate);
      console.log('Selected date in UK timezone:', ukDate);
      console.log('UK date ISO string:', ukDate.toISOString());
      console.log('UK date local string:', ukDate.toLocaleDateString());
      console.log('=== END DATE SELECTION DEBUG ===');
      
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
    // Use current date directly for comparison
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === today.getTime();
  }

  isSelectedDateToday(): boolean {
    if (!this.selectedDate) return false;
    
    // Use the same reliable date comparison logic as filterTimeSlotsForDate
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    return selectedDate.getTime() === today.getTime();
  }

  isDayAvailable(date: Date): boolean {
    // Use current date directly for calendar availability
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Only allow next 7 days from today (including today)
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 6);
    
    const isAvailable = checkDate >= today && checkDate <= maxDate;
    
    console.log(`Date availability check: ${date.toDateString()} - Today: ${today.toDateString()}, Max: ${maxDate.toDateString()}, Available: ${isAvailable}`);
    
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
      console.log('=== LOADING TIME SLOTS DEBUG ===');
      console.log('Selected date object:', this.selectedDate);
      console.log('Selected date ISO string:', this.selectedDate.toISOString());
      console.log('Selected date local string:', this.selectedDate.toLocaleDateString());
      
      // Use the selected date directly without UK timezone conversion for backend
      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('Date string being sent to backend:', dateStr);
      
      // Don't convert to UK timezone - send the exact selected date
      console.log('Using selected date directly for backend:', dateStr);
      
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
          
          console.log(`Slot ${slot.time} mapped:`, {
            original_slot_date: slot.slot_date,
            mapped_slot_date: slotDate,
            formatted_slot_date: formattedSlotDate
          });
          
          return mappedSlot;
        });

        // Restore selection state for slots that were previously selected
        this.restoreSlotSelectionState();
        
        // Force update the display to ensure selections are visible
        setTimeout(() => {
          this.forceSlotDisplayUpdate();
        }, 50);
        
        console.log('=== END LOADING TIME SLOTS DEBUG ===');
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
    
    // Use current date directly for comparison
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    // Compare dates using time values (more reliable than toDateString)
    const isToday = selectedDate.getTime() === today.getTime();
    
    console.log(`Slot filtering: Selected date: ${this.selectedDate.toDateString()}, Today: ${today.toDateString()}, Is today: ${isToday}`);
    
    if (!isToday) {
      // For all future dates, show all slots (no filtering)
      console.log('Future date detected - showing all slots without time filtering');
      return slots;
    }
    
    // Only for today, filter out slots that have already passed
    console.log('Today detected - filtering slots after current time');
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const filteredSlots = slots.filter((slot: any) => {
      if (!slot || !slot.time) {
        return false;
      }
      
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      
      // Round up to next 8-minute slot
      const slotDuration = 8;
      const roundedCurrentTime = Math.ceil(currentTime / slotDuration) * slotDuration;
      
      const isAvailable = slotTimeInMinutes >= roundedCurrentTime;
      
      if (!isAvailable) {
        console.log(`Filtering out slot ${slot.time} (${slotTimeInMinutes} < ${roundedCurrentTime})`);
      }
      
      return isAvailable;
    });
    
    console.log(`Filtered ${slots.length} slots to ${filteredSlots.length} available slots for today`);
    
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
      this.openSlotModal(slot);
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
      this.openSlotModal(slot);
    } else {
      // Select the slot
      this.openSlotModal(slot);
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

    // Debug logging to identify the issue
    console.log(`=== SLOT SELECTION DEBUG ===`);
    console.log(`Checking if slot ${slot.time} is already selected:`);
    console.log(`  Slot date: ${slot.slot_date}`);
    console.log(`  Slot date key: ${slotDateKey}`);
    console.log(`  Slot tee ID: ${slotTeeId}`);
    console.log(`  Current selected date: ${this.selectedDate.toDateString()}`);
    console.log(`  Current date key: ${this.getDateKey(this.selectedDate)}`);

    const isSelected = this.selectedSlots.some(selectedSlot => {
      const selectedSlotDateKey = this.getDateKey(selectedSlot.date);
      const matches = selectedSlot.time === slot.time &&
                     selectedSlotDateKey === slotDateKey &&
                     selectedSlot.tee_id === slotTeeId;
      
      if (matches) {
        console.log(`  ✅ MATCH FOUND: Slot ${selectedSlot.time} on ${selectedSlotDateKey} with tee ${selectedSlot.tee_id}`);
      }
      
      return matches;
    });

    console.log(`  Result: ${isSelected ? 'SELECTED' : 'NOT SELECTED'}`);
    console.log(`=== END SLOT SELECTION DEBUG ===`);

    return isSelected;
  }

  openSlotModal(slot: TimeSlot): void {
    console.log('Opening slot modal with slot:', slot);
    
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
        tee_name: slot.tee_name || this.selectedTee?.label
      };
    
    console.log('Modal slot data prepared:', this.currentSlotForModal);
    
    this.currentSlotParticipants = requestedParticipants;
    this.showSlotModal = true;
  }

  closeSlotModal(): void {
    this.showSlotModal = false;
    this.currentSlotForModal = null;
    this.currentSlotParticipants = 1;
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
      
      console.log(`=== CONFIRM SLOT SELECTION DEBUG ===`);
      console.log(`Slot being confirmed: ${slot.time}`);
      console.log(`Slot date: ${slot.slot_date}`);
      console.log(`Current selected date: ${this.selectedDate.toDateString()}`);
      console.log(`Current selected tee ID: ${this.selectedTee?.id}`);
      
      // Check if this is an existing slot that needs to be updated
      const existingSlotIndex = this.selectedSlots.findIndex(s => 
        s.time === slot.time &&
        this.getDateKey(s.date) === this.getDateKey(new Date(slot.slot_date || '')) &&
        s.tee_id === slot.tee_id
      );
      
      if (existingSlotIndex !== -1) {
        // Update existing slot
        console.log(`Updating existing slot at index ${existingSlotIndex}`);
        this.selectedSlots[existingSlotIndex].participants = this.currentSlotParticipants;
      } else {
        // Add new slot
        const newSlot: SlotSelection = {
          time: slot.time,
          participants: this.currentSlotParticipants,
          date: slot.slot_date ? new Date(slot.slot_date) : this.selectedDate,
          tee: this.selectedTee!,
          slot_date: slot.slot_date || this.getDateKey(this.selectedDate),
          tee_id: slot.tee_id || this.selectedTee!.id,
          tee_name: slot.tee_name || this.selectedTee!.label
        };
        
        console.log(`Adding new slot:`, {
          time: newSlot.time,
          date: typeof newSlot.date === 'string' ? newSlot.date : (newSlot.date as Date).toDateString(),
          slot_date: newSlot.slot_date,
          tee_id: newSlot.tee_id
        });
        
        this.selectedSlots.push(newSlot);
      }
      
      console.log(`Total selected slots after update: ${this.selectedSlots.length}`);
      console.log(`=== END CONFIRM SLOT SELECTION DEBUG ===`);
      
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
        console.log('Loaded stored selections:', this.selectedSlots);
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
    
    console.log(`=== FORCE SLOT DISPLAY UPDATE DEBUG ===`);
          console.log(`Current selected date: ${this.selectedDate?.toDateString()}`);
      console.log(`Current selected tee ID: ${this.selectedTee?.id}`);
    console.log(`Total selected slots: ${this.selectedSlots.length}`);
    
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

      console.log(`Checking selected slot: ${selectedSlot.time} on ${selectedSlotDate} with tee ${selectedSlotTeeId}`);
      console.log(`  Current date: ${currentDate}, Current tee: ${currentTeeId}`);
      console.log(`  Date match: ${selectedSlotDate === currentDate}, Tee match: ${selectedSlotTeeId === currentTeeId}`);
      console.log(`  Selected slot date object: ${selectedSlot.date}`);
      console.log(`  Current selected date object: ${this.selectedDate}`);
      console.log(`  Selected slot date type: ${typeof selectedSlot.date}`);
      console.log(`  Current selected date type: ${typeof this.selectedDate}`);

      if (selectedSlotDate === currentDate && selectedSlotTeeId === currentTeeId) {
        const currentSlot = this.currentTimeSlots.find(slot => 
          slot.time === selectedSlot.time
        );
        
        if (currentSlot) {
          currentSlot.isSelected = true;
          currentSlot.participantCount = selectedSlot.participants;
          console.log(`  ✅ MARKED SLOT ${currentSlot.time} AS SELECTED with ${selectedSlot.participants} participants`);
        } else {
          console.log(`  ❌ SLOT ${selectedSlot.time} NOT FOUND in currentTimeSlots`);
        }
      } else {
        console.log(`  ❌ SLOT ${selectedSlot.time} DOES NOT MATCH current date/tee`);
      }
    });
    
    console.log(`=== END FORCE SLOT DISPLAY UPDATE DEBUG ===`);
    
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
      return `Selected: ${slot.participantCount || 0} participant${(slot.participantCount || 0) > 1 ? 's' : ''}\nRight-click to deselect`;
    }
    
    if (slot.slot_status === 'partially_available') {
      return `Partially Available: ${slot.available_spots || 0} spots left`;
    }
    
    return `Available: ${slot.available_spots || 4} spots`;
  }

  // Booking methods
  canBook(): boolean {
    return this.selectedSlots.length > 0 && this.isAuthenticated() && !this.isLoading;
  }

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) {
      this.errorMessage = 'Please select at least one slot and ensure you are logged in';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Create individual bookings sequentially to avoid race conditions
      const successfulBookings = [];
      const failedBookings = [];
      
      for (const slot of this.selectedSlots) {
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
            successfulBookings.push(response);
          } else {
            failedBookings.push({
              slot,
              error: response?.data?.message || 'Unknown error'
            });
          }
        } catch (error) {
          console.error(`Error creating booking for slot ${slot.time}:`, error);
          failedBookings.push({
            slot,
            error: error instanceof Error ? error.message : 'Network error'
          });
        }
      }
      
      if (successfulBookings.length === this.selectedSlots.length) {
        this.successMessage = `Successfully created ${successfulBookings.length} individual booking(s)!`;
        
        // Extract individual booking IDs and details
        const individualBookingIds = successfulBookings.map(response => 
          response.data.data.bookingId || response.data.data.booking_id || response.data.data.id
        );
        
        const slotBookings = successfulBookings.map((response, index) => {
          const slot = this.selectedSlots[index];
          const bookingData = response.data.data;
          return {
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
          };
        });
        
        this.bookingConfirmationData = {
          courseName: this.course.name,
          teeLabel: this.selectedTee?.label,
          date: this.selectedDate,
          totalSlots: successfulBookings.length,
          selectedSlots: this.selectedSlots.map(slot => ({
            time: slot.time,
            participants: slot.participants,
            date: slot.slot_date,
            tee: slot.tee_name,
            tee_name: slot.tee_name,
            teeHoles: slot.tee.holeNumber,
            teeId: slot.tee_id
          })),
          status: 'Completed',
          // Individual slot booking details
          slotBookings: slotBookings,
          individualBookingIds: individualBookingIds
        };
        
        this.showBookingModal = true;
      } else {
        // Some bookings failed
        const failedCount = failedBookings.length;
        const successCount = successfulBookings.length;
        
        if (successCount > 0) {
          // Partial success - show what succeeded and what failed
          this.errorMessage = `${successCount} out of ${this.selectedSlots.length} bookings succeeded. ${failedCount} failed.`;
          
          // Show details of failed bookings
          console.error('Failed bookings:', failedBookings);
        } else {
          // All bookings failed
          this.errorMessage = 'All bookings failed. Please try again.';
        }
      }
    } catch (error) {
      console.error('Error creating individual slot bookings:', error);
      this.errorMessage = 'Failed to create slot bookings. Please try again.';
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

  // Add a method to debug current session storage state
  debugSessionStorage(): void {
    console.log('=== Session Storage Debug ===');
    const key = 'tee_booking_selections';
    const value = sessionStorage.getItem(key);
    console.log(`${key}:`, value ? JSON.parse(value) : 'null');
    console.log('=== End Debug ===');
  }

  // Add a method to manually clear all selections (for testing)
  clearAllSelectionsManually(): void {
    console.log('Manually clearing all selections');
    this.selectedSlots = [];
    this.clearAllStoredSelections();
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
      slot.participantCount = undefined;
    });
    console.log('All selections cleared');
    
    // Force immediate visual update
    this.forceSlotDisplayUpdate();
  }

  // Add a method to debug current component state
  debugComponentState(): void {
    console.log('=== Component State Debug ===');
    console.log('Selected Tee:', this.selectedTee);
    console.log('Selected Date:', this.selectedDate);
    console.log('Current Time Slots:', this.currentTimeSlots);
    console.log('Selected Slots:', this.selectedSlots);
    console.log('=== End Component State Debug ===');
  }

  // Add a method to validate session storage consistency
  validateSessionStorage(): void {
    console.log('=== Session Storage Validation ===');
    
    // Check if all stored selections are consistent with component state
    const key = 'tee_booking_selections';
    const value = sessionStorage.getItem(key);
    if (value) {
      try {
        const storedSelections = JSON.parse(value);
        
        // Check if these selections exist in component state
        if (storedSelections.length !== this.selectedSlots.length) {
          console.warn(`Inconsistency found for key ${key}:`, {
            stored: storedSelections.length,
            component: this.selectedSlots.length
          });
        }
      } catch (error) {
        console.error(`Error parsing stored data for key ${key}:`, error);
      }
    }
    console.log('=== End Validation ===');
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

  // ===== DEBUG METHODS FOR SLOT SELECTION =====
  
  // Debug method to show the difference between date-specific selections and slot details
  debugSlotDataFlow(): void {
    console.log('=== SLOT DATA FLOW DEBUG ===');
    
    // 1. Show current component state
    console.log('1. Current Component State:');
    console.log('   - Selected Date:', this.selectedDate);
    console.log('   - Selected Tee:', this.selectedTee);
    console.log('   - Current Time Slots Count:', this.currentTimeSlots.length);
    console.log('   - Selected Slots Count:', this.selectedSlots.length);
    
    // 2. Show current time slots (slot details from API)
    console.log('2. Current Time Slots (Slot Details from API):');
    this.currentTimeSlots.forEach((slot, index) => {
      console.log(`   Slot ${index + 1}:`, {
        time: slot.time,
        available: slot.available,
        slot_status: slot.slot_status,
        available_spots: slot.available_spots,
        total_participants: slot.total_participants,
        slot_date: slot.slot_date,
        tee_id: slot.tee_id,
        tee_name: slot.tee_name,
        isSelected: slot.isSelected,
        participantCount: slot.participantCount
      });
    });
    
    // 3. Show selected slots (date-specific selections)
    console.log('3. Selected Slots (Date-specific Selections):');
    this.selectedSlots.forEach((slot, index) => {
      console.log(`   Selection ${index + 1}:`, {
        time: slot.time,
        participants: slot.participants,
        date: slot.date,
        slot_date: slot.slot_date,
        tee_id: slot.tee_id,
        tee_name: slot.tee_name
      });
    });
    
    // 4. Show session storage state
    console.log('4. Session Storage State:');
    this.debugSessionStorage();
    
    // 5. Show data flow analysis
    console.log('5. Data Flow Analysis:');
    this.analyzeDataFlow();
    
    console.log('=== END SLOT DATA FLOW DEBUG ===');
  }

  // Analyze the data flow between different storage mechanisms
  private analyzeDataFlow(): void {
    console.log('   Data Flow Analysis:');
    
    // Check if current time slots match selected slots
    const currentSlotTimes = this.currentTimeSlots.map(s => s.time);
    const selectedSlotTimes = this.selectedSlots.map(s => s.time);
    
    console.log('   - Current slot times:', currentSlotTimes);
    console.log('   - Selected slot times:', selectedSlotTimes);
    
    // Find mismatches
    const missingInCurrent = selectedSlotTimes.filter(time => !currentSlotTimes.includes(time));
    const missingInSelected = currentSlotTimes.filter(time => !selectedSlotTimes.includes(time));
    
    if (missingInCurrent.length > 0) {
      console.log('   - WARNING: Selected slots not in current time slots:', missingInCurrent);
    }
    
    if (missingInSelected.length > 0) {
      console.log('   - INFO: Current slots not selected:', missingInSelected);
    }
    
    // Check selection state consistency
    this.currentTimeSlots.forEach(slot => {
      const isSelected = this.isSlotSelectedForDateAndTee(slot.time, this.selectedDate!, this.selectedTee!.id);
      const participantCount = this.getParticipantCountForSlot(slot.time, this.selectedDate!, this.selectedTee!.id);
      
      if (slot.isSelected !== isSelected) {
        console.log(`   - INCONSISTENCY: Slot ${slot.time} - isSelected: ${slot.isSelected}, should be: ${isSelected}`);
      }
      
      if (slot.participantCount !== participantCount) {
        console.log(`   - INCONSISTENCY: Slot ${slot.time} - participantCount: ${slot.participantCount}, should be: ${participantCount}`);
      }
    });
  }

  // Debug method to show slot selection state for a specific date and tee
  debugSlotSelectionForDateAndTee(date: Date, teeId: number): void {
    console.log(`=== SLOT SELECTION DEBUG FOR DATE: ${this.getDateKeyUK(date)}, TEE: ${teeId} ===`);
    
    const selectionsForDateAndTee = this.getSelectionsForDateAndTee(date, teeId);
    
    console.log('1. Component State Selections:');
    console.log('   - Total selected slots:', this.selectedSlots.length);
    console.log('   - Selections for this date/tee:', selectionsForDateAndTee);
    
    console.log('2. Session Storage:');
    console.log('   - Using simplified storage key: tee_booking_selections');
    const sessionData = sessionStorage.getItem('tee_booking_selections');
    console.log('   - Data:', sessionData ? JSON.parse(sessionData) : 'null');
    
    console.log('3. Current Time Slots State:');
    this.currentTimeSlots.forEach(slot => {
      const isSelected = this.isSlotSelectedForDateAndTee(slot.time, date, teeId);
      const participantCount = this.getParticipantCountForSlot(slot.time, date, teeId);
      
      console.log(`   Slot ${slot.time}:`, {
        available: slot.available,
        slot_status: slot.slot_status,
        isSelected: slot.isSelected,
        participantCount: slot.participantCount,
        shouldBeSelected: isSelected,
        shouldHaveParticipants: participantCount
      });
    });
    
    console.log('=== END SLOT SELECTION DEBUG ===');
  }

  // Debug method to force refresh slot selection state
  debugRefreshSlotSelectionState(): void {
    console.log('=== FORCING SLOT SELECTION STATE REFRESH ===');
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected, cannot refresh');
      return;
    }
    
    console.log('Before refresh:');
    this.debugSlotSelectionForDateAndTee(this.selectedDate, this.selectedTee.id);
    
    // Force refresh
    this.restoreSlotSelectionState();
    this.forceSlotDisplayUpdate();
    
    console.log('After refresh:');
    this.debugSlotSelectionForDateAndTee(this.selectedDate, this.selectedTee.id);
    
    console.log('=== END FORCED REFRESH ===');
  }

  // Debug method to show all available data sources
  debugAllDataSources(): void {
    console.log('=== ALL DATA SOURCES DEBUG ===');
    
    console.log('1. Component Properties:');
    console.log('   - selectedSlots:', this.selectedSlots);
    console.log('   - currentTimeSlots:', this.currentTimeSlots);
    console.log('   - selectedDate:', this.selectedDate);
    console.log('   - selectedTee:', this.selectedTee);
    
    console.log('2. Session Storage Keys:');
    console.log('   - Using simplified storage key: tee_booking_selections');
    
    console.log('3. API Data (if available):');
    if (this.currentTimeSlots.length > 0) {
      console.log('   - Sample slot from API:', this.currentTimeSlots[0]);
    } else {
      console.log('   - No API data loaded');
    }
    
    console.log('4. Data Relationships:');
    console.log('   - Selections stored in: selectedSlots array + sessionStorage');
    console.log('   - Slot details stored in: currentTimeSlots array (from API)');
    console.log('   - Selection state stored in: slot.isSelected and slot.participantCount');
    
    console.log('5. Session Storage Details:');
    const key = 'tee_booking_selections';
    const value = sessionStorage.getItem(key);
    if (value) {
      try {
        const data = JSON.parse(value);
        console.log(`   - ${key}:`, data);
      } catch (error) {
        console.log(`   - ${key}: Error parsing data`);
      }
    }
    
    console.log('=== END ALL DATA SOURCES DEBUG ===');
  }

  // Debug method to show slot visual state
  debugSlotVisualState(): void {
    console.log('=== SLOT VISUAL STATE DEBUG ===');
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected');
      return;
    }
    
    console.log('Current Date:', this.getDateKeyUK(this.selectedDate));
    console.log('Current Tee ID:', this.selectedTee?.id);
    
    console.log('Current Time Slots Visual State:');
    this.currentTimeSlots.forEach((slot, index) => {
      const slotClass = this.getSlotClass(slot);
      const isAlreadySelected = this.isSlotAlreadySelected(slot);
      console.log(`Slot ${index + 1} (${slot.time}):`, {
        time: slot.time,
        isSelected: slot.isSelected,
        participantCount: slot.participantCount,
        slot_status: slot.slot_status,
        available: slot.available,
        slot_date: slot.slot_date,
        tee_id: slot.tee_id,
        appliedClass: slotClass,
        shouldBeSelected: isAlreadySelected,
        dateMatch: this.getDateKeyUK(slot.slot_date) === this.getDateKeyUK(this.selectedDate),
        teeMatch: slot.tee_id === this.selectedTee?.id
      });
    });
    
    console.log('Selected Slots from Component State:');
    const dateSelectedSlots = this.selectedSlots.filter(slot => 
      this.getDateKeyUK(slot.date) === this.getDateKeyUK(this.selectedDate) &&
      slot.tee_id === this.selectedTee?.id
    );
    
    dateSelectedSlots.forEach((slot, index) => {
      console.log(`Selected Slot ${index + 1}:`, {
        time: slot.time,
        participants: slot.participants,
        date: slot.date,
        slot_date: slot.slot_date,
        tee_id: slot.tee_id
      });
    });
    
    console.log('=== END VISUAL STATE DEBUG ===');
  }

  // Debug method to manually force slot update
  debugForceSlotUpdate(): void {
    console.log('=== MANUALLY FORCING SLOT UPDATE ===');
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected, cannot force update');
      return;
    }
    
    console.log('Before force update:');
    this.debugSlotVisualState();
    
    // Force the update
    this.forceSlotDisplayUpdate();
    
    console.log('After force update:');
    this.debugSlotVisualState();
    
    console.log('=== END FORCED UPDATE ===');
  }

  // Debug method to manually select a specific slot for testing
  debugSelectSpecificSlot(slotTime: string): void {
    console.log(`=== MANUALLY SELECTING SLOT: ${slotTime} ===`);
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected, cannot select slot');
      return;
    }
    
    // Find the slot in currentTimeSlots
    const slot = this.currentTimeSlots.find(s => s.time === slotTime);
    if (!slot) {
      console.log(`Slot ${slotTime} not found in currentTimeSlots`);
      return;
    }
    
    console.log('Found slot:', slot);
    
    // Manually set it as selected
    slot.isSelected = true;
    slot.participantCount = 2; // Default to 2 participants
    
    // Add to selectedSlots array
    const newSlot: SlotSelection = {
      time: slot.time,
      participants: 2,
      date: this.selectedDate,
      tee: this.selectedTee!,
      slot_date: this.formatDateForBackendUK(this.selectedDate),
      tee_id: this.selectedTee!.id,
      tee_name: this.selectedTee!.label
    };
    
    this.selectedSlots.push(newSlot);
    
    // Store in session storage
    this.storeSelections();
    
    // Force update the display
    this.forceSlotDisplayUpdate();
    
    console.log(`Slot ${slotTime} manually selected and added to selectedSlots`);
    console.log('Current selectedSlots:', this.selectedSlots);
    console.log('Slot isSelected state:', slot.isSelected);
    
    console.log('=== END MANUAL SELECTION ===');
  }

  // Debug method to check CSS classes and styling
  debugCSSClasses(): void {
    console.log('=== CSS CLASSES DEBUG ===');
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected');
      return;
    }
    
    console.log('Checking CSS classes for current slots:');
    this.currentTimeSlots.forEach((slot, index) => {
      const slotClass = this.getSlotClass(slot);
      const isSelected = slot.isSelected;
      const participantCount = slot.participantCount;
      
      console.log(`Slot ${index + 1} (${slot.time}):`, {
        time: slot.time,
        isSelected: isSelected,
        participantCount: participantCount,
        slot_status: slot.slot_status,
        available: slot.available,
        appliedClass: slotClass,
        shouldShowSelectedColor: isSelected && slotClass === 'selected'
      });
    });
    
    // Check if selected slots exist in selectedSlots array
    const dateSelectedSlots = this.selectedSlots.filter(slot => 
      this.getDateKeyUK(slot.date) === this.getDateKeyUK(this.selectedDate) &&
      slot.tee_id === this.selectedTee!.id
    );
    
    console.log('Selected slots from selectedSlots array:', dateSelectedSlots);
    
    // Check for any mismatches
    dateSelectedSlots.forEach(selectedSlot => {
      const currentSlot = this.currentTimeSlots.find(slot => slot.time === selectedSlot.time);
      if (currentSlot) {
        if (!currentSlot.isSelected) {
          console.log(`⚠️ MISMATCH: Slot ${selectedSlot.time} is in selectedSlots but not marked as selected in currentTimeSlots`);
        }
      } else {
        console.log(`⚠️ MISSING: Slot ${selectedSlot.time} is in selectedSlots but not found in currentTimeSlots`);
      }
    });
    
    // Check session storage state
    console.log('Session Storage State:');
    console.log('Using simplified storage key: tee_booking_selections');
    const sessionData = sessionStorage.getItem('tee_booking_selections');
    console.log('Session Data:', sessionData ? JSON.parse(sessionData) : 'null');
    
    console.log('=== END CSS CLASSES DEBUG ===');
  }

  // Debug method to create a test selection and verify the system works
  debugCreateTestSelection(): void {
    console.log('=== CREATING TEST SELECTION ===');
    
    if (!this.selectedDate || !this.selectedTee) {
      console.log('No date or tee selected, cannot create test selection');
      return;
    }
    
    if (this.currentTimeSlots.length === 0) {
      console.log('No time slots available, cannot create test selection');
      return;
    }
    
    // Create a test selection for the first available slot
    const testSlot = this.currentTimeSlots[0];
    console.log('Creating test selection for slot:', testSlot.time);
    
    // Add to selectedSlots array
    const newSlot: SlotSelection = {
      time: testSlot.time,
      participants: 2,
      date: this.selectedDate,
      tee: this.selectedTee!,
      slot_date: this.formatDateForBackendUK(this.selectedDate),
      tee_id: this.selectedTee!.id,
      tee_name: this.selectedTee!.label
    };
    
    this.selectedSlots.push(newSlot);
    
    // Store in session storage
    this.storeSelections();
    
    // Force update the display
    this.forceSlotDisplayUpdate();
    
    console.log('Test selection created successfully');
    console.log('Current selectedSlots:', this.selectedSlots);
    console.log('Session storage key: tee_booking_selections');
    
    console.log('=== END TEST SELECTION ===');
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

  // Debug method to show timezone information
  debugTimezoneInfo(): void {
    try {
      console.log('=== TIMEZONE DEBUG INFO ===');
      
      const now = new Date();
      console.log('Current local time:', now.toISOString());
      console.log('Current local timezone offset:', now.getTimezoneOffset(), 'minutes');
      
      // Test UK timezone conversion safely
      const ukDate = this.convertToUKTime(now);
      console.log('Current UK time:', ukDate.toISOString());
      
      if (this.selectedDate) {
        console.log('Selected date local:', this.selectedDate.toISOString());
        
        const ukSelected = this.convertToUKTime(this.selectedDate);
        console.log('Selected date UK:', ukSelected.toISOString());
        
        const dateKeyLocal = this.selectedDate.toISOString().split('T')[0];
        const dateKeyUK = this.getDateKeyUK(this.selectedDate);
        console.log('Date key comparison:');
        console.log('  Local:', dateKeyLocal);
        console.log('  UK:', dateKeyUK);
        console.log('  Match:', dateKeyLocal === dateKeyUK);
      }
      
      // Test specific date formatting
      const testDate = new Date('2025-08-26T06:00:00.000Z');
      const ukTestDate = this.convertToUKTime(testDate);
      const formattedTestDate = this.formatDateForBackendUK(testDate);
      console.log('Test date formatting:');
      console.log('  Original:', testDate.toISOString());
      console.log('  UK converted:', ukTestDate.toISOString());
      console.log('  Formatted for backend:', formattedTestDate);
      
      console.log('=== END TIMEZONE DEBUG INFO ===');
    } catch (error) {
      console.error('Error in debugTimezoneInfo:', error);
    }
  }

  // Debug method to test calendar date logic
  debugCalendarDates(): void {
    try {
      console.log('=== CALENDAR DATES DEBUG ===');
      
      const now = new Date();
      console.log('Current time analysis:');
      console.log('  Local now:', now.toISOString());
      console.log('  Current date (calendar):', this.currentDate.toDateString());
      console.log('  Selected date:', this.selectedDate.toDateString());
      
      // Test calendar generation
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      console.log('  Calendar month/year:', month + 1, year);
      
      // Test first day of month
      const firstDay = new Date(year, month, 1);
      console.log('  First day of month:', firstDay.toDateString());
      
      // Test last day of month
      const lastDay = new Date(year, month + 1, 0);
      console.log('  Last day of month:', lastDay.toDateString());
      
      // Test date availability
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const maxDate = new Date(today);
      maxDate.setDate(today.getDate() + 6);
      console.log('  Available date range:', today.toDateString(), 'to', maxDate.toDateString());
      
      console.log('=== END CALENDAR DATES DEBUG ===');
    } catch (error) {
      console.error('Error in debugCalendarDates:', error);
    }
  }

  // Debug method to test date handling and slot loading
  debugDateHandling(): void {
    try {
      console.log('=== DATE HANDLING DEBUG ===');
      
      const now = new Date();
      console.log('Current time analysis:');
      console.log('  Local now:', now.toISOString());
      console.log('  Current date (calendar):', this.currentDate?.toDateString());
      console.log('  Selected date:', this.selectedDate?.toDateString());
      
      // Test date string generation
      const year = this.selectedDate?.getFullYear();
      const month = String((this.selectedDate?.getMonth() || 0) + 1).padStart(2, '0');
      const day = String(this.selectedDate?.getDate() || 0).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('Date string generation:');
      console.log('  Year:', year);
      console.log('  Month:', month);
      console.log('  Day:', day);
      console.log('  Generated date string:', dateStr);
      
      // Test slot filtering logic
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      today.setHours(0, 0, 0, 0);
      
      const selectedDate = new Date(this.selectedDate || new Date());
      selectedDate.setHours(0, 0, 0, 0);
      
      const isToday = selectedDate.getTime() === today.getTime();
      
      console.log('Slot filtering logic:');
      console.log('  Today (start of day):', today.toISOString());
      console.log('  Selected date (start of day):', selectedDate.toISOString());
      console.log('  Is today:', isToday);
      console.log('  Expected behavior:', isToday ? 'Filter slots after current time' : 'Show all slots');
      
      console.log('=== END DATE HANDLING DEBUG ===');
    } catch (error) {
      console.error('Error in debugDateHandling:', error);
    }
  }

  // Debug method to test date key generation
  debugDateKeyGeneration(): void {
    try {
      console.log('=== DATE KEY GENERATION DEBUG ===');
      
      if (!this.selectedDate) {
        console.log('No date selected');
        return;
      }
      
      console.log('Selected date analysis:');
      console.log('  Original date object:', this.selectedDate);
      console.log('  Date type:', typeof this.selectedDate);
      console.log('  Date string:', this.selectedDate.toString());
      console.log('  Date ISO string:', this.selectedDate.toISOString());
      console.log('  Date local string:', this.selectedDate.toLocaleDateString());
      console.log('  Date UTC string:', this.selectedDate.toUTCString());
      
      // Test getDateKey method
      const dateKey = this.getDateKey(this.selectedDate);
      console.log('  Generated date key:', dateKey);
      
      // Test with different date formats
      const testDate = new Date(2025, 7, 25); // Aug 25, 2025
      console.log('Test date analysis:');
      console.log('  Test date object:', testDate);
      console.log('  Test date key:', this.getDateKey(testDate));
      
      console.log('=== END DATE KEY GENERATION DEBUG ===');
    } catch (error) {
      console.error('Error in debugDateKeyGeneration:', error);
    }
  }

  // Debug method to test slot selection across dates
  debugSlotSelectionAcrossDates(): void {
    try {
      console.log('=== SLOT SELECTION ACROSS DATES DEBUG ===');
      
      if (!this.selectedDate || !this.selectedTee) {
        console.log('No date or tee selected');
        return;
      }
      
      console.log(`Current selected date: ${this.selectedDate?.toDateString()}`);
      console.log(`Current selected tee ID: ${this.selectedTee?.id}`);
      
      console.log('All selected slots:');
      this.selectedSlots.forEach((slot, index) => {
        const slotDate = typeof slot.date === 'string' ? slot.date : slot.date.toDateString();
        const slotDateKey = this.getDateKey(slot.date);
        const currentDateKey = this.getDateKey(this.selectedDate);
        
        console.log(`  Slot ${index + 1}: ${slot.time} on ${slotDate} (key: ${slotDateKey})`);
        console.log(`    Current date key: ${currentDateKey}`);
        console.log(`    Date match: ${slotDateKey === currentDateKey}`);
        console.log(`    Tee match: ${slot.tee_id === this.selectedTee?.id}`);
        console.log(`    Should be visible: ${slotDateKey === currentDateKey && slot.tee_id === this.selectedTee?.id}`);
      });
      
      console.log('Current time slots:');
      this.currentTimeSlots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}: ${slot.time} - isSelected: ${slot.isSelected}, participantCount: ${slot.participantCount}`);
      });
      
      console.log('=== END SLOT SELECTION ACROSS DATES DEBUG ===');
    } catch (error) {
      console.error('Error in debugSlotSelectionAcrossDates:', error);
    }
  }
}