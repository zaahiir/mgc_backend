import { Component, OnInit } from '@angular/core';
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
  faShoppingBag
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
  guests: number;
  course: string;
  totalPrice: number;
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
  guestCount: number = 1;
  maxGuests: number = 4;
  selectedDate: Date;
  selectedTime: string | null = null;
  availableDates: Date[] = [];
  timeSlotsByDate: Map<string, TimeSlot[]> = new Map();
  currentTimeSlots: TimeSlot[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  initialLoad: boolean = true;
  basePrice: number = 50;

  constructor(
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {
    // Initialize selectedDate to today
    this.selectedDate = new Date();
    this.selectedDate.setHours(0, 0, 0, 0);

    // Initialize mapUrl with OpenStreetMap
    const osmUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752641776%2C0.00030577182769775396%2C51.478569861898606&layer=mapnik';

    this.mapUrl = this.sanitizer.bypassSecurityTrustResourceUrl(osmUrl);
  }

  ngOnInit(): void {
    this.generateAvailableDates();
    this.initializeTimeSlots();
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
    // Generate time slots for each available date
    this.availableDates.forEach(date => {
      const dateKey = this.getDateKey(date);
      const timeSlots = this.generateTimeSlotsForDate(date);
      this.timeSlotsByDate.set(dateKey, timeSlots);
    });

    // Set current time slots to today's slots
    this.updateCurrentTimeSlots(this.selectedDate);
    this.initialLoad = false;
  }

  private generateTimeSlotsForDate(date: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const isToday = this.isToday(date);
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();

    // Generate slots from 7 AM to 7 PM
    for (let hour = 7; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // Skip past times if it's today
        if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
          continue;
        }

        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          available: Math.random() > 0.3 // Simulate availability
        });
      }
    }

    return slots;
  }

  private updateCurrentTimeSlots(date: Date): void {
    const dateKey = this.getDateKey(date);
    this.currentTimeSlots = this.timeSlotsByDate.get(dateKey) || [];

    if (!this.initialLoad) {
      this.selectedTime = null; // Reset selected time when date changes, but not on initial load
    }
  }

  // Helper functions
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isDateSelected(date: Date): boolean {
    return this.getDateKey(date) === this.getDateKey(this.selectedDate);
  }

  // Event handlers
  selectDate(date: Date): void {
    this.selectedDate = date;
    this.updateCurrentTimeSlots(date);
  }

  selectTime(time: string): void {
    this.selectedTime = time;
  }

  incrementGuests(): void {
    if (this.guestCount < this.maxGuests) {
      this.guestCount++;
    }
  }

  decrementGuests(): void {
    if (this.guestCount > 1) {
      this.guestCount--;
    }
  }

  canBook(): boolean {
    return !!this.selectedTime &&
           this.guestCount > 0 &&
           this.guestCount <= this.maxGuests;
  }

  formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
  }

  calculatePrice(): number {
    return this.guestCount * this.basePrice;
  }

  async bookTeeTime(): Promise<void> {
    if (!this.canBook()) return;

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const booking: Booking = {
        date: this.selectedDate,
        time: this.selectedTime!,
        guests: this.guestCount,
        course: this.course.name,
        totalPrice: this.calculatePrice()
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
    this.guestCount = 1;
  }

  // Map and sharing functionality
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

  // Error handling
  handleMapError(event: ErrorEvent): void {
    console.error('Map loading error:', event);
    this.errorMessage = 'Failed to load map. Please try again later.';
  }
}
