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
  amenityTooltip: string; // Short description/tooltip
  amenitiesDescription?: string; // Detailed description from backend
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
  participantCount?: number; // Individual participant count for this slot
  booking_date?: Date; // Date when this slot is booked
  tee_label?: string; // Tee label for this slot
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

interface SlotSummary {
  date: Date;
  tee: Tee | null;
  selectedSlots: TimeSlot[];
  totalParticipants: number;
  status: 'available' | 'partial' | 'booked';
}

// New interface for date-based slot selections
interface DateSlotSelection {
  date: Date;
  tee: Tee;
  selectedSlots: TimeSlot[];
  totalParticipants: number;
}

interface SlotModalData {
  slot: TimeSlot;
  availableSpots: number;
  totalParticipants: number;
  requestedParticipants: number;
}

interface BookingConfirmationData {
  bookingId?: string;
  groupId?: string;
  totalBookings?: number;
  selectedSlots?: Array<{
    time: string;
    participants: number;
    date?: Date;
    tee?: string;
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
  
  // Calendar state
  showCalendar: boolean = false;
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // UI state
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Add booking confirmation modal properties
  showBookingModal: boolean = false;
  bookingConfirmationData: BookingConfirmationData | null = null;

  // Enhanced slot functionality
  selectedSlots: TimeSlot[] = [];
  // New property for date-based slot selections
  dateSlotSelections: Map<string, DateSlotSelection> = new Map();
  showSlotModal: boolean = false;
  slotModalData: SlotModalData | null = null;
  slotSummary: SlotSummary | null = null;
  maxSelectedSlots: number = 999; // No limitation for multi select

  private destroy$ = new Subject<void>();

  constructor(
    private collectionService: CollectionService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Add a small delay to ensure proper initialization and avoid hydration issues
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
      // Reload time slots when participant count changes
      if (this.selectedTee && this.selectedDate) {
        this.loadAvailableTimeSlots();
      }
    }
  }

