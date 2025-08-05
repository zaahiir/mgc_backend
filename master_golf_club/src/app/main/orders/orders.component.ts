import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../common-service/collection/collection.service';

interface Booking {
  id: number;
  courseName: string;
  bookingDate: string;
  bookingTime: string;
  participants: number;
  status: string;
  is_join_request: boolean;
  originalBookingInfo?: any;
  joinRequests?: Booking[];
}

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  createdAt: string;
  relatedBookingInfo?: any;
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

  constructor(private collectionService: CollectionService) {}

  ngOnInit() {
    this.loadBookings();
    this.loadNotifications();
    this.loadUnreadCount();
  }

  async loadBookings() {
    this.isLoading = true;
    try {
      const response = await this.collectionService.getBookings();
      if (response && response.data && response.data.code === 1) {
        this.bookings = response.data.data;
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
      // Reload notifications and unread count
      this.loadNotifications();
      this.loadUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async approveJoinRequest(bookingId: number, joinRequestId: number) {
    try {
      await this.collectionService.approveJoinRequest(bookingId, joinRequestId);
      this.loadBookings(); // Reload bookings to update status
    } catch (error) {
      console.error('Error approving join request:', error);
    }
  }

  async rejectJoinRequest(bookingId: number, joinRequestId: number) {
    try {
      await this.collectionService.rejectJoinRequest(bookingId, joinRequestId);
      this.loadBookings(); // Reload bookings to update status
    } catch (error) {
      console.error('Error rejecting join request:', error);
    }
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
}
