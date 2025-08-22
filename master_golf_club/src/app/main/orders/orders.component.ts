import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CollectionService } from '../common-service/collection/collection.service';
import { 
  faCalendarAlt, faSpinner, faExclamationTriangle, faTimes,
  faCheckCircle, faUsers, faInfoCircle, faEye, faPlus
} from '@fortawesome/free-solid-svg-icons';

interface Booking {
  id: number;
  booking_id: string;
  memberName: string;
  memberFullName?: string;
  courseName: string;
  course?: number;
  tee?: number;
  bookingDate: string;
  endTime?: string;
  participants: number;
  status: string;
  is_join_request: boolean;
  originalBookingInfo?: any;
  originalBookingId?: number;
  joinRequests?: Booking[];
  canCancel?: boolean;
  slotStatus?: string;
  availableSpots?: number;
  slotParticipantCount?: number;
  canJoinSlot?: boolean;
  teeInfo?: string;
  formattedDate?: string;
  isSlotFull?: boolean;
  canAcceptMoreParticipants?: boolean;
  hasMultipleSlots?: boolean;
  isMultiSlotBooking?: boolean;
  totalParticipants?: number;
  booking_time?: string;
  teeName?: string;
  slot_status?: string;
  slot_order?: number;
  slotDate?: string;
  createdAt?: string;
  slots?: Array<{
    id: number;
    tee: number;
    teeInfo: string;
    teeName?: string;
    courseName?: string;
    booking_time: string;
    participants: number;
    slot_order: number;
    slot_status: string;
    endTime: string;
    slot_date?: string;
    created_at?: string;
    formatted_created_date?: string;
  }>;
  earliestTime?: string;
  latestTime?: string;
  teeSummary?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  createdAt: string;
  relatedBookingInfo?: any;
  related_booking?: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
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
  
  bookings: Booking[] = [];
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  errorMessage = '';
  selectedBooking: Booking | null = null;
  showBookingDetails = false;
  selectedBookingForParticipants: Booking | null = null;
  showParticipantModal = false;
  requestedParticipants = 1;

  // Filter state
  selectedStatusFilter: string = 'all';
  statusFilters = [
    { value: 'all', label: 'All Bookings', count: 0 },
    { value: 'confirmed', label: 'Confirmed', count: 0 },
    { value: 'pending_approval', label: 'Pending Requests', count: 0 },
    { value: 'approved', label: 'Requests Accepted', count: 0 },
    { value: 'cancelled', label: 'Cancelled', count: 0 }
  ];

  // Icons
  calendarIcon = faCalendarAlt;
  spinnerIcon = faSpinner;
  exclamationTriangleIcon = faExclamationTriangle;
  timesIcon = faTimes;
  checkCircleIcon = faCheckCircle;
  usersIcon = faUsers;
  infoIcon = faInfoCircle;
  eyeIcon = faEye;
  plusIcon = faPlus;

  constructor(
    private collectionService: CollectionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadBookings();
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Check if redirected from notification
    this.checkNotificationRedirect();
  }

