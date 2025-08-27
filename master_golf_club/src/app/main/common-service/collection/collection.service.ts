import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

interface SearchParams {
  page?: number;
  page_size?: number;
  q?: string;  // Added 'q' parameter for search query
  location?: string;
  amenities?: number[];
  'amenities[]'?: number[];  // Backend expects amenities[] format
  legacy?: boolean;
}

interface ListCoursesParams {
  legacy?: boolean;
  page?: number;
  page_size?: number;
}

interface Tee {
  id: number;
  courseId: number;
  courseName: string;
  holeNumber: number;
  label?: string;
  estimatedDuration: string;
}

interface BookingData {
  course: number;
  tee: number;
  slotDate: string;  // Date for this specific slot
  bookingTime: string;
  participants: number;
  status?: 'pending' | 'confirmed' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
  is_join_request?: boolean;
  original_booking?: number;
  group_id?: string;  // For grouping multi-slot bookings
}

interface MultiSlotBookingData {
  slots: Array<{
    course: number;
    tee: number;
    slotDate: string;  // Date for this specific slot
    bookingTime: string;
    participants: number;
    is_join_request?: boolean;
    original_booking?: number;
    group_id?: string;  // For grouping multi-slot bookings
  }>;
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

interface TimeSlot {
  time: string;
  available: boolean;
  formatted_time: string;
  slot_status?: 'available' | 'partially_available' | 'booked';
  available_spots?: number;
  total_participants?: number;
  bookings?: BookingDetail[];
  booking_count?: number;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  participantCount?: number; // Individual participant count for this slot
  slot_date?: string; // Date for this specific slot
  formatted_slot_date?: string; // Formatted date for display
}

interface Notification {
  id: number;
  recipient: number;
  recipientName: string;
  sender?: number;
  senderName?: string;
  notification_type: 'join_request' | 'join_approved' | 'join_rejected' | 'booking_confirmed';
  title: string;
  message: string;
  related_booking?: number;
  relatedBookingInfo?: any;
  is_read: boolean;
  is_new: boolean;
  createdAt: string;
}

interface BookingWithDetails extends BookingData {
  id: number;
  memberName: string;
  memberFullName: string;
  courseName: string;
  teeInfo: string;

  endTime: string;
  formattedDate: string;
  slotStatus: string;
  availableSpots: number;
  slotParticipantCount: number;
  canJoinSlot: boolean;
  joinRequests: BookingWithDetails[];
  originalBookingInfo?: any;
  approvedBy?: any;
  approvedAt?: string;
  isSlotFull?: boolean;
  canAcceptMoreParticipants?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
  }

  // Collection API endpoints
  listCourses(params?: ListCoursesParams) {
    const url = `${this.apiUrl}collection/list_courses/`;
    const config = { params };
    return axios.get(url, config);
  }

  searchCourses(params: SearchParams) {
    const url = `${this.apiUrl}collection/search/`;

    // Convert amenities array to amenities[] format if needed
    const searchParams: any = { ...params };
    if (params.amenities && params.amenities.length > 0) {
      searchParams['amenities[]'] = params.amenities;
      delete searchParams.amenities;
    }

    const config = { params: searchParams };
    return axios.get(url, config);
  }

  getCourseDetail(courseId: number) {
    const url = `${this.apiUrl}collection/${courseId}/course_detail/`;
    return axios.get(url);
  }

  getAmenities() {
    const url = `${this.apiUrl}amenities/collection_amenities/`;
    return axios.get(url);
  }

  // Amenities API endpoints

  // Tee Management API endpoints
  getTeesByCourse(courseId: number) {
    const url = `${this.apiUrl}tee/by_course/`;
    const config = { params: { course_id: courseId } };
    return axios.get(url, config);
  }

