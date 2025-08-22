import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute, Router } from '@angular/router';
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
  slot_status?: 'available' | 'partially_available' | 'booked';
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
  bookingId?: string;
  singleBookingId?: string;
  totalSlots?: number;
  totalParticipants?: number;
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

  constructor(
    private collectionService: CollectionService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadCourseData();
      this.generateCalendar();
      this.setMinimumDate();
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
    
    // Store current tee's selected slots before switching
    if (this.selectedTee && this.selectedDate) {
      this.storeCurrentTeeSelections();
    }
    
    this.selectedTee = tee;
    
    // Restore previously selected slots for this tee and date
    this.restoreTeeSelections(tee);
    
    // Load time slots if date is already selected
    if (this.selectedDate) {
      this.loadAvailableTimeSlots();
    }
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
      // Store current date's selected slots before switching
      if (this.selectedDate && this.selectedTee) {
        this.storeCurrentDateSelections();
      }
      
      this.selectedDate = new Date(date);
      this.showCalendar = false;
      
      // Restore previously selected slots for this date and tee
      if (this.selectedTee) {
        this.restoreDateSelections(date);
      }
      
      // Load time slots if tee is already selected
      if (this.selectedTee) {
        this.loadAvailableTimeSlots();
      }
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

  isSelectedDateToday(): boolean {
    return this.selectedDate && this.isToday(this.selectedDate);
  }

  isDayAvailable(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    // Only allow next 7 days from today (including today)
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 6);
    
    return date >= today && date <= maxDate;
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
      const year = this.selectedDate.getFullYear();
      const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(this.selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const response = await this.collectionService.getAvailableSlotsWithParticipants(
        this.course.id,
        dateStr,
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
          const slotDate = slot.slot_date || this.formatDateForBackend(this.selectedDate);
          const formattedSlotDate = slot.formatted_slot_date || this.selectedDate.toLocaleDateString('en-US', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          });
          
          return {
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
        });

        // Restore selection state for slots that were previously selected
        this.restoreSlotSelectionState();
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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
    
    if (!isToday) {
      // For all future dates, show all slots
      return slots;
    }
    
    // Only for today, filter out slots that have already passed
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    return slots.filter((slot: any) => {
      if (!slot || !slot.time) {
        return false;
      }
      
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      
      // Round up to next 8-minute slot
      const slotDuration = 8;
      const roundedCurrentTime = Math.ceil(currentTime / slotDuration) * slotDuration;
      
      return slotTimeInMinutes >= roundedCurrentTime;
    });
  }

  // Slot selection methods
  selectSlot(slot: TimeSlot): void {
    if (slot.slot_status === 'booked' || !slot.available) {
      return;
    }

    // Check if slot is already selected
    const isAlreadySelected = this.isSlotAlreadySelected(slot);

    if (isAlreadySelected) {
      // If slot is already selected, open modal to allow modification
      this.openSlotModal(slot);
      return;
    }

    // Open modal for available and partially_available slots
    if (slot.slot_status === 'available' || slot.slot_status === 'partially_available') {
      this.openSlotModal(slot);
      return;
    }
  }

  private isSlotAlreadySelected(slot: TimeSlot): boolean {
    if (!slot.slot_date || !slot.tee_id) {
      return false;
    }

    const slotDateKey = this.getDateKey(new Date(slot.slot_date));
    const slotTeeId = slot.tee_id;

    return this.selectedSlots.some(selectedSlot => 
      selectedSlot.time === slot.time &&
      this.getDateKey(selectedSlot.date) === slotDateKey &&
      selectedSlot.tee_id === slotTeeId
    );
  }

  openSlotModal(slot: TimeSlot): void {
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
    
    this.currentSlotForModal = slot;
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
      
      // Check if this is an existing slot that needs to be updated
      const existingSlotIndex = this.selectedSlots.findIndex(s => 
        s.time === slot.time &&
        this.getDateKey(s.date) === this.getDateKey(new Date(slot.slot_date || '')) &&
        s.tee_id === slot.tee_id
      );
      
      if (existingSlotIndex !== -1) {
        // Update existing slot
        this.selectedSlots[existingSlotIndex].participants = this.currentSlotParticipants;
      } else {
        // Add new slot
        const newSlot: SlotSelection = {
          time: slot.time,
          participants: this.currentSlotParticipants,
          date: new Date(slot.slot_date || this.selectedDate.toISOString()),
          tee: this.selectedTee!,
          slot_date: slot.slot_date || this.formatDateForBackend(this.selectedDate),
          tee_id: slot.tee_id || this.selectedTee!.id,
          tee_name: slot.tee_name || this.selectedTee!.label
        };
        
        this.selectedSlots.push(newSlot);
      }
      
      this.closeSlotModal();
      this.updateSlotDisplay();
    }
  }

  deselectSlot(slot: TimeSlot): void {
    if (!slot.slot_date || !slot.tee_id) return;
    
    const slotDateKey = this.getDateKey(new Date(slot.slot_date));
    const slotTeeId = slot.tee_id;
    
    this.selectedSlots = this.selectedSlots.filter(s => 
      !(s.time === slot.time &&
        this.getDateKey(s.date) === slotDateKey &&
        s.tee_id === slotTeeId)
    );
    
    this.updateSlotDisplay();
  }

  // Helper methods
  private getDateKey(date: Date | string | any): string {
    // Handle null/undefined
    if (date == null) {
      return '';
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      // If it's a string, try to parse it as a date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // If parsing fails, return the original string
        return date;
      }
      return dateObj.toISOString().split('T')[0];
    }
    
    // Handle Date objects
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    // Handle other types - try to convert to Date
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        // If conversion fails, return a safe fallback
        return '';
      }
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error converting date in getDateKey:', error, 'Input:', date);
      return '';
    }
  }

  private formatDateForBackend(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private storeCurrentTeeSelections(): void {
    if (!this.selectedTee || !this.selectedDate) return;
    
    const currentSelections = this.selectedSlots.filter(s => 
      this.getDateKey(s.date) === this.getDateKey(this.selectedDate) &&
      s.tee_id === this.selectedTee!.id
    );
    
    // Store in session storage
    const key = `tee_selections_${this.getDateKey(this.selectedDate)}_${this.selectedTee!.id}`;
    sessionStorage.setItem(key, JSON.stringify(currentSelections));
  }

  private storeCurrentDateSelections(): void {
    if (!this.selectedTee || !this.selectedDate) return;
    
    const currentSelections = this.selectedSlots.filter(s => 
      this.getDateKey(s.date) === this.getDateKey(this.selectedDate) &&
      s.tee_id === this.selectedTee!.id
    );
    
    // Store in session storage
    const key = `date_selections_${this.getDateKey(this.selectedDate)}_${this.selectedTee!.id}`;
    sessionStorage.setItem(key, JSON.stringify(currentSelections));
  }

  private restoreTeeSelections(tee: Tee): void {
    if (!this.selectedDate) return;
    
    const key = `tee_selections_${this.getDateKey(this.selectedDate)}_${tee.id}`;
    const stored = sessionStorage.getItem(key);
    
    if (stored) {
      try {
        const selections = JSON.parse(stored);
        // Convert date strings back to Date objects
        const restoredSelections = selections.map((selection: any) => ({
          ...selection,
          date: new Date(selection.date)
        }));
        
        // Remove existing selections for this date and tee
        this.selectedSlots = this.selectedSlots.filter(s => 
          !(this.getDateKey(s.date) === this.getDateKey(this.selectedDate) && s.tee_id === tee.id)
        );
        // Add restored selections
        this.selectedSlots.push(...restoredSelections);
      } catch (error) {
        console.error('Error restoring tee selections:', error);
      }
    }
  }

  private restoreDateSelections(date: Date): void {
    if (!this.selectedTee) return;
    
    const key = `date_selections_${this.getDateKey(date)}_${this.selectedTee.id}`;
    const stored = sessionStorage.getItem(key);
    
    if (stored) {
      try {
        const selections = JSON.parse(stored);
        // Convert date strings back to Date objects
        const restoredSelections = selections.map((selection: any) => ({
          ...selection,
          date: new Date(selection.date)
        }));
        
        // Remove existing selections for this date and tee
        this.selectedSlots = this.selectedSlots.filter(s => 
          !(this.getDateKey(s.date) === this.getDateKey(date) && s.tee_id === this.selectedTee!.id)
        );
        // Add restored selections
        this.selectedSlots.push(...restoredSelections);
      } catch (error) {
        console.error('Error restoring date selections:', error);
      }
    }
  }

  private restoreSlotSelectionState(): void {
    if (!this.selectedDate || !this.selectedTee) return;

    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
      slot.participantCount = undefined;
    });

    const dateSelectedSlots = this.selectedSlots.filter(slot => 
      this.getDateKey(slot.date) === this.getDateKey(this.selectedDate) &&
      slot.tee_id === this.selectedTee!.id
    );

    dateSelectedSlots.forEach(selectedSlot => {
      const currentSlot = this.currentTimeSlots.find(slot => slot.time === selectedSlot.time);
      if (currentSlot) {
        currentSlot.isSelected = true;
        currentSlot.participantCount = selectedSlot.participants;
      }
    });
  }

  private updateSlotDisplay(): void {
    // Update the display to reflect current selections
    this.restoreSlotSelectionState();
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
    if (slot.bookings && slot.bookings.length > 0) {
      const bookingDetails = slot.bookings.map(booking => 
        `${booking.member_name} (${booking.participants} player${booking.participants > 1 ? 's' : ''}, ${booking.hole_number} holes)`
      ).join('\n');
      return `Booked:\n${bookingDetails}`;
    }
    return 'Available';
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
      // Prepare slots data for multi-slot booking
      const slotsData = this.selectedSlots.map(slot => ({
        course: this.course.id,
        tee: slot.tee_id,
        slotDate: slot.slot_date,
        bookingTime: slot.time,
        participants: slot.participants
      }));

      // Use the multi-slot booking API
      const response = await this.collectionService.createMultiSlotBooking({ slots: slotsData });

      if (response && response.data && response.data.code === 1) {
        this.successMessage = `Successfully created ${response.data.data.totalBookings} booking(s)!`;
        
        this.bookingConfirmationData = {
          bookingId: response.data.data.singleBookingId,
          courseName: this.course.name,
          teeLabel: this.selectedTee?.label,
          date: this.selectedDate,
          totalSlots: response.data.data.totalSlots,
          totalParticipants: response.data.data.totalParticipants,
          selectedSlots: this.selectedSlots.map(slot => ({
            time: slot.time,
            participants: slot.participants,
            date: slot.slot_date,
            tee: slot.tee_name,
            tee_name: slot.tee_name,
            teeHoles: slot.tee.holeNumber,
            teeId: slot.tee_id
          })),
          status: 'Completed'
        };
        this.showBookingModal = true;
      } else {
        this.errorMessage = response?.data?.message || 'Failed to create multi-slot bookings';
      }
    } catch (error) {
      console.error('Error creating multi-slot bookings:', error);
      this.errorMessage = 'Failed to create multi-slot bookings. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.bookingConfirmationData = null;
    
    // Force a complete page reload to ensure all data is fresh
    setTimeout(() => {
      window.location.reload();
    }, 500);
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

  getTotalParticipants(): number {
    return this.selectedSlots.reduce((sum, slot) => sum + slot.participants, 0);
  }

  clearAllSelections(): void {
    this.selectedSlots = [];
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
    });
    
    // Clear session storage
    if (this.selectedDate && this.selectedTee) {
      const key = `tee_selections_${this.getDateKey(this.selectedDate)}_${this.selectedTee.id}`;
      sessionStorage.removeItem(key);
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
}