import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CollectionService } from '../common-service/collection/collection.service';
import { 
  faCalendarAlt, faSpinner, faExclamationTriangle, faTimes,
  faCheckCircle, faUsers, faInfoCircle
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
  // Remove bookingTime since it's now in slots
  // bookingTime: string;
  endTime?: string;
  participants: number;
  status: string;
  is_join_request: boolean;
  originalBookingInfo?: any;
  originalBookingId?: number; // Add this property
  joinRequests?: Booking[];
  canCancel?: boolean;
  slotStatus?: string;
  availableSpots?: number;
  slotParticipantCount?: number;
  canJoinSlot?: boolean;

  teeInfo?: string;
  formattedDate?: string;
  isSlotFull?: boolean; // Added for enhanced status
  canAcceptMoreParticipants?: boolean; // Added for enhanced status
  // Multi-slot booking fields - updated for new model structure
  hasMultipleSlots?: boolean;
  isMultiSlotBooking?: boolean;
  totalParticipants?: number;
  
  // Add properties that are used in the component
  booking_time?: string;
  teeName?: string;
  slot_status?: string;
  slot_order?: number;
  
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
  }>; // Individual slots within the booking
  
  // New fields for better display
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
  imports: [CommonModule, FontAwesomeModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
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

  // Icons
  calendarIcon = faCalendarAlt;
  spinnerIcon = faSpinner;
  exclamationTriangleIcon = faExclamationTriangle;
  timesIcon = faTimes;
  checkCircleIcon = faCheckCircle;
  usersIcon = faUsers;
  infoIcon = faInfoCircle;

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
                teeInfo: slot.teeInfo || `Tee ${slot.tee}`,
                teeName: slot.teeName,
                booking_time: slot.booking_time,
                participants: slot.participants,
                slot_status: slot.slot_status,
                slot_order: slot.slot_order,
                endTime: slot.endTime,
                // Mark as multi-slot
                hasMultipleSlots: booking.slots.length > 1,
                isMultiSlotBooking: true,
                totalSlots: booking.slots.length,
                slotNumber: i + 1,
                // Format display data
                formattedDate: this.formatDate(booking.bookingDate || booking.formattedDate),
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
              formattedDate: this.formatDate(booking.bookingDate || booking.formattedDate),
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
      console.error('Error loading unread count:', error);
    }
  }

  async markNotificationAsRead(notificationId: number) {
    try {
      await this.collectionService.markNotificationAsRead(notificationId);
      this.loadNotifications();
      this.loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async handleNotificationClick(notificationId: number) {
    try {
      // Mark notification as read
      await this.markNotificationAsRead(notificationId);
      
      // Find the notification
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification && notification.related_booking) {
        // Find the related booking
        const booking = this.bookings.find(b => b.id === notification.related_booking);
        if (booking) {
          this.showBookingDetail(booking);
        }
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  async approveJoinRequest(bookingId: number, joinRequestId: number) {
    try {
      const response = await this.collectionService.approveJoinRequest(bookingId, joinRequestId);
      
      if (response && response.data && response.data.code === 1) {
        // Check if slot is now full
        const isSlotFull = response.data.data.isSlotFull;
        
        if (isSlotFull) {
          this.showSuccessMessage('Join request approved and slot is now full!');
        } else {
          this.showSuccessMessage('Join request approved successfully');
        }
        
        this.loadBookings(); // Reload bookings to update status
      } else {
        this.showErrorMessage('Failed to approve join request');
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      this.showErrorMessage('Failed to approve join request');
    }
  }

  async rejectJoinRequest(bookingId: number, joinRequestId: number) {
    try {
      await this.collectionService.rejectJoinRequest(bookingId, joinRequestId);
      this.loadBookings(); // Reload bookings to update status
      this.showSuccessMessage('Join request rejected successfully');
    } catch (error) {
      console.error('Error rejecting join request:', error);
      this.showErrorMessage('Failed to reject join request');
    }
  }

  async cancelBooking(bookingId: number) {
    if (confirm('Are you sure you want to cancel this booking?')) {
      try {
        await this.collectionService.cancelBooking(bookingId);
        this.loadBookings();
        this.showSuccessMessage('Booking cancelled successfully');
      } catch (error) {
        console.error('Error cancelling booking:', error);
        this.showErrorMessage('Failed to cancel booking');
      }
    }
  }

  showBookingDetail(booking: Booking) {
    this.selectedBooking = booking;
    this.showBookingDetails = true;
  }

  closeBookingDetail() {
    this.selectedBooking = null;
    this.showBookingDetails = false;
  }

  // Enhanced date formatting for the new structure
  formatDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short', // Changed from 'long' to 'short' for abbreviated month
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  }

  canCancelBooking(booking: Booking): boolean {
    const bookingDate = new Date(booking.bookingDate);
    const now = new Date();
    const hoursDiff = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Can cancel if booking is more than 24 hours away and status is confirmed or pending
    return hoursDiff > 24 && ['confirmed', 'pending'].includes(booking.status);
  }

  canJoinSlot(booking: Booking): boolean {
    // Logic to determine if user can join this slot
    return !!(booking.availableSpots && booking.availableSpots > 0 && booking.status === 'confirmed');
  }

  // Helper method to check if a booking can accept more participants
  canAcceptMoreParticipants(booking: Booking): boolean {
    if (!booking.availableSpots || !booking.canAcceptMoreParticipants) {
      return false;
    }
    return booking.availableSpots > 0 && booking.canAcceptMoreParticipants;
  }

  // Helper method to check if a booking slot is full
  isSlotFull(booking: Booking): boolean {
    return booking.isSlotFull || (booking.availableSpots !== undefined && booking.availableSpots <= 0);
  }

  // Helper method to get status display text
  getStatusDisplayText(booking: Booking): string {
    if (booking.is_join_request) {
      switch (booking.status) {
        case 'pending_approval':
          return 'Pending Approval';
        case 'approved':
          return 'Approved';
        case 'rejected':
          return 'Rejected';
        default:
          return booking.status;
      }
    } else {
      switch (booking.status) {
        case 'completed':
          return 'Completed';
        case 'confirmed':
          return 'Confirmed';
        case 'pending':
          return 'Pending';
        case 'cancelled':
          return 'Cancelled';
        default:
          return booking.status;
      }
    }
  }

  // Helper method to get status text (for backward compatibility)
  getStatusText(status: string): string {
    return this.getStatusDisplayText({ status } as Booking);
  }

  // Helper method to get status CSS class
  getStatusClass(booking: Booking): string {
    if (booking.is_join_request) {
      switch (booking.status) {
        case 'pending_approval':
          return 'status-pending';
        case 'approved':
          return 'status-approved';
        case 'rejected':
          return 'status-rejected';
        default:
          return 'status-default';
      }
    } else {
      switch (booking.status) {
        case 'completed':
          return 'status-completed';
        case 'confirmed':
          return 'status-confirmed';
        case 'pending':
          return 'status-pending';
        case 'cancelled':
          return 'status-cancelled';
        default:
          return 'status-default';
      }
    }
  }

  private showSuccessMessage(message: string) {
    // Implement toast or alert for success message
    alert(message);
  }

  private showErrorMessage(message: string) {
    // Implement toast or alert for error message
    alert(message);
  }

  // Helper methods for statistics
  getConfirmedBookings(): number {
    return this.bookings.filter(booking => booking.status === 'confirmed').length;
  }

  getPendingBookings(): number {
    return this.bookings.filter(booking => 
      booking.status === 'pending' || booking.status === 'pending_approval'
    ).length;
  }

  getJoinRequests(): number {
    return this.bookings.filter(booking => booking.is_join_request).length;
  }

  getBookingsWithJoinRequests(): Booking[] {
    return this.bookings.filter(booking => 
      booking.joinRequests && booking.joinRequests.length > 0
    );
  }

  getTotalBookings(): number {
    return this.bookings.length;
  }

  getCancelledBookings(): number {
    return this.bookings.filter(booking => booking.status === 'cancelled').length;
  }

  // Helper methods for multi-slot bookings
  getEarliestTime(booking: Booking): string {
    if (!booking.slots || booking.slots.length === 0) return 'N/A';
    
    const earliestSlot = booking.slots.reduce((earliest, current) => {
      const earliestTime = new Date(`2000-01-01T${earliest.booking_time}`);
      const currentTime = new Date(`2000-01-01T${current.booking_time}`);
      return currentTime < earliestTime ? current : earliest;
    });
    
    return this.formatTime(earliestSlot.booking_time);
  }

  getLatestTime(booking: Booking): string {
    if (!booking.slots || booking.slots.length === 0) return 'N/A';
    
    const latestSlot = booking.slots.reduce((latest, current) => {
      const latestTime = new Date(`2000-01-01T${latest.booking_time}`);
      const currentTime = new Date(`2000-01-01T${current.booking_time}`);
      return currentTime > latestTime ? current : latest;
    });
    
    return this.formatTime(latestSlot.booking_time);
  }

  formatTime(timeString: string): string {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  }

  // Participant Booking Modal Methods
  openParticipantBookingModal(booking: Booking) {
    this.selectedBookingForParticipants = booking;
    this.requestedParticipants = 1;
    this.showParticipantModal = true;
  }

  closeParticipantBookingModal() {
    this.showParticipantModal = false;
    this.selectedBookingForParticipants = null;
    this.requestedParticipants = 1;
  }

  incrementParticipants() {
    if (this.selectedBookingForParticipants && this.selectedBookingForParticipants.availableSpots && this.requestedParticipants < this.selectedBookingForParticipants.availableSpots) {
      this.requestedParticipants++;
    }
  }

  decrementParticipants() {
    if (this.requestedParticipants > 1) {
      this.requestedParticipants--;
    }
  }

  async confirmParticipantBooking() {
    if (!this.selectedBookingForParticipants) return;

    try {
      // Get the first slot's time for the join request
      const firstSlot = this.selectedBookingForParticipants.slots?.[0];
      if (!firstSlot) {
        this.showErrorMessage('No slots found for this booking');
        return;
      }

      // Create a new booking for the additional participants
      const bookingData = {
        course: this.selectedBookingForParticipants.course || 0,
        tee: firstSlot.tee, // Use the tee from the first slot
        bookingDate: this.selectedBookingForParticipants.bookingDate,
        bookingTime: firstSlot.booking_time, // Use the time from the first slot
        participants: this.requestedParticipants,

        is_join_request: true,
        original_booking: this.selectedBookingForParticipants.id
      };

      const response = await this.collectionService.createBooking(bookingData);
      
      if (response && response.data && response.data.code === 1) {
        this.showSuccessMessage('Participants booked successfully!');
        this.closeParticipantBookingModal();
        this.loadBookings(); // Refresh the bookings list
      } else {
        this.showErrorMessage(response?.data?.message || 'Failed to book participants');
      }
    } catch (error) {
      console.error('Error booking participants:', error);
      this.showErrorMessage('Failed to book participants. Please try again.');
    }
  }

  // Helper method to get grouped bookings for nested table display
  getGroupedBookings(): any[] {
    // Group bookings by their original booking ID
    const groupedBookings = new Map<number, any>();
    
    for (const booking of this.bookings) {
      const originalId = booking.originalBookingId || booking.id;
      
      if (!groupedBookings.has(originalId)) {
        // Create the main booking object
        const mainBooking: any = {
          ...booking,
          id: originalId,
          slots: []
        };
        
        // Add the current slot to the slots array
        if (booking.booking_time) {
          mainBooking.slots.push({
            id: booking.id,
            tee: booking.tee,
            teeInfo: booking.teeInfo,
            teeName: booking.teeName,
            booking_time: booking.booking_time,
            participants: booking.participants,
            slot_status: booking.slot_status || booking.status,
            slot_order: booking.slot_order || 1,
            endTime: booking.endTime
          });
        }
        
        groupedBookings.set(originalId, mainBooking);
      } else {
        // Add additional slots to existing booking
        if (booking.booking_time) {
          groupedBookings.get(originalId)!.slots.push({
            id: booking.id,
            tee: booking.tee,
            teeInfo: booking.teeInfo,
            teeName: booking.teeName,
            booking_time: booking.booking_time,
            participants: booking.participants,
            slot_status: booking.slot_status || booking.status,
            slot_order: booking.slot_order || 1,
            endTime: booking.endTime
          });
        }
      }
    }
    
    // Convert map to array and sort slots by slot_order
    const result = Array.from(groupedBookings.values());
    result.forEach((booking: any) => {
      if (booking.slots && booking.slots.length > 0) {
        booking.slots.sort((a: any, b: any) => (a.slot_order || 0) - (b.slot_order || 0));
      }
    });
    
    return result;
  }
}