  // Get detailed information about a specific tee including its current bookings
  getTeeInfo(teeId: number) {
    const url = `${this.apiUrl}tee/${teeId}/tee_info/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Booking Management API endpoints
  createBooking(bookingData: BookingData) {
    const url = `${this.apiUrl}booking/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, bookingData, config);
  }

  getBookings() {
    const url = `${this.apiUrl}booking/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Get available slots for a specific course, date, and tee (tee-specific slots)
  getAvailableSlots(courseId: number, date: string, teeId: number) {
    const url = `${this.apiUrl}booking/available_slots/`;
    const config: any = { 
      params: { 
        course_id: courseId,
        date: date,
        tee_id: teeId
      } 
    };
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Get available slots with participant count for a specific course, date, and tee (tee-specific slots)
  getAvailableSlotsWithParticipants(courseId: number, date: string, teeId: number, participants: number) {
    const url = `${this.apiUrl}booking/available_slots/`;
    
    const config: any = { 
      params: { 
        course_id: courseId,
        date: date,
        tee_id: teeId,
        participants: participants
        // Removed timezone_offset as backend now uses UK time directly
      } 
    };
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }



  // Multi-slot booking method
  createMultiSlotBooking(bookingData: MultiSlotBookingData) {
    const url = `${this.apiUrl}booking/create_multi_slot_booking/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, bookingData, config);
  }





  // Notification methods
  getNotifications() {
    const url = `${this.apiUrl}notification/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  getHeaderNotifications() {
    const url = `${this.apiUrl}notification/header/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  getUnreadNotificationCount() {
    const url = `${this.apiUrl}notification/unread_count/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  markNotificationAsRead(notificationId: number) {
    const url = `${this.apiUrl}notification/${notificationId}/mark_as_read/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, {}, config);
  }

  markAllNotificationsAsRead() {
    const url = `${this.apiUrl}notification/mark_all_as_read/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, {}, config);
  }

  // Course Management API endpoints (admin)
  getCourseListing(id: string = '0') {
    const url = `${this.apiUrl}course/${id}/listing/`;
    return axios.get(url);
  }

  processCourse(data: any, id: string = '0') {
    const url = `${this.apiUrl}course/${id}/processing/`;
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };
    return axios.post(url, data, config);
  }

  deleteCourse(id: string) {
    const url = `${this.apiUrl}course/${id}/deletion/`;
    return axios.get(url);
  }

  // Legacy methods for backward compatibility
  listCourse(id: string = '0') {
    return this.getCourseListing(id);
  }

  // Order Management API endpoints
  getOrders() {
    const url = `${this.apiUrl}orders/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Add participants to existing booking
  addParticipants(bookingId: number, additionalParticipants: number) {
    const url = `${this.apiUrl}booking/${bookingId}/add_participants/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    console.log('Calling addParticipants API:', {
      url,
      bookingId,
      additionalParticipants,
      config
    });
    
    return axios.post(url, { additional_participants: additionalParticipants }, config);
  }



  // Get order statistics
  getOrderStatistics() {
    const url = `${this.apiUrl}orders/statistics/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Get filtered orders by status
  getOrdersByStatus(status: string) {
    const url = `${this.apiUrl}orders/by_status/`;
    const config: any = { 
      params: { status: status } 
    };
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }



  // Create join request for partially available slot
  createJoinRequest(joinRequestData: { course: number; tee: number; slotDate: string; bookingTime: string; participants: number; originalSlotParticipants: number; }) {
    const url = `${this.apiUrl}booking/create_join_request/`;
    const config: any = {
      validateStatus: function (status: number) {
        // Don't throw error for 400 status (duplicate request)
        return status >= 200 && status < 500;
      }
    };
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, joinRequestData, config);
  }

  // Get join request status
  getJoinRequestStatus(requestId: string) {
    const url = `${this.apiUrl}booking/join-request/${requestId}/status/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Get pending review requests (for original bookers)
  getPendingReviewRequests() {
    const url = `${this.apiUrl}orders/pending_review/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }



  // Check slot availability and existing requests
  checkSlotAvailability(course: number, tee: number, slotDate: string, bookingTime: string) {
    const url = `${this.apiUrl}booking/check_slot_availability/`;
    const config: any = {
      params: {
        course: course,
        tee: tee,
        slotDate: slotDate,
        bookingTime: bookingTime
      }
    };
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.get(url, config);
  }

  // Add participants to existing booking
  addParticipantsToBooking(bookingId: number, participantData: any) {
    const url = `${this.apiUrl}booking/${bookingId}/add_participants/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, participantData, config);
  }

  // Join Request Management Methods
  getIncomingJoinRequests() {
    return axios.get<any>(`${this.apiUrl}joinRequest/incoming_requests/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  getOutgoingJoinRequests() {
    return axios.get<any>(`${this.apiUrl}joinRequest/outgoing_requests/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }



  getJoinRequestStatistics() {
    return axios.get<any>(`${this.apiUrl}joinRequest/statistics/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Enhanced create join request with better validation
  createJoinRequestEnhanced(joinRequestData: {
    course: number;
    tee: number;
    slotDate: string;
    bookingTime: string;
    participants: number;
    originalBookingId: number;
  }) {
    return axios.post<any>(`${this.apiUrl}booking/create_join_request/`, joinRequestData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Get all join requests for a specific booking
  getJoinRequestsForBooking(bookingId: number) {
    return axios.get<any>(`${this.apiUrl}joinRequest/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      params: { original_booking: bookingId }
    });
  }

  // Enhanced order statistics with join request counts (8 counters)
  getEnhancedOrderStatistics() {
    return axios.get<any>(`${this.apiUrl}orders/statistics/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Get enhanced orders data with all bookings and join requests
  getEnhancedOrdersData() {
    return axios.get<any>(`${this.apiUrl}orders/enhanced_orders/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Get pending review requests with enhanced data
  getPendingReviewRequestsEnhanced() {
    return axios.get<any>(`${this.apiUrl}orders/pending_review/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Approve join request
  approveJoinRequest(requestId: number) {
    return axios.post<any>(`${this.apiUrl}joinRequest/${requestId}/approve/`, {}, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Reject join request
  rejectJoinRequest(requestId: number, notes?: string) {
    return axios.post<any>(`${this.apiUrl}joinRequest/${requestId}/reject/`, {
      notes: notes || ''
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }

  // Review join request (approve/reject)
  reviewJoinRequest(requestId: number, action: 'approve' | 'reject', notes?: string) {
    const endpoint = action === 'approve' ? 'approve' : 'reject';
    return axios.post<any>(`${this.apiUrl}joinRequest/${requestId}/${endpoint}/`, {
      notes: notes || ''
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
  }
}