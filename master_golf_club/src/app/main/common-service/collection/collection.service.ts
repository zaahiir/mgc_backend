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
  pricePerPerson: number;
  formattedPrice: string;
  label?: string;
}

interface BookingData {
  member: number;
  course: number;
  tee: number;
  bookingDate: string;
  bookingTime: string;
  participants: number;
  totalPrice: number;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

interface TimeSlot {
  time: string;
  available: boolean;
  formatted_time: string;
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

  // Amenities API endpoints
  getAmenities() {
    const url = `${this.apiUrl}amenities/collection_amenities/`;
    return axios.get(url);
  }

  // Tee Management API endpoints
  getTeesByCourse(courseId: number) {
    const url = `${this.apiUrl}tee/by_course/`;
    const config = { params: { course_id: courseId } };
    return axios.get(url, config);
  }

  // Booking Management API endpoints
  createBooking(bookingData: BookingData) {
    const url = `${this.apiUrl}booking/`;
    return axios.post(url, bookingData);
  }

  getAvailableSlots(courseId: number, date: string, teeId: number) {
    const url = `${this.apiUrl}booking/available_slots/`;
    const config = { 
      params: { 
        course_id: courseId,
        date: date,
        tee_id: teeId
      } 
    };
    return axios.get(url, config);
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
