import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CollectionService } from '../common-service/collection/collection.service';

interface Booking {
  id: number;
  booking_id: string;
  memberName: string;
  memberFullName?: string;
  courseName: string;
  bookingDate: string;
  bookingTime: string;
  endTime?: string;
  participants: number;
  status: string;
  is_join_request: boolean;
  originalBookingInfo?: any;
  joinRequests?: Booking[];
  canCancel?: boolean;
  slotStatus?: string;
  availableSpots?: number;
  slotParticipantCount?: number;
  canJoinSlot?: boolean;
  totalPrice?: number;
  teeInfo?: string;
  formattedDate?: string;
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
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  showModal = false;
  selectedOrderId: string | null = null;
  bookings: Booking[] = [];
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  errorMessage = '';
  selectedBooking: Booking | null = null;
  showBookingDetails = false;

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
    try {
      const response = await this.collectionService.getBookings();
      if (response && response.data && response.data.code === 1) {
        this.bookings = response.data.data.map((booking: any) => ({
          ...booking,
          formattedDate: this.formatDate(booking.bookingDate),
          canCancel: this.canCancelBooking(booking),
          canJoinSlot: this.canJoinSlot(booking)
        }));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.errorMessage = 'Failed to load bookings';
    } finally {
      this.isLoading = false;
    }
  }

  async loadNotifications() {
    try {
      const response = await this.collectionService.getNotifications();
      if (response && response.data && response.data.code === 1) {
        this.notifications = response.data.data;
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  async loadUnreadCount() {
    try {
      const response = await this.collectionService.getUnreadNotificationCount();
      if (response && response.data && response.data.code === 1) {
        this.unreadCount = response.data.data.unread_count;
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
      await this.collectionService.approveJoinRequest(bookingId, joinRequestId);
      this.loadBookings(); // Reload bookings to update status
      this.showSuccessMessage('Join request approved successfully');
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      case 'pending_approval': return 'status-pending-approval';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      case 'pending_approval': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  viewBill(orderId: string) {
    this.selectedOrderId = orderId;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedOrderId = null;
  }

  downloadBill(orderId: string) {
    alert(`Downloading PDF bill for Order ID: ${orderId}`);
    // Here you would add logic to generate or fetch the PDF for download
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
}
