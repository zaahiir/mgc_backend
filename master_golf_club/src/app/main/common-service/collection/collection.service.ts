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
  bookingDate: string;
  bookingTime: string;
  participants: number;
  totalPrice: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'pending_approval' | 'approved' | 'rejected' | 'completed';
  is_join_request?: boolean;
  original_booking?: number;
  is_multi_slot_booking?: boolean;
  multi_slot_group_id?: string;
  slot_order?: number;
}

interface MultiSlotBookingData {
  slots: Array<{
    course: number;
    tee: number;
    bookingDate: string;
    bookingTime: string;
    participants: number;
    totalPrice?: number;
    is_join_request?: boolean;
    original_booking?: number;
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
}

interface Notification {
  id: number;
  recipient: number;
  recipientName: string;
  sender?: number;
  senderName?: string;
  notification_type: 'join_request' | 'join_approved' | 'join_rejected' | 'booking_confirmed' | 'booking_cancelled';
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
  canCancel: boolean;
  endTime: string;
  formattedDate: string;
  slotStatus: string;
  availableSpots: number;
  slotParticipantCount: number;
  canJoinSlot: boolean;
  joinRequests: BookingWithDetails[];
  originalBookingInfo?: any;
  isMultiSlotBooking?: boolean;
  multiSlotGroupId?: string;
  slotOrder?: number;
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
    
    // Get timezone offset in minutes
    const timezoneOffset = new Date().getTimezoneOffset();
    
    const config: any = { 
      params: { 
        course_id: courseId,
        date: date,
        tee_id: teeId,
        participants: participants,
        timezone_offset: timezoneOffset
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

  // Join request methods
  createJoinRequest(bookingData: BookingData) {
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

  approveJoinRequest(bookingId: number, joinRequestId: number) {
    const url = `${this.apiUrl}booking/${bookingId}/approve_join_request/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, { join_request_id: joinRequestId }, config);
  }

  rejectJoinRequest(bookingId: number, joinRequestId: number) {
    const url = `${this.apiUrl}booking/${bookingId}/reject_join_request/`;
    const config: any = {};
    
    // Add authorization headers if available
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    
    return axios.post(url, { join_request_id: joinRequestId }, config);
  }

  // Cancel booking method
  cancelBooking(bookingId: number) {
    const url = `${this.apiUrl}booking/${bookingId}/cancel/`;
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
}