  decrementParticipants(): void {
    if (this.participantCount > 1) {
      this.participantCount--;
      // Reload time slots when participant count changes
      if (this.selectedTee && this.selectedDate) {
        this.loadAvailableTimeSlots();
      }
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
      const currentDateKey = this.getDateKey(this.selectedDate);
      const currentSlots = this.selectedSlots.filter(slot => 
        slot.booking_date && this.getDateKey(slot.booking_date) === currentDateKey
      );
      
      if (currentSlots.length > 0) {
        console.log(`Storing ${currentSlots.length} slots for current tee (${this.selectedTee.label}) and date (${currentDateKey})`);
        this.setDateSlotSelection(this.selectedDate, this.selectedTee, currentSlots);
      }
    }
    
    this.selectedTee = tee;
    this.selectedTime = '';
    
          // Load previously selected slots for this tee and date if they exist
      if (this.selectedDate) {
        const dateKey = this.getDateKey(this.selectedDate);
        
        // Create a unique key for date + tee combination
        const dateTeeKey = `${dateKey}_tee_${tee.id}`;
        
        // Look for existing selections for this specific date and tee combination
        let existingSelection: DateSlotSelection | undefined;
        for (const [key, selection] of this.dateSlotSelections.entries()) {
          if (this.getDateKey(selection.date) === dateKey && selection.tee.id === tee.id) {
            existingSelection = selection;
            break;
          }
        }
        
        if (existingSelection) {
          console.log(`Restoring ${existingSelection.selectedSlots.length} previously selected slots for tee ${tee.label} on date ${dateKey}`);
          
          // Remove any existing slots for this date (regardless of tee) from selectedSlots
          this.selectedSlots = this.selectedSlots.filter(slot => 
            !slot.booking_date || this.getDateKey(slot.booking_date) !== dateKey
          );
          
          // Add back all slots for this date from all tees except the current one
          for (const [key, selection] of this.dateSlotSelections.entries()) {
            if (this.getDateKey(selection.date) === dateKey && selection.tee.id !== tee.id) {
              this.selectedSlots.push(...selection.selectedSlots);
            }
          }
          
          // Add the slots for the current tee
          this.selectedSlots.push(...existingSelection.selectedSlots);
          
          // Update selection states for current time slots - only show as selected if they belong to current tee
          this.currentTimeSlots.forEach(slot => {
            const isSelected = existingSelection!.selectedSlots.some(selectedSlot => 
              selectedSlot.time === slot.time && selectedSlot.tee_label === tee.label
            );
            slot.isSelected = isSelected;
            slot.isMultiSelected = isSelected;
          });
        } else {
          // No existing selection for this tee and date combination
          console.log(`No previously selected slots found for tee ${tee.label} on date ${dateKey}`);
          
          // Remove slots for this date and current tee from selectedSlots, but keep slots for other tees
          this.selectedSlots = this.selectedSlots.filter(slot => 
            !slot.booking_date || 
            this.getDateKey(slot.booking_date) !== dateKey || 
            slot.tee_label !== tee.label
          );
          
          // Clear selection states for current time slots since no slots are selected for this tee
          this.currentTimeSlots.forEach(slot => {
            slot.isSelected = false;
            slot.isMultiSelected = false;
          });
        }
      }
    
    // Load time slots if date is already selected and participants are selected
    if (this.selectedDate && this.participantCount > 0) {
      console.log('Loading time slots for selected tee, date, and participants');
      this.loadAvailableTimeSlots();
    } else {
      console.log('No date or participants selected yet, time slots will be loaded when both are selected');
    }
    
    // Update slot summary to reflect current state
    this.updateSlotSummary();
    
    // Log the final state after tee selection for debugging
    console.log('Tee selection completed:', this.selectedTee?.label);
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
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Add days from previous month to fill the first week
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
    
    // Add days from next month to fill the last week
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
      const wasToday = this.isSelectedDateToday();
      const previousDate = this.selectedDate;
      
      // Store current date's selected slots before switching
      if (this.selectedDate && this.selectedTee) {
        const currentDateKey = this.getDateKey(this.selectedDate);
        const currentSlots = this.selectedSlots.filter(slot => 
          slot.booking_date && this.getDateKey(slot.booking_date) === currentDateKey
        );
        
        if (currentSlots.length > 0) {
          console.log(`Storing ${currentSlots.length} slots for date ${currentDateKey} before switching`);
          this.setDateSlotSelection(this.selectedDate, this.selectedTee, currentSlots);
        }
      }
      
      this.selectedDate = new Date(date);
      this.selectedTime = '';
      this.showCalendar = false;
      
      // If switching to today, clear any previously selected time
      // as it might no longer be valid
      if (this.isSelectedDateToday() && !wasToday) {
        this.selectedTime = '';
      }
      
      // Restore previously selected slots for this date and tee if they exist
      if (this.selectedTee) {
        const newDateKey = this.getDateKey(this.selectedDate);
        
        // Find existing selection for this specific date and tee combination
        let existingSelection: DateSlotSelection | undefined;
        for (const [key, selection] of this.dateSlotSelections.entries()) {
          if (this.getDateKey(selection.date) === newDateKey && selection.tee.id === this.selectedTee.id) {
            existingSelection = selection;
            break;
          }
        }
        
        if (existingSelection) {
          console.log(`Restoring ${existingSelection.selectedSlots.length} previously selected slots for date ${newDateKey} and tee ${this.selectedTee.label}`);
          
          // Remove any existing slots for this date (regardless of tee) from selectedSlots
          this.selectedSlots = this.selectedSlots.filter(slot => 
            !slot.booking_date || this.getDateKey(slot.booking_date) !== newDateKey
          );
          
          // Add back all slots for this date from all tees
          for (const [key, selection] of this.dateSlotSelections.entries()) {
            if (this.getDateKey(selection.date) === newDateKey) {
              this.selectedSlots.push(...selection.selectedSlots);
            }
          }
        } else {
          console.log(`No previously selected slots found for date ${newDateKey} and tee ${this.selectedTee.label}`);
        }
      }
      
      // Load time slots if tee and participants are already selected
      if (this.selectedTee && this.participantCount > 0) {
        this.loadAvailableTimeSlots();
      }
      
      // Log date change for debugging
      console.log(`Date changed to ${this.getDateKey(this.selectedDate)}`);
      
      // Update slot summary
      this.updateSlotSummary();
      
      // Log the final state after date selection for debugging
      console.log('Date selection completed:', this.getDateKey(this.selectedDate));
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
    if (!this.selectedTee || !this.selectedDate || this.participantCount === 0) {
      this.currentTimeSlots = [];
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const dateStr = this.selectedDate.toISOString().split('T')[0];
      
      // Use the new method that includes participant count filtering
      const response = await this.collectionService.getAvailableSlotsWithParticipants(
        this.course.id,
        dateStr,
        this.selectedTee.id,
        this.participantCount
      );

      console.log('Full API response:', response);
      console.log('Response data:', response?.data);
      console.log('Response data code:', response?.data?.code);
      console.log('Response data data:', response?.data?.data);

      if (response && response.data && response.data.code === 1) {
        // The new API response structure has slots nested under data.data.slots
        const responseData = response.data.data;
        let slots = [];
        
        console.log('Response data structure:', responseData);
        
        // Handle both old and new response formats for backward compatibility
        if (Array.isArray(responseData)) {
          // Old format: response.data.data is directly an array of slots
          slots = responseData;
          console.log('Using old format - direct array of slots');
        } else if (responseData && responseData.slots && Array.isArray(responseData.slots)) {
          // New format: response.data.data.slots contains the array of slots
          slots = responseData.slots;
          console.log('Using new format - slots from responseData.slots');
        } else {
          console.error('Unexpected response format:', responseData);
          console.error('Response data type:', typeof responseData);
          console.error('Response data keys:', responseData ? Object.keys(responseData) : 'null/undefined');
          console.error('Response data value:', JSON.stringify(responseData, null, 2));
          this.currentTimeSlots = [];
          this.errorMessage = 'Invalid response format from server';
          return;
        }
        
        console.log('Slots to filter:', slots);
        console.log('Number of slots:', slots.length);
        
        // Validate that slots is a valid array
        if (!Array.isArray(slots)) {
          console.error('Slots is not an array:', slots);
          this.currentTimeSlots = [];
          this.errorMessage = 'Invalid slots data from server';
          return;
        }
        
        // Filter slots based on current date vs other dates
        const filteredSlots = this.filterTimeSlotsForDate(slots);
        
        console.log('Filtered slots:', filteredSlots);
        console.log('Number of filtered slots:', filteredSlots.length);
        
        // Validate that filteredSlots is a valid array
        if (!Array.isArray(filteredSlots)) {
          console.error('Filtered slots is not an array:', filteredSlots);
          this.currentTimeSlots = [];
          this.errorMessage = 'Error filtering time slots';
          return;
        }
        
        this.currentTimeSlots = filteredSlots.map((slot: any) => ({
          time: slot.time,
          available: slot.available,
          formatted_time: slot.formatted_time,
          slot_status: slot.slot_status,
          available_spots: slot.available_spots,
          total_participants: slot.total_participants,
          bookings: slot.bookings || [],
          booking_count: slot.booking_count || 0,
          participantCount: slot.participantCount || 1 // Ensure participantCount is set
        }));

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

  // Restore slot selection state from selectedSlots array
  private restoreSlotSelectionState(): void {
    if (!this.selectedDate || !this.selectedTee) {
      console.log('restoreSlotSelectionState called but missing selectedDate or selectedTee, returning');
      return;
    }

    // Get selected slots for the current date and tee
    const dateSelectedSlots = this.getSelectedSlotsForDate(this.selectedDate, this.selectedTee);
    
    console.log('restoreSlotSelectionState called:');
    console.log('Selected date:', this.selectedDate);
    console.log('Selected tee:', this.selectedTee);
    console.log('Date selected slots:', dateSelectedSlots);
    
    if (dateSelectedSlots.length === 0) {
      console.log('No date selected slots found, returning');
      return;
    }

    // Clear current selection states
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
    });

    // Restore selection state for each selected slot for the current date
    dateSelectedSlots.forEach(selectedSlot => {
      // Find the corresponding slot in currentTimeSlots
      const currentSlot = this.currentTimeSlots.find(slot => 
        slot.time === selectedSlot.time
      );

      if (currentSlot) {
        // Restore the selection state
        if (selectedSlot.isSelected) {
          currentSlot.isSelected = true;
          currentSlot.isMultiSelected = false;
        } else if (selectedSlot.isMultiSelected) {
          currentSlot.isSelected = false;
          currentSlot.isMultiSelected = true;
        }

        // Restore other properties
        currentSlot.participantCount = selectedSlot.participantCount;
        currentSlot.booking_date = selectedSlot.booking_date;
        currentSlot.tee_label = selectedSlot.tee_label;
        
        console.log(`Restored selection state for slot ${currentSlot.time}:`, {
          isSelected: currentSlot.isSelected,
          isMultiSelected: currentSlot.isMultiSelected,
          participantCount: currentSlot.participantCount
        });
      }
    });

    // Log the restored selection state for debugging
    this.logSelectionState();
  }

  // Method to manually refresh time slots while preserving selection
  async refreshTimeSlots(): Promise<void> {
    console.log('refreshTimeSlots called:');
    console.log('Selected tee:', this.selectedTee);
    console.log('Selected date:', this.selectedDate);
    console.log('Participant count:', this.participantCount);
    
    if (this.selectedTee && this.selectedDate && this.participantCount > 0) {
      await this.loadAvailableTimeSlots();
    } else {
      console.log('Cannot refresh time slots - missing required data');
    }
  }

  // Helper method to check if a slot is currently selected
  isSlotSelected(slot: TimeSlot): boolean {
    const isSelected = !!(slot.isSelected || slot.isMultiSelected);
    console.log(`isSlotSelected called for slot ${slot.time}, returning:`, isSelected);
    return isSelected;
  }

  // Debug method to log current selection state
  private logSelectionState(): void {
    console.log('Current selection state:');
    console.log('Selected slots:', this.selectedSlots);
    console.log('Date slot selections:', this.dateSlotSelections);
    console.log('Current time slots:', this.currentTimeSlots.map(slot => ({
      time: slot.time,
      isSelected: slot.isSelected,
      isMultiSelected: slot.isMultiSelected,
      participantCount: slot.participantCount
    })));
    
    // Additional debugging for slot preservation
    console.log('All selected slots across dates:', this.getAllSelectedSlots());
    console.log('Slots grouped by tee:', this.getSlotsGroupedByTee());
    console.log('Total dates with selections:', this.getTotalDatesWithSelections());
    console.log('Can book:', this.canBook());
  }

  // Helper methods for date-based slot management
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getDateSlotSelection(date: Date): DateSlotSelection | undefined {
    const dateKey = this.getDateKey(date);
    return this.dateSlotSelections.get(dateKey);
  }

  private setDateSlotSelection(date: Date, tee: Tee, selectedSlots: TimeSlot[]): void {
    const dateKey = this.getDateKey(date);
    const dateTeeKey = `${dateKey}_tee_${tee.id}`;
    const totalParticipants = selectedSlots.reduce((sum, slot) => sum + (slot.participantCount || 1), 0);
    
    // Remove any existing entry for this date and tee combination
    for (const [key, selection] of this.dateSlotSelections.entries()) {
      if (this.getDateKey(selection.date) === dateKey && selection.tee.id === tee.id) {
        this.dateSlotSelections.delete(key);
        break;
      }
    }
    
    // Add the new entry with unique key
    this.dateSlotSelections.set(dateTeeKey, {
      date: new Date(date),
      tee: { ...tee },
      selectedSlots: selectedSlots.map(slot => ({ ...slot })),
      totalParticipants
    });
  }

  private removeDateSlotSelection(date: Date, tee?: Tee): void {
    const dateKey = this.getDateKey(date);
    
    if (tee) {
      // Remove specific date-tee combination
      for (const [key, selection] of this.dateSlotSelections.entries()) {
        if (this.getDateKey(selection.date) === dateKey && selection.tee.id === tee.id) {
          this.dateSlotSelections.delete(key);
          break;
        }
      }
    } else {
      // Remove all selections for this date (all tees)
      const keysToRemove: string[] = [];
      for (const [key, selection] of this.dateSlotSelections.entries()) {
        if (this.getDateKey(selection.date) === dateKey) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => this.dateSlotSelections.delete(key));
    }
  }

  private getSelectedSlotsForDate(date: Date, tee?: Tee): TimeSlot[] {
    const dateKey = this.getDateKey(date);
    const targetTee = tee || this.selectedTee;
    
    if (!targetTee) {
      return [];
    }
    
    // Find selection for this specific date and tee combination
    let dateSelection: DateSlotSelection | undefined;
    for (const [key, selection] of this.dateSlotSelections.entries()) {
      if (this.getDateKey(selection.date) === dateKey && selection.tee.id === targetTee.id) {
        dateSelection = selection;
        break;
      }
    }
    
    return dateSelection ? dateSelection.selectedSlots : [];
  }

  private updateDateSlotSelection(date: Date): void {
    if (!this.selectedTee) {
      return;
    }
    
    // Filter slots for this specific date and tee combination
    const currentDateTeeSlots = this.selectedSlots.filter(slot => 
      slot.booking_date && 
      this.getDateKey(slot.booking_date) === this.getDateKey(date) &&
      slot.tee_label === this.selectedTee!.label
    );
    
    if (currentDateTeeSlots.length > 0) {
      this.setDateSlotSelection(date, this.selectedTee, currentDateTeeSlots);
    } else {
      this.removeDateSlotSelection(date, this.selectedTee);
    }
  }

  // Filter time slots based on current date vs other dates
  filterTimeSlotsForDate(slots: any[]): any[] {
    console.log('filterTimeSlotsForDate called with:', slots);
    console.log('slots type:', typeof slots);
    console.log('slots isArray:', Array.isArray(slots));
    
    if (!Array.isArray(slots)) {
      console.error('filterTimeSlotsForDate: slots is not an array:', slots);
      return [];
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison
    
    const selectedDate = new Date(this.selectedDate);
    selectedDate.setHours(0, 0, 0, 0); // Reset time to start of day for accurate date comparison
    
    const isToday = selectedDate.getTime() === today.getTime();
    
    console.log('isToday:', isToday);
    
    if (!isToday) {
      // For all future dates (including tomorrow), show all slots from open time (no filtering)
      console.log('Not today, returning all slots');
      return slots;
    }
    
    // Only for today, filter out slots that have already passed
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
    
    console.log('Today, filtering slots. Current time in minutes:', currentTime);
    
    const filteredSlots = slots.filter((slot: any) => {
      if (!slot || !slot.time) {
        console.warn('Invalid slot:', slot);
        return false;
      }
      
      const [hours, minutes] = slot.time.split(':').map(Number);
      const slotTimeInMinutes = hours * 60 + minutes;
      
      // Round up to next 8-minute slot
      const slotDuration = 8;
      const roundedCurrentTime = Math.ceil(currentTime / slotDuration) * slotDuration;
      
      const shouldInclude = slotTimeInMinutes >= roundedCurrentTime;
      console.log(`Slot ${slot.time} (${slotTimeInMinutes} min) vs current (${roundedCurrentTime} min): ${shouldInclude ? 'include' : 'exclude'}`);
      
      return shouldInclude;
    });
    
    console.log('Filtered slots result:', filteredSlots);
    return filteredSlots;
  }



  selectTime(time: string): void {
    this.selectedTime = time;
  }

  // Enhanced slot selection methods
  selectSlot(slot: TimeSlot): void {
    if (slot.slot_status === 'booked' || !slot.available) {
      return;
    }

    // Check if slot is already selected
    const isAlreadySelected = this.getCurrentDateSelectedSlots().some(selectedSlot => 
      selectedSlot.time === slot.time
    );

    if (isAlreadySelected) {
      // If slot is already selected, reopen modal to allow modification
      console.log('Slot already selected, reopening modal for modification:', slot.time);
      this.openSlotModal(slot);
      return;
    }

    // Open modal for both available and partially_available slots
    if (slot.slot_status === 'available' || slot.slot_status === 'partially_available') {
      this.openSlotModal(slot);
      return;
    }

    // For other cases, use the old logic
    if (this.selectedSlots.length > 0) {
      this.toggleMultiSelectSlot(slot);
    } else {
      this.selectSingleSlot(slot);
    }

    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  // Method to deselect a slot
  deselectSlot(slot: TimeSlot): void {
    console.log('Deselecting slot:', slot.time);
    
    // Remove from selectedSlots
    this.selectedSlots = this.selectedSlots.filter(s => 
      !(s.time === slot.time && s.booking_date && this.getDateKey(s.booking_date) === this.getDateKey(this.selectedDate))
    );
    
    // Clear selection state from currentTimeSlots
    const currentTimeSlot = this.currentTimeSlots.find(s => s.time === slot.time);
    if (currentTimeSlot) {
      currentTimeSlot.isSelected = false;
      currentTimeSlot.isMultiSelected = false;
    }
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  selectSingleSlot(slot: TimeSlot): void {
    // Clear previous selections for the current date only
    this.currentTimeSlots.forEach(s => {
      s.isSelected = false;
      s.isMultiSelected = false;
    });
    
    // Clear previous selections from selectedSlots for the current date
    this.selectedSlots = this.selectedSlots.filter(s => 
      !s.booking_date || this.getDateKey(s.booking_date) !== this.getDateKey(this.selectedDate)
    );
    
    slot.isSelected = true;
    slot.participantCount = this.participantCount; // Set participant count for this slot
    slot.booking_date = this.selectedDate; // Store the date for this slot
    slot.tee_label = this.selectedTee?.label; // Store the tee label for this slot
    this.selectedTime = slot.time;
    this.selectedSlots.push(slot);
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  // New method that accepts participant count from modal
  selectSingleSlotWithParticipants(slot: TimeSlot, participantCount: number): void {
    console.log('selectSingleSlotWithParticipants called with participantCount:', participantCount);
    
    // Clear previous selections for the current date only
    this.currentTimeSlots.forEach(s => {
      s.isSelected = false;
      s.isMultiSelected = false;
    });
    
    // Clear previous selections from selectedSlots for the current date
    this.selectedSlots = this.selectedSlots.filter(s => 
      !s.booking_date || this.getDateKey(s.booking_date) !== this.getDateKey(this.selectedDate)
    );
    
    // Update the slot in currentTimeSlots to show selected state
    const currentTimeSlot = this.currentTimeSlots.find(s => s.time === slot.time);
    if (currentTimeSlot) {
      currentTimeSlot.isSelected = true;
      currentTimeSlot.isMultiSelected = false;
      currentTimeSlot.participantCount = participantCount;
      currentTimeSlot.booking_date = this.selectedDate;
      currentTimeSlot.tee_label = this.selectedTee?.label;
    }
    
    slot.isSelected = true;
    slot.participantCount = participantCount; // Use the participant count from modal
    slot.booking_date = this.selectedDate; // Store the date for this slot
    slot.tee_label = this.selectedTee?.label; // Store the tee label for this slot
    this.selectedTime = slot.time;
    this.selectedSlots.push(slot);
    
    console.log('Slot added to selectedSlots with participantCount:', slot.participantCount);
    console.log('Current time slot updated:', currentTimeSlot);
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  toggleMultiSelectSlot(slot: TimeSlot): void {
    if (slot.isMultiSelected) {
      // Deselect slot
      slot.isMultiSelected = false;
      this.selectedSlots = this.selectedSlots.filter(s => 
        !(s.time === slot.time && s.booking_date && this.getDateKey(s.booking_date) === this.getDateKey(this.selectedDate))
      );
    } else {
      // Select slot with current participant count
      slot.isMultiSelected = true;
      slot.participantCount = this.participantCount; // Set participant count for this slot
      slot.booking_date = this.selectedDate; // Store the date for this slot
      slot.tee_label = this.selectedTee?.label; // Store the tee label for this slot
      this.selectedSlots.push(slot);
    }
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  // New method that accepts participant count from modal
  toggleMultiSelectSlotWithParticipants(slot: TimeSlot, participantCount: number): void {
    console.log('toggleMultiSelectSlotWithParticipants called with participantCount:', participantCount);
    
    if (slot.isMultiSelected) {
      // Deselect slot
      slot.isMultiSelected = false;
      this.selectedSlots = this.selectedSlots.filter(s => 
        !(s.time === slot.time && s.booking_date && this.getDateKey(s.booking_date) === this.getDateKey(this.selectedDate))
      );
      
      // Update the slot in currentTimeSlots to remove selected state
      const currentTimeSlot = this.currentTimeSlots.find(s => s.time === slot.time);
      if (currentTimeSlot) {
        currentTimeSlot.isSelected = false;
        currentTimeSlot.isMultiSelected = false;
      }
    } else {
      // Select slot with participant count from modal
      slot.isMultiSelected = true;
      slot.participantCount = participantCount; // Use the participant count from modal
      slot.booking_date = this.selectedDate; // Store the date for this slot
      slot.tee_label = this.selectedTee?.label; // Store the tee label for this slot
      this.selectedSlots.push(slot);
      
      // Update the slot in currentTimeSlots to show selected state
      const currentTimeSlot = this.currentTimeSlots.find(s => s.time === slot.time);
      if (currentTimeSlot) {
        currentTimeSlot.isSelected = false;
        currentTimeSlot.isMultiSelected = true;
        currentTimeSlot.participantCount = participantCount;
        currentTimeSlot.booking_date = this.selectedDate;
        currentTimeSlot.tee_label = this.selectedTee?.label;
      }
      
      console.log('Slot added to selectedSlots with participantCount:', slot.participantCount);
      console.log('Current time slot updated:', currentTimeSlot);
    }
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  openSlotModal(slot: TimeSlot): void {
    // Check if this slot is already selected
    const isAlreadySelected = this.getCurrentDateSelectedSlots().some(selectedSlot => 
      selectedSlot.time === slot.time
    );
    
    let requestedParticipants = this.participantCount; // Default to current participant count
    
    if (isAlreadySelected) {
      // If slot is already selected, use the stored participant count
      const selectedSlot = this.getCurrentDateSelectedSlots().find(s => s.time === slot.time);
      if (selectedSlot && selectedSlot.participantCount) {
        requestedParticipants = selectedSlot.participantCount;
      }
    } else {
      // For new selections, clamp to available spots
      const maxAllowed = Math.min(slot.available_spots || 4, 4);
      requestedParticipants = Math.min(this.participantCount, maxAllowed);
    }
    
    this.slotModalData = {
      slot: slot,
      availableSpots: slot.available_spots || 0,
      totalParticipants: slot.total_participants || 0,
      requestedParticipants: requestedParticipants
    };
    
    console.log('Opening modal for slot:', slot.time);
    console.log('Is already selected:', isAlreadySelected);
    console.log('Requested participants:', requestedParticipants);
    
    this.showSlotModal = true;
  }

  closeSlotModal(): void {
    this.showSlotModal = false;
    this.slotModalData = null;
  }

  incrementModalParticipants(): void {
    if (this.slotModalData) {
      const maxAllowed = Math.min(this.slotModalData.availableSpots, 4);
      if (this.slotModalData.requestedParticipants < maxAllowed) {
        this.slotModalData.requestedParticipants++;
      }
    }
  }

  decrementModalParticipants(): void {
    if (this.slotModalData && this.slotModalData.requestedParticipants > 1) {
      this.slotModalData.requestedParticipants--;
    }
  }

  confirmSlotSelection(): void {
    if (this.slotModalData) {
      const slot = this.slotModalData.slot;
      
      // Create a copy of the slot to avoid modifying the original
      const slotCopy = { ...slot };
      
      // Set the participant count for this specific slot
      slotCopy.participantCount = this.slotModalData.requestedParticipants;
      // Store the date and tee information for this slot
      slotCopy.booking_date = this.selectedDate;
      slotCopy.tee_label = this.selectedTee?.label;
      
      // Debug logging
      console.log('Modal participant count:', this.slotModalData.requestedParticipants);
      console.log('Slot copy participant count:', slotCopy.participantCount);
      console.log('Slot copy date:', slotCopy.booking_date);
      console.log('Slot copy time:', slotCopy.time);
      
      // Check if this slot is already selected
      const isAlreadySelected = this.getCurrentDateSelectedSlots().some(selectedSlot => 
        selectedSlot.time === slot.time
      );
      
      if (isAlreadySelected) {
        // Update existing selection
        this.updateExistingSlotSelection(slotCopy, this.slotModalData.requestedParticipants);
      } else {
        // Add to multi-select if we have slots selected for the current date, otherwise single select
        const currentDateSlots = this.getCurrentDateSelectedSlots();
        
        if (currentDateSlots.length > 0) {
          // Use the modal's participant count for multi-select
          this.toggleMultiSelectSlotWithParticipants(slotCopy, this.slotModalData.requestedParticipants);
        } else {
          // Use the modal's participant count for single select
          this.selectSingleSlotWithParticipants(slotCopy, this.slotModalData.requestedParticipants);
        }
      }
      
      this.closeSlotModal();
      
      // Log the selection state for debugging
      this.logSelectionState();
    }
  }

  // Method to update existing slot selection
  private updateExistingSlotSelection(slot: TimeSlot, newParticipantCount: number): void {
    console.log('Updating existing slot selection:', slot.time, 'with participants:', newParticipantCount);
    
    // Find and update the existing selection in selectedSlots
    const existingSlotIndex = this.selectedSlots.findIndex(s => 
      s.time === slot.time && 
      s.booking_date && 
      this.getDateKey(s.booking_date) === this.getDateKey(this.selectedDate)
    );
    
    if (existingSlotIndex !== -1) {
      // Update the existing slot
      this.selectedSlots[existingSlotIndex].participantCount = newParticipantCount;
      this.selectedSlots[existingSlotIndex].booking_date = this.selectedDate;
      this.selectedSlots[existingSlotIndex].tee_label = this.selectedTee?.label;
      
      // Update the corresponding slot in currentTimeSlots
      const currentTimeSlot = this.currentTimeSlots.find(s => s.time === slot.time);
      if (currentTimeSlot) {
        currentTimeSlot.participantCount = newParticipantCount;
        currentTimeSlot.booking_date = this.selectedDate;
        currentTimeSlot.tee_label = this.selectedTee?.label;
      }
      
      console.log('Existing slot updated with new participant count:', newParticipantCount);
    }
    
    // Update date-based slot selection
    this.updateDateSlotSelection(this.selectedDate);
    
    this.updateSlotSummary();
  }

  updateSlotSummary(): void {
    const currentDateSlots = this.getSelectedSlotsForDate(this.selectedDate);
    
    console.log('updateSlotSummary called:');
    console.log('Current date slots:', currentDateSlots);
    console.log('Selected date:', this.selectedDate);
    console.log('Selected tee:', this.selectedTee);
    
    if (currentDateSlots.length === 0) {
      this.slotSummary = null;
      console.log('No current date slots, slot summary cleared');
      return;
    }

    const totalParticipants = currentDateSlots.reduce((sum, slot) => sum + (slot.participantCount || 1), 0);
    const status = this.getSlotSummaryStatus();

    this.slotSummary = {
      date: this.selectedDate,
      tee: this.selectedTee,
      selectedSlots: currentDateSlots,
      totalParticipants: totalParticipants,
      status: status
    };
    
    console.log('Slot summary updated:', this.slotSummary);
  }

  getSlotSummaryStatus(): 'available' | 'partial' | 'booked' {
    const currentDateSlots = this.getSelectedSlotsForDate(this.selectedDate);
    const hasPartial = currentDateSlots.some(slot => slot.slot_status === 'partially_available');
    const hasBooked = currentDateSlots.some(slot => slot.slot_status === 'booked');
    
    console.log('getSlotSummaryStatus called:');
    console.log('Current date slots:', currentDateSlots);
    console.log('Has partial:', hasPartial);
    console.log('Has booked:', hasBooked);
    
    if (hasBooked) return 'booked';
    if (hasPartial) return 'partial';
    return 'available';
  }

  toggleMultiSelect(): void {
    console.log('toggleMultiSelect called (no longer needed as we use continuous clicking)');
    // This method is no longer needed as we use continuous clicking
    // Keeping it for backward compatibility but it does nothing
  }

  clearSelectedSlots(): void {
    // Clear selected slots for the current date and tee only
    if (this.selectedDate && this.selectedTee) {
      const currentDateKey = this.getDateKey(this.selectedDate);
      
      // Store current selection before clearing (for the specific tee)
      const currentTeeSlots = this.selectedSlots.filter(slot => 
        slot.booking_date && 
        this.getDateKey(slot.booking_date) === currentDateKey &&
        slot.tee_label === this.selectedTee!.label
      );
      
      if (currentTeeSlots.length > 0) {
        console.log(`Storing ${currentTeeSlots.length} slots before clearing for date ${currentDateKey} and tee ${this.selectedTee.label}`);
        this.setDateSlotSelection(this.selectedDate, this.selectedTee, currentTeeSlots);
      }
      
      // Clear selected slots for the current date and tee only
      this.selectedSlots = this.selectedSlots.filter(s => 
        !s.booking_date || 
        this.getDateKey(s.booking_date) !== currentDateKey ||
        s.tee_label !== this.selectedTee!.label
      );
      
      // Remove the date-tee selection since we're clearing it
      this.removeDateSlotSelection(this.selectedDate, this.selectedTee);
    }
    
    // Clear selection states for current time slots
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
    });
    
    this.selectedTime = '';
    
    // Update slot summary
    this.updateSlotSummary();
    
    // Log the selection state for debugging
    this.logSelectionState();
  }

  getSlotClass(slot: TimeSlot): string {
    let className = '';
    
    if (slot.slot_status === 'booked' || !slot.available) {
      className = 'booked-slot';
    } else if (slot.isSelected) {
      className = 'selected'; // Changed from 'selected-slot' to 'selected' to match CSS
    } else if (slot.isMultiSelected) {
      className = 'multi-selected'; // Changed from 'multi-selected-slot' to 'multi-selected' to match CSS
    } else if (slot.slot_status === 'partially_available') {
      className = 'partial-slot-theme';
    } else {
      className = 'available-slot';
    }
    
    console.log(`getSlotClass called for slot ${slot.time}, returning:`, className);
    return className;
  }



  // Booking validation and submission
  canBook(): boolean {
    // Check if we have multiple slots selected or single slot
    const allSelectedSlots = this.getAllSelectedSlots();
    
    console.log('canBook called:');
    console.log('All selected slots:', allSelectedSlots);
    console.log('Participant count:', this.participantCount);
    console.log('Selected tee:', this.selectedTee);
    console.log('Selected date:', this.selectedDate);
    console.log('Selected time:', this.selectedTime);
    console.log('Is loading:', this.isLoading);
    console.log('Is authenticated:', this.isAuthenticated());
    
    if (allSelectedSlots.length > 0) {
      // For multi-select mode, check if any slots are selected across all dates
      const canBookMulti = !!(
        this.participantCount > 0 &&
        this.selectedTee &&
        allSelectedSlots.length > 0 &&
        !this.isLoading &&
        this.isAuthenticated()
      );
      console.log('Multi-select mode, can book:', canBookMulti);
      return canBookMulti;
    } else {
      // For single select mode, check if a time is selected
      const canBookSingle = !!(
        this.participantCount > 0 &&
        this.selectedTee &&
        this.selectedDate &&
        this.selectedTime &&
        !this.isLoading &&
        this.isAuthenticated()
      );
      console.log('Single select mode, can book:', canBookSingle);
      return canBookSingle;
    }
  }

  updateTotalPrice(): void {
    console.log('updateTotalPrice called (price calculation removed - no longer needed)');
    // Price calculation removed - no longer needed
  }

  getTotalPrice(): number {
    console.log('getTotalPrice called, returning: 0 (price removed from tees)');
    return 0; // Price removed from tees
  }

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const dateStr = this.selectedDate.toISOString().split('T')[0];
      
      if (this.selectedSlots.length > 0) {
        // Handle multi-select bookings
        await this.createMultiBookings(dateStr);
      } else {
        // Handle single booking
        await this.createSingleBooking(dateStr);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      this.errorMessage = 'Failed to create booking. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private async createSingleBooking(dateStr: string): Promise<void> {
    // Check if this is a join request (slot has existing bookings)
    const selectedSlot = this.currentTimeSlots.find(slot => slot.time === this.selectedTime);
    const isJoinRequest = selectedSlot && selectedSlot.total_participants !== undefined && selectedSlot.total_participants > 0;
    
    const bookingData: any = {
      course: this.course.id,
      tee: this.selectedTee!.id,
      bookingDate: dateStr,
      bookingTime: this.selectedTime,
      participants: this.participantCount,
      totalPrice: this.getTotalPrice()
    };

    if (isJoinRequest) {
      // This is a join request - find the original booking
      const originalBooking = selectedSlot?.bookings?.[0];
      if (originalBooking) {
        bookingData.is_join_request = true;
        bookingData.original_booking = originalBooking.booking_id;
        bookingData.status = 'pending_approval';
      }
    }

    const response = await this.collectionService.createBooking(bookingData);

    if (response && response.data && response.data.code === 1) {
      this.successMessage = isJoinRequest 
        ? 'Join request sent successfully! You will be notified when the original member responds.'
        : 'Booking created successfully!';
      
      this.bookingConfirmationData = {
        ...response.data.data,
        courseName: this.course.name,
        teeLabel: this.selectedTee?.label,
        date: this.selectedDate,
        time: this.selectedTime,
        participants: this.participantCount,
        status: isJoinRequest ? 'Pending Approval' : 'Completed'
      };
      this.showBookingModal = true;
    } else {
      this.errorMessage = response?.data?.message || 'Failed to create booking';
    }
  }

  private async createMultiBookings(dateStr: string): Promise<void> {
    try {
      // Prepare slots data for multi-slot booking
      const slotsData = this.selectedSlots.map(slot => ({
        course: this.course.id,
        tee: this.selectedTee!.id,
        bookingDate: dateStr,
        bookingTime: slot.time,
        participants: slot.participantCount || this.participantCount,
        totalPrice: this.getTotalPrice(),
        is_join_request: slot.total_participants !== undefined && slot.total_participants > 0,
        original_booking: slot.total_participants !== undefined && slot.total_participants > 0 
          ? slot.bookings?.[0]?.booking_id 
          : undefined
      }));

      // Use the new multi-slot booking API
      const response = await this.collectionService.createMultiSlotBooking({ slots: slotsData });

      if (response && response.data && response.data.code === 1) {
        this.successMessage = `Successfully created ${response.data.data.totalBookings} booking(s)!`;
        this.bookingConfirmationData = {
          groupId: response.data.data.groupId,
          totalBookings: response.data.data.totalBookings,
          courseName: this.course.name,
          teeLabel: this.selectedTee?.label,
          date: this.selectedDate,
          selectedSlots: this.selectedSlots.map(slot => ({
            time: slot.time,
            participants: slot.participantCount || this.participantCount,
            date: slot.booking_date || this.selectedDate,
            tee: slot.tee_label || this.selectedTee?.label
          }))
        };
        this.showBookingModal = true;
      } else {
        this.errorMessage = response?.data?.message || 'Failed to create multi-slot bookings';
      }
    } catch (error) {
      console.error('Error creating multi-slot bookings:', error);
      this.errorMessage = 'Failed to create multi-slot bookings. Please try again.';
    }
  }

  // Add method to close booking confirmation modal
  closeBookingModal(): void {
    this.showBookingModal = false;
    this.bookingConfirmationData = null;
    
    // Force a complete page reload to ensure all data is fresh
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  resetBookingForm(): void {
    this.participantCount = 1;
    this.selectedTee = null;
    this.selectedDate = new Date();
    this.selectedTime = '';
    this.currentTimeSlots = [];
    this.showCalendar = false;
    
    // Clear all selections using the new method
    this.clearAllSelections();
    
    // Clear modal properties
    this.showSlotModal = false;
    this.slotModalData = null;
    
    // Reload course data to ensure fresh state
    this.loadCourseData();
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
    console.log(`trackByAmenity called for amenity ${amenity.amenityName} at index ${index}, returning:`, amenity.id);
    return amenity.id;
  }

  // Authentication helper
  isAuthenticated(): boolean { 
    const hasToken = !!localStorage.getItem('access_token');
    console.log('isAuthenticated called, returning:', hasToken);
    return hasToken;
  }

  isJoinRequest(): boolean {
    if (!this.selectedTime) {
      console.log('isJoinRequest called but no selectedTime, returning false');
      return false;
    }
    
    const selectedSlot = this.currentTimeSlots.find(slot => slot.time === this.selectedTime);
    const isJoinRequest = selectedSlot ? (selectedSlot.total_participants !== undefined && selectedSlot.total_participants > 0) : false;
    
    console.log('isJoinRequest called:');
    console.log('Selected time:', this.selectedTime);
    console.log('Selected slot:', selectedSlot);
    console.log('Is join request:', isJoinRequest);
    
    return isJoinRequest;
  }

  getSlotTooltip(slot: TimeSlot): string {
    if (slot.bookings && slot.bookings.length > 0) {
      const bookingDetails = slot.bookings.map(booking => 
        `${booking.member_name} (${booking.participants} player${booking.participants > 1 ? 's' : ''}, ${booking.hole_number} holes)`
      ).join('\n');
      const tooltip = `Booked:\n${bookingDetails}`;
      
      console.log(`getSlotTooltip called for slot ${slot.time}, returning:`, tooltip);
      return tooltip;
    }
    
    console.log(`getSlotTooltip called for slot ${slot.time}, returning: Available`);
    return 'Available';
  }

  // Amenity icon helper
  getAmenityIcon(amenity: Amenity): any {
    // Map amenity names to FontAwesome icons
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
    
    // Try to match by exact name first, then by partial match
    const exactMatch = iconMap[amenity.amenityName];
    if (exactMatch) {
      console.log(`getAmenityIcon called for amenity ${amenity.amenityName}, exact match found`);
      return exactMatch;
    }
    
    // Try partial matching
    for (const [key, icon] of Object.entries(iconMap)) {
      if (amenity.amenityName.toLowerCase().includes(key.toLowerCase())) {
        console.log(`getAmenityIcon called for amenity ${amenity.amenityName}, partial match found with key: ${key}`);
        return icon;
      }
    }
    
    console.log(`getAmenityIcon called for amenity ${amenity.amenityName}, no match found, returning default icon`);
    return this.wifiIcon; // Default to WiFi icon
  }

  getMaxModalParticipants(): number {
    if (!this.slotModalData) {
      console.log('getMaxModalParticipants called but no slotModalData, returning 1');
      return 1;
    }
    
    const maxParticipants = Math.min(this.slotModalData.availableSpots, 4);
    console.log('getMaxModalParticipants called, returning:', maxParticipants);
    return maxParticipants;
  }

  // Helper method for booking confirmation modal
  getTotalParticipants(slots: any[]): number {
    const total = slots.reduce((total, slot) => {
      // Handle both participantCount (from TimeSlot) and participants (from bookingConfirmationData)
      const participantCount = slot.participantCount || slot.participants || 1;
      return total + participantCount;
    }, 0);
    
    console.log('getTotalParticipants called with slots:', slots);
    console.log('Total participants calculated:', total);
    return total;
  }

  // Helper method for slot status class
  getSlotStatusClass(slot: TimeSlot): string {
    let className = '';
    
    if (slot.slot_status === 'available') {
      className = 'available';
    } else if (slot.slot_status === 'partially_available') {
      className = 'partially-available';
    } else if (slot.slot_status === 'booked') {
      className = 'selected';
    } else {
      className = 'available';
    }
    
    console.log(`getSlotStatusClass called for slot ${slot.time}, returning:`, className);
    return className;
  }

  // Helper method for slot status text
  getSlotStatusText(slot: TimeSlot): string {
    const status = slot.slot_status === 'available' ? 'Available' :
                   slot.slot_status === 'partially_available' ? 'Partially Available' :
                   slot.slot_status === 'booked' ? 'Booked' : 'Available';
    
    console.log(`getSlotStatusText called for slot ${slot.time}, returning:`, status);
    return status;
  }

  // Get all selected slots across all dates
  getAllSelectedSlots(): TimeSlot[] {
    return Array.from(this.dateSlotSelections.values())
      .flatMap(dateSelection => dateSelection.selectedSlots);
  }

  // Get total participants across all dates
  getTotalParticipantsAcrossDates(): number {
    return Array.from(this.dateSlotSelections.values())
      .reduce((total, dateSelection) => total + dateSelection.totalParticipants, 0);
  }

  // Get summary of all date selections
  getAllDateSelections(): DateSlotSelection[] {
    return Array.from(this.dateSlotSelections.values());
  }

  // Get formatted summary of all date selections for display
  getFormattedDateSelections(): Array<{
    date: string;
    tee: string;
    slots: string;
    participants: number;
  }> {
    return Array.from(this.dateSlotSelections.values()).map(selection => ({
      date: selection.date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      tee: selection.tee.label,
      slots: selection.selectedSlots.map(s => s.time).join(', '),
      participants: selection.totalParticipants
    }));
  }

  // Check if a specific date has any selected slots for the current tee
  hasSelectedSlotsForDate(date: Date, tee?: Tee): boolean {
    const slots = this.getSelectedSlotsForDate(date, tee);
    return slots.length > 0;
  }

  // Get the count of selected slots for a specific date and tee
  getSelectedSlotCountForDate(date: Date, tee?: Tee): number {
    const slots = this.getSelectedSlotsForDate(date, tee);
    return slots.length;
  }

  // Get selected slots for the current date and tee for display purposes
  getCurrentDateSelectedSlots(): TimeSlot[] {
    return this.getSelectedSlotsForDate(this.selectedDate, this.selectedTee || undefined);
  }

  // Get total participants for the current date
  getCurrentDateTotalParticipants(): number {
    const currentDateSlots = this.getCurrentDateSelectedSlots();
    return currentDateSlots.reduce((sum, slot) => sum + (slot.participantCount || 1), 0);
  }

  // Clear all selections across all dates
  clearAllSelections(): void {
    this.selectedSlots = [];
    this.dateSlotSelections.clear();
    this.currentTimeSlots.forEach(slot => {
      slot.isSelected = false;
      slot.isMultiSelected = false;
    });
    this.selectedTime = '';
    this.slotSummary = null;
  }

  // Get the total number of dates with selections
  getTotalDatesWithSelections(): number {
    return this.dateSlotSelections.size;
  }

  // Check if there are any selections across all dates
  hasAnySelections(): boolean {
    return this.dateSlotSelections.size > 0;
  }

  // Get comprehensive summary of all selections for booking
  getComprehensiveBookingSummary(): {
    totalDates: number;
    totalSlots: number;
    totalParticipants: number;
    dateSelections: Array<{
      date: string;
      tee: string;
      slots: Array<{
        time: string;
        participants: number;
        status: string;
      }>;
      totalParticipants: number;
    }>;
  } {
    const dateSelections = Array.from(this.dateSlotSelections.values());
    const totalSlots = dateSelections.reduce((sum, selection) => sum + selection.selectedSlots.length, 0);
    const totalParticipants = dateSelections.reduce((sum, selection) => sum + selection.totalParticipants, 0);

    const summary = {
      totalDates: dateSelections.length,
      totalSlots,
      totalParticipants,
      dateSelections: dateSelections.map(selection => ({
        date: selection.date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        tee: selection.tee.label,
        slots: selection.selectedSlots.map(slot => ({
          time: slot.time,
          participants: slot.participantCount || 1,
          status: slot.slot_status || 'available'
        })),
        totalParticipants: selection.totalParticipants
      }))
    };
    
    console.log('getComprehensiveBookingSummary called, returning:', summary);
    return summary;
  }

  // Group all selected slots by tee for display
  getSlotsGroupedByTee(): Array<{
    teeLabel: string;
    slots: TimeSlot[];
  }> {
    const allSlots = this.getAllSelectedSlots();
    const teeGroups = new Map<string, TimeSlot[]>();
    
    console.log('getSlotsGroupedByTee called:');
    console.log('All slots to group:', allSlots);
    
    // Group slots by tee label
    allSlots.forEach(slot => {
      const teeLabel = slot.tee_label || 'Unknown Tee';
      console.log(`Grouping slot ${slot.time} under tee label: ${teeLabel}`);
      if (!teeGroups.has(teeLabel)) {
        teeGroups.set(teeLabel, []);
      }
      teeGroups.get(teeLabel)!.push(slot);
    });
    
    console.log('Tee groups created:', teeGroups);
    
    // Convert to array and sort by tee label
    const result = Array.from(teeGroups.entries())
      .map(([teeLabel, slots]) => ({
        teeLabel,
        slots: slots.sort((a, b) => {
          // Sort by date first, then by time
          if (a.booking_date && b.booking_date) {
            const dateComparison = a.booking_date.getTime() - b.booking_date.getTime();
            if (dateComparison !== 0) return dateComparison;
          }
          return a.time.localeCompare(b.time);
        })
      }))
      .sort((a, b) => a.teeLabel.localeCompare(b.teeLabel));
    
    console.log('Final grouped result:', result);
    return result;
  }
}