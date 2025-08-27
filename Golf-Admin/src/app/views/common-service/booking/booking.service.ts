import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

// Interfaces for booking management
interface BookingStatistics {
  totalBookings: number;
  confirmedBookings: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledBookings: number;
  todaysBookings: number;
  activeCourses: number;
}

interface BookingFilters {
  status?: string;
  course?: number;
  tee?: number;
  dateFrom?: string;
  dateTo?: string;
  member?: string;
  bookingId?: string;
  participants?: number;
  page?: number;
  pageSize?: number;
}

interface BookingDetail {
  id: number;
  booking_id: string;
  type: 'BOOKING' | 'REQUEST';
  member: any;
  bookedDate: string;
  course: any;
  tee: any;
  slotDate: string;
  slotTime: string;
  participants: number;
  status: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);

    // Course Management endpoints (admin)
    this.lists = this.apiUrl + "course/0/listing/";
    this.processing = this.apiUrl + "course/0/processing/";
    this.deletion = this.apiUrl + "course/0/deletion/";
  }

  // Course Management Methods (Admin)
  listCourse(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processCourse(data: any, id: string = '0') {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    return axios.post(this.processing.replace('0', id), data, config);
  }

  deleteCourse(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  // ==================== BOOKING MANAGEMENT METHODS ====================

  // Get comprehensive booking statistics for dashboard cards
  getBookingStatistics() {
    // For admin, we'll calculate statistics from the booking data
    return this.getAllBookings();
  }

  // Get all bookings with filtering and pagination - Admin version
  getAllBookings(filters?: BookingFilters) {
    const config: any = {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    };
    
    if (filters) {
      config.params = filters;
    }
    
    // Use admin-specific endpoint that shows all bookings across all members
    return axios.get<any>(`${this.apiUrl}booking/admin/all-bookings/`, config);
  }

  // Get all join requests for admin
  getAllJoinRequestsAdmin(filters?: BookingFilters) {
    const config: any = {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    };
    
    if (filters) {
      config.params = filters;
    }
    
    // Use admin-specific endpoint that shows all join requests across all members
    return axios.get<any>(`${this.apiUrl}joinRequest/admin/all-requests/`, config);
  }

  // Get bookings by specific status
  getBookingsByStatus(status: string, filters?: BookingFilters) {
    const config = this.getAuthConfig();
    const params = { status, ...filters };
    config.params = params;
    return axios.get(`${this.apiUrl}orders/by_status/`, config);
  }

  // Get detailed booking information
  getBookingDetails(bookingId: string) {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}booking/${bookingId}/details/`, config);
  }

  // Get all join requests
  getAllJoinRequests(filters?: BookingFilters) {
    const config = this.getAuthConfig();
    if (filters) {
      config.params = filters;
    }
    return axios.get(`${this.apiUrl}joinRequest/`, config);
  }

  // Get incoming join requests (for original bookers)
  getIncomingJoinRequests(filters?: BookingFilters) {
    const config = this.getAuthConfig();
    if (filters) {
      config.params = filters;
    }
    return axios.get(`${this.apiUrl}joinRequest/incoming_requests/`, config);
  }

  // Get outgoing join requests (requests made by members)
  getOutgoingJoinRequests(filters?: BookingFilters) {
    const config = this.getAuthConfig();
    if (filters) {
      config.params = filters;
    }
    return axios.get(`${this.apiUrl}joinRequest/outgoing_requests/`, config);
  }

  // Get join request statistics
  getJoinRequestStatistics() {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}joinRequest/statistics/`, config);
  }

  // Get pending review requests
  getPendingReviewRequests() {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}orders/pending_review/`, config);
  }

  // Admin actions for bookings
  cancelBooking(bookingId: string, reason?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}booking/${bookingId}/cancel/`, { reason }, config);
  }

  // Admin actions for join requests
  approveJoinRequest(requestId: number, notes?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}joinRequest/${requestId}/approve/`, { notes }, config);
  }

  rejectJoinRequest(requestId: number, notes?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}joinRequest/${requestId}/reject/`, { notes }, config);
  }

  // Bulk operations
  bulkCancelBookings(bookingIds: string[], reason?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}booking/bulk_cancel/`, { booking_ids: bookingIds, reason }, config);
  }

  bulkApproveRequests(requestIds: number[]) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}joinRequest/bulk_approve/`, { request_ids: requestIds }, config);
  }

  bulkRejectRequests(requestIds: number[], reason?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}joinRequest/bulk_reject/`, { request_ids: requestIds, reason }, config);
  }

  // Export functionality - Client-side CSV generation for admin
  async exportBookings(filters?: BookingFilters, format: 'csv' | 'excel' = 'csv') {
    try {
      // Get the booking data from admin endpoint
      const response = await this.getAllBookings(filters);
      const bookings = response.data?.data || response.data || [];
      
      // Generate CSV content
      const csvContent = this.generateBookingsCSV(bookings);
      
      // Create blob and return for download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return { data: blob };
    } catch (error) {
      throw error;
    }
  }

  async exportJoinRequests(filters?: BookingFilters, format: 'csv' | 'excel' = 'csv') {
    try {
      // Get the join request data from admin endpoint
      const response = await this.getAllJoinRequestsAdmin(filters);
      const requests = response.data?.data || response.data || [];
      
      // Generate CSV content
      const csvContent = this.generateJoinRequestsCSV(requests);
      
      // Create blob and return for download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return { data: blob };
    } catch (error) {
      throw error;
    }
  }

  // Helper method to generate CSV for bookings
  private generateBookingsCSV(bookings: any[]): string {
    const headers = [
      'Booking ID',
      'Member Name',
      'Member ID',
      'Course',
      'Tee',
      'Date',
      'Time',
      'Participants',
      'Status',
      'Created At'
    ];
    
    const csvRows = [headers.join(',')];
    
    bookings.forEach(booking => {
      const row = [
        booking.booking_id || '',
        `"${booking.memberFullName || booking.memberName || ''}"`,
        booking.memberGolfClubId || '',
        `"${booking.courseName || ''}"`,
        `"${booking.teeInfo || ''}"`,
        booking.slot_date || '',
        booking.booking_time || '',
        booking.participants || 0,
        booking.status || '',
        booking.createdAt || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  // Helper method to generate CSV for join requests
  private generateJoinRequestsCSV(requests: any[]): string {
    const headers = [
      'Request ID',
      'Requester Name',
      'Requester ID',
      'Course',
      'Tee',
      'Date',
      'Time',
      'Participants',
      'Status',
      'Created At'
    ];
    
    const csvRows = [headers.join(',')];
    
    requests.forEach(request => {
      const row = [
        request.request_id || '',
        `"${request.requesterName || ''}"`,
        request.requesterMemberId || '',
        `"${request.courseName || ''}"`,
        `"${request.tee || ''}"`,
        request.slotDate || '',
        request.slotTime || '',
        request.participants || 0,
        request.status || '',
        request.createdAt || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }

  // Search functionality - Use admin endpoints with client-side filtering
  async searchBookings(query: string, filters?: BookingFilters) {
    try {
      // Get all bookings and filter client-side
      const response = await this.getAllBookings(filters);
      const bookings = response.data?.data || response.data || [];
      
      // Filter bookings based on query
      const filteredBookings = bookings.filter((booking: any) => {
        const searchText = query.toLowerCase();
        return (
          booking.booking_id?.toLowerCase().includes(searchText) ||
          booking.memberFullName?.toLowerCase().includes(searchText) ||
          booking.memberName?.toLowerCase().includes(searchText) ||
          booking.courseName?.toLowerCase().includes(searchText) ||
          booking.memberGolfClubId?.toLowerCase().includes(searchText)
        );
      });
      
      return {
        data: {
          code: 1,
          message: 'Search results retrieved successfully',
          data: filteredBookings
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async searchJoinRequests(query: string, filters?: BookingFilters) {
    try {
      // Get all join requests and filter client-side
      const response = await this.getAllJoinRequestsAdmin(filters);
      const requests = response.data?.data || response.data || [];
      
      // Filter requests based on query
      const filteredRequests = requests.filter((request: any) => {
        const searchText = query.toLowerCase();
        return (
          request.request_id?.toLowerCase().includes(searchText) ||
          request.requesterName?.toLowerCase().includes(searchText) ||
          request.courseName?.toLowerCase().includes(searchText) ||
          request.requesterMemberId?.toLowerCase().includes(searchText)
        );
      });
      
      return {
        data: {
          code: 1,
          message: 'Search results retrieved successfully',
          data: filteredRequests
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Course and tee data for filters
  getCoursesForFilter() {
    return axios.get(`${this.apiUrl}collection/list_courses/`);
  }

  getTeesByCourse(courseId: number) {
    return axios.get(`${this.apiUrl}tee/by_course/`, { params: { course_id: courseId } });
  }

  // Member search for filters
  searchMembers(query: string) {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}member/search/`, { ...config, params: { q: query } });
  }

  // Notification management
  getBookingNotifications() {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}notification/`, config);
  }

  markNotificationAsRead(notificationId: number) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}notification/${notificationId}/mark_as_read/`, {}, config);
  }

  // Real-time updates
  getRecentBookingActivity(limit: number = 10) {
    const config = this.getAuthConfig();
    return axios.get(`${this.apiUrl}orders/recent_activity/`, { ...config, params: { limit } });
  }

  // Slot availability for admin
  getSlotAvailability(courseId: number, date: string, teeId?: number) {
    const config = this.getAuthConfig();
    const params: any = { course_id: courseId, date };
    if (teeId) params.tee_id = teeId;
    config.params = params;
    return axios.get(`${this.apiUrl}booking/available_slots/`, config);
  }

  // Admin slot management
  blockSlot(courseId: number, teeId: number, date: string, time: string, reason?: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}booking/block_slot/`, {
      course_id: courseId,
      tee_id: teeId,
      date,
      time,
      reason
    }, config);
  }

  unblockSlot(courseId: number, teeId: number, date: string, time: string) {
    const config = this.getAuthConfig();
    return axios.post(`${this.apiUrl}booking/unblock_slot/`, {
      course_id: courseId,
      tee_id: teeId,
      date,
      time
    }, config);
  }

  // Helper method to get auth configuration
  private getAuthConfig(): any {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

}