  private checkNotificationRedirect() {
    this.route.queryParams.subscribe(params => {
      const notificationId = params['notification'];
      if (notificationId) {
        this.handleNotificationClick(parseInt(notificationId));
        // Clear the query parameter
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  async loadBookings() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      console.log('Loading bookings...');
      const response = await this.collectionService.getBookings();
      console.log('Bookings response:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        let rawBookings: any[] = [];
        
        // Check if response.data is an array (direct API response)
        if (Array.isArray(response.data)) {
          console.log('Raw booking data from API (array format):', response.data);
          rawBookings = response.data;
        } 
        // Check if response.data has the expected code/data structure
        else if (response.data.code === 1) {
          console.log('Raw booking data from API (code/data format):', response.data.data);
          rawBookings = response.data.data;
        } else {
          console.error('API returned error code:', response.data.code);
          this.errorMessage = response.data.message || 'Failed to load bookings';
          return;
        }

        // Process bookings to handle multi-slot structure
        this.bookings = [];
        
        for (const booking of rawBookings) {
          console.log('Processing booking:', booking);
          console.log('Booking slots:', booking.slots);
          console.log('Booking teeInfo:', booking.teeInfo);
          console.log('Booking teeName:', booking.teeName);
          console.log('Booking booking_time:', booking.booking_time);
          console.log('Booking slotDate:', booking.slotDate);
          
          if (booking.slots && booking.slots.length > 0) {
            // Create a separate row for each slot
            for (let i = 0; i < booking.slots.length; i++) {
              const slot = booking.slots[i];
              const slotBooking = {
                ...booking,
                id: `${booking.id}-slot-${i + 1}`, // Create unique ID for display
                originalBookingId: booking.id, // Keep reference to original booking
                slotIndex: i,
                // Override with slot-specific data
                tee: slot.tee,
                teeInfo: slot.teeInfo || `Tee ${slot.tee || 'Unknown'}`,
                teeName: slot.teeName || `Tee ${slot.tee || 'Unknown'}`,
                booking_time: slot.booking_time || 'Time not specified',
                participants: slot.participants,
                slot_status: slot.slot_status,
                slot_order: slot.slot_order,
                endTime: slot.endTime,
                slot_date: slot.slot_date, // Add slot date
                // Mark as multi-slot
                hasMultipleSlots: booking.slots.length > 1,
                isMultiSlotBooking: true,
                totalSlots: booking.slots.length,
                slotNumber: i + 1,
                // Format display data - use created_at as booked date
                formattedDate: this.formatDate(slot.created_at || slot.formatted_created_date || booking.bookingDate || booking.formattedDate),
                canCancel: this.canCancelBooking(booking),
                canJoinSlot: this.canJoinSlot(booking)
              };
              
              console.log('Created slot booking:', slotBooking);
              this.bookings.push(slotBooking);
            }
          } else {
            // Single slot or no slots - create single row
            const processedBooking = {
              ...booking,
              // For single bookings, use the main booking data
              teeInfo: booking.teeInfo || `Tee ${booking.tee || 'Unknown'}`,
              teeName: booking.teeName || `Tee ${booking.tee || 'Unknown'}`,
              booking_time: booking.booking_time || booking.bookingTime || 'Time not specified',
              slot_date: booking.slotDate || booking.bookingDate,
              participants: booking.participants,
              formattedDate: this.formatDate(booking.createdAt || booking.bookingDate || booking.formattedDate),
              canCancel: this.canCancelBooking(booking),
              canJoinSlot: this.canJoinSlot(booking),
              hasMultipleSlots: false,
              isMultiSlotBooking: false,
              totalSlots: 1,
              slotNumber: 1
            };
            
            console.log('Created single booking:', processedBooking);
            this.bookings.push(processedBooking);
          }
        }
        
        console.log('Final processed bookings:', this.bookings);
        
        // Debug: Show specific fields for each booking
        this.bookings.forEach((booking, index) => {
          console.log(`Booking ${index + 1}:`, {
            id: booking.id,
            teeInfo: booking.teeInfo,
            teeName: booking.teeName,
            booking_time: booking.booking_time,
            formattedDate: booking.formattedDate
          });
        });
        
        this.updateStatusFilterCounts();
      } else {
        console.error('Invalid response format:', response);
        this.errorMessage = 'Invalid response from server';
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.errorMessage = 'Failed to load bookings. Please check your connection.';
    } finally {
      this.isLoading = false;
    }
  }

  async loadNotifications() {
    try {
      const response = await this.collectionService.getNotifications();
      console.log('Notifications response:', response);
      
      if (response && response.data) {
        // Check if response.data is an array (direct API response)
        if (Array.isArray(response.data)) {
          console.log('Raw notifications data from API (array format):', response.data);
          this.notifications = response.data;
        } 
        // Check if response.data has the expected code/data structure
        else if (response.data.code === 1) {
          console.log('Raw notifications data from API (code/data format):', response.data.data);
          this.notifications = response.data.data;
        } else {
          console.error('Failed to load notifications:', response);
        }
      } else {
        console.error('Invalid notifications response:', response);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async loadUnreadCount() {
    try {
      const response = await this.collectionService.getUnreadNotificationCount();
      console.log('Unread count response:', response);
      
      if (response && response.data) {
        // Check if response.data has the expected code/data structure
        if (response.data.code === 1) {
          this.unreadCount = response.data.data.unread_count;
        } 
        // Check if response.data is a direct number or object
        else if (typeof response.data === 'number') {
          this.unreadCount = response.data;
        } else if (response.data.unread_count !== undefined) {
          this.unreadCount = response.data.unread_count;
        } else {
          console.error('Failed to load unread count:', response);
        }
      } else {
        console.error('Invalid unread count response:', response);
      }
    } catch (error) {
      console.error('Error loading unread notification count:', error);
    }
  }

  // Update status filter counts
  private updateStatusFilterCounts() {
    this.statusFilters.forEach(filter => {
      if (filter.value === 'all') {
        filter.count = this.bookings.length;
      } else {
        filter.count = this.bookings.filter(booking => booking.status === filter.value).length;
      }
    });
  }

  // Filter bookings by status
  getFilteredBookings(): Booking[] {
    if (this.selectedStatusFilter === 'all') {
      return this.bookings;
    }
    return this.bookings.filter(booking => booking.status === this.selectedStatusFilter);
  }

  // Get booking statistics
  getBookingStatistics() {
    const totalBookings = this.bookings.length;
    const confirmed = this.bookings.filter(b => b.status === 'confirmed').length;
    const pendingRequests = this.bookings.filter(b => b.status === 'pending_approval').length;
    const requestsAccepted = this.bookings.filter(b => b.status === 'approved').length;
    const cancelled = this.bookings.filter(b => b.status === 'cancelled').length;
    const acceptRejectActions = this.bookings.filter(b => 
      b.status === 'pending_approval' && b.is_join_request
    ).length;

    return {
      totalBookings,
      confirmed,
      pendingRequests,
      requestsAccepted,
      acceptRejectActions,
      cancelled
    };
  }

  // Format date for display
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  // Check if booking can be cancelled
  canCancelBooking(booking: Booking): boolean {
    // Only allow cancellation of confirmed bookings that are not join requests
    return booking.status === 'confirmed' && !booking.is_join_request;
  }

  // Check if slot can accept more participants
  canJoinSlot(booking: Booking): boolean {
    // Only allow joining slots that are not full and are confirmed
    return booking.status === 'confirmed' && 
           !(booking.isSlotFull ?? false) && 
           (booking.canAcceptMoreParticipants ?? false);
  }

  // Get action text for booking
  getActionText(booking: Booking): string {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      return 'Add Participants';
    }
    return 'View Details';
  }

  // Get action icon for booking
  getActionIcon(booking: Booking): any {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      return this.plusIcon;
    }
    return this.eyeIcon;
  }

  // Handle action button click
  handleActionClick(booking: Booking) {
    if (booking.status === 'confirmed' && !booking.isSlotFull && booking.canAcceptMoreParticipants) {
      this.openParticipantModal(booking);
    } else {
      this.viewBookingDetails(booking);
    }
  }

  // View booking details
  viewBookingDetails(booking: Booking) {
    this.selectedBooking = booking;
    this.showBookingDetails = true;
  }

  // Close booking details
  closeBookingDetails() {
    this.showBookingDetails = false;
    this.selectedBooking = null;
  }

  // Open participant modal
  openParticipantModal(booking: Booking) {
    this.selectedBookingForParticipants = booking;
    this.requestedParticipants = 1;
    this.showParticipantModal = true;
  }

  // Close participant modal
  closeParticipantModal() {
    this.showParticipantModal = false;
    this.selectedBookingForParticipants = null;
    this.requestedParticipants = 1;
  }

  // Increment participants
  incrementParticipants() {
    if (this.selectedBookingForParticipants) {
      const maxAllowed = Math.min(
        this.selectedBookingForParticipants.availableSpots || 4, 
        4
      );
      if (this.requestedParticipants < maxAllowed) {
        this.requestedParticipants++;
      }
    }
  }

  // Decrement participants
  decrementParticipants() {
    if (this.requestedParticipants > 1) {
      this.requestedParticipants--;
    }
  }

  // Confirm adding participants
  async confirmAddParticipants() {
    if (!this.selectedBookingForParticipants) return;

    try {
      // This would typically call an API to add participants
      // For now, we'll just close the modal
      this.closeParticipantModal();
      
      // Reload bookings to reflect changes
      await this.loadBookings();
    } catch (error) {
      console.error('Error adding participants:', error);
    }
  }

  // Handle notification click
  handleNotificationClick(notificationId: number) {
    // Mark notification as read
    this.markNotificationAsRead(notificationId);
    
    // Find the related booking
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && notification.related_booking) {
      // Highlight the related booking (could scroll to it or show details)
      const relatedBooking = this.bookings.find(b => b.id === notification.related_booking);
      if (relatedBooking) {
        this.viewBookingDetails(relatedBooking);
      }
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number) {
    try {
      await this.collectionService.markNotificationAsRead(notificationId);
      
      // Update local state
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_read = true;
      }
      
      // Reload unread count
      await this.loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Get status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'approved':
        return 'status-approved';
      case 'pending_approval':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  // Get status display text
  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'approved':
        return 'Approved';
      case 'pending_approval':
        return 'Pending Approval';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  // Filter change handler
  onStatusFilterChange(filterValue: string) {
    this.selectedStatusFilter = filterValue;
  }

  // Refresh data
  async refreshData() {
    await Promise.all([
      this.loadBookings(),
      this.loadNotifications(),
      this.loadUnreadCount()
    ]);
  }

  // Statistics methods for dashboard
  getTotalBookings(): number {
    return this.bookings.length;
  }

  getConfirmedBookings(): number {
    return this.bookings.filter(booking => booking.status === 'confirmed').length;
  }

  getPendingBookings(): number {
    return this.bookings.filter(booking => booking.status === 'pending_approval').length;
  }

  getJoinRequests(): number {
    return this.bookings.filter(booking => booking.is_join_request).length;
  }

  getCancelledBookings(): number {
    return this.bookings.filter(booking => booking.status === 'cancelled').length;
  }

  getGroupedBookings(): Booking[] {
    // For now, return all bookings as individual rows
    // This can be enhanced later to group by booking ID if needed
    return this.bookings;
  }
}
