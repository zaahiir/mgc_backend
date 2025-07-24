import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  faClock,
  faUsers,
  faLocationDot,
  faGlobe,
  faPhone,
  faDirections,
  faShareAlt,
  faParking,
  faWifi,
  faUtensils,
  faShoppingBag,
  faCalendar,
  faChevronLeft,
  faChevronRight,
  faGolfBall
} from '@fortawesome/free-solid-svg-icons';

interface Course {
  id: number;
  name: string;
  lane: string;
  address: string;
  code: string;
  timing: string;
  phone: string;
  website: string;
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
  };
  amenities: string[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Booking {
  date: Date;
  time: string;
  participants: number;
  course: string;
  totalPrice: number;
  holes: number;
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
  styleUrls: ['./tee-booking.component.css']
})
export class TeeBookingComponent implements OnInit {
  // Icons
  locationIcon = faLocationDot;
  clockIcon = faClock;
  usersIcon = faUsers;
  globeIcon = faGlobe;
  phoneIcon = faPhone;
  directionsIcon = faDirections;
  shareIcon = faShareAlt;
  parkingIcon = faParking;
  wifiIcon = faWifi;
  restaurantIcon = faUtensils;
  shopIcon = faShoppingBag;
  calendarIcon = faCalendar;
  chevronLeftIcon = faChevronLeft;
  chevronRightIcon = faChevronRight;
  golfIcon = faGolfBall;

  // Course Details
  course: Course = {
    id: 1,
    name: 'Aldenham - Church Course',
    lane: 'Church Ln',
    address: 'Aldenham, Radlett',
    code: 'WD25 8NN',
    timing: 'Weekends from 11am',
    phone: '01923 853929',
    website: '#',
    imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    location: {
      lat: 51.6754,
      lng: -0.3169
    },
    amenities: ['WiFi', 'Parking', 'Restaurant', 'Pro Shop']
  };

  // Map URL
  mapUrl: SafeResourceUrl;

  // Booking State
  participantCount: number = 1;
  maxParticipants: number = 4;
  selectedDate: Date;
  selectedTime: string | null = null;
  availableDates: Date[] = [];
  timeSlotsByDate: Map<string, TimeSlot[]> = new Map();
  currentTimeSlots: TimeSlot[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  initialLoad: boolean = true;
  basePrice: number = 35; // Base price for 9 holes

  // Tee Selection
  selectedTee: '9' | '18' | null = null;

  // Calendar State
  showCalendar: boolean = false;
  currentDate: Date = new Date();
  weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    this.selectedDate = new Date();
    this.selectedDate.setHours(0, 0, 0, 0);
    const osmUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752641776%2C0.00030577182769775396%2C51.478569861898606&layer=mapnik';
    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(osmUrl);
  }

  ngOnInit() {
    this.generateAvailableDates();
    this.initializeTimeSlots();
    this.generateCalendarDays();
  }

  private generateAvailableDates(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.availableDates = Array.from({ length: 8 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date;
    });
  }

  private initializeTimeSlots(): void {
    this.availableDates.forEach(date => {
      const dateKey = this.getDateKey(date);
      const timeSlots = this.generateTimeSlotsForDate(date);
      this.timeSlotsByDate.set(dateKey, timeSlots);
    });

    this.updateCurrentTimeSlots(this.selectedDate);
    this.initialLoad = false;
  }

  private generateTimeSlotsForDate(date: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const isToday = this.isToday(date);  // Use the public isToday method
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
          continue;
        }

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          available: Math.random() > 0.3
        });
      }
    }

    return slots;
  }

  private updateCurrentTimeSlots(date: Date): void {
    const dateKey = this.getDateKey(date);
    this.currentTimeSlots = this.timeSlotsByDate.get(dateKey) || [];

    if (!this.initialLoad) {
      this.selectedTime = null;
    }
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  isDateSelected(date: Date): boolean {
    return this.getDateKey(date) === this.getDateKey(this.selectedDate);
  }

  selectDate(date: Date): void {
    this.selectedDate = date;
    this.updateCurrentTimeSlots(date);
    this.showCalendar = false;
  }

  selectTime(time: string): void {
    this.selectedTime = time;
  }

  incrementParticipants(): void {
    if (this.participantCount < this.maxParticipants) {
      this.participantCount++;
    }
  }

  decrementParticipants(): void {
    if (this.participantCount > 1) {
      this.participantCount--;
    }
  }

  selectTee(tee: '9' | '18'): void {
    this.selectedTee = tee;
    // Update total price calculation
    this.calculatePrice();
  }

  canBook(): boolean {
    return !!this.selectedTime &&
           !!this.selectedTee &&
           this.participantCount > 0 &&
           this.participantCount <= this.maxParticipants;
  }

  formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  }

  calculatePrice(): number {
    const baseAmount = this.participantCount * this.basePrice;
    return this.selectedTee === '18' ? baseAmount * 1.8 : baseAmount;
  }

  // Calendar Methods
  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
    if (this.showCalendar) {
      this.generateCalendarDays();
    }
  }

  generateCalendarDays(): void {
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    
    const firstDayToShow = new Date(firstDay);
    firstDayToShow.setDate(firstDayToShow.getDate() - firstDay.getDay());
    
    const lastDayToShow = new Date(lastDay);
    lastDayToShow.setDate(lastDayToShow.getDate() + (6 - lastDay.getDay()));
    
    this.calendarDays = [];
    let currentDay = new Date(firstDayToShow);
    
    while (currentDay <= lastDayToShow) {
      this.calendarDays.push({
        date: new Date(currentDay),
        otherMonth: currentDay.getMonth() !== this.currentDate.getMonth()
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1);
    this.generateCalendarDays();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
    this.generateCalendarDays();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isDayAvailable(date: Date): boolean {
    return this.availableDates.some(availableDate => 
      availableDate.getDate() === date.getDate() &&
      availableDate.getMonth() === date.getMonth() &&
      availableDate.getFullYear() === date.getFullYear()
    );
  }

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const booking: Booking = {
        date: this.selectedDate,
        time: this.selectedTime!,
        participants: this.participantCount,
        course: this.course.name,
        totalPrice: this.calculatePrice(),
        holes: this.selectedTee === '18' ? 18 : 9
      };

      console.log('Booking details:', booking);
      alert('Booking successful!');
      this.resetForm();
    } catch (error) {
      console.error('Booking failed:', error);
      this.errorMessage = 'Failed to book tee time. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private resetForm(): void {
    this.selectedTime = null;
    this.selectedTee = null;
    this.participantCount = 1;
  }

  getDirections(): void {
    const query = encodeURIComponent(`${this.course.name} ${this.course.address}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    window.open(url, '_blank');
  }

  async shareLocation(): Promise<void> {
    const shareData = {
      title: this.course.name,
      text: `Check out ${this.course.name} at ${this.course.address}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        this.copyToClipboard(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  private copyToClipboard(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      alert('Location details copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    document.body.removeChild(textarea);
  }

  handleMapError(event: ErrorEvent): void {
    console.error('Map loading error:', event);
    this.errorMessage = 'Failed to load map. Please try again later.';
  }
}
