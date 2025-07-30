import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';

export interface ApiResponse<T> {
  code: number;
  data?: T;
  message: string;
  errors?: any;
}

export interface Tee {
  id: number;
  courseId: number;
  courseName: string;
  holeNumber: number;
  label: string;
  pricePerPerson: number;
  formattedPrice: string;
  description: string;
  estimatedDuration: string;
}

export interface Booking {
  id?: number;
  member: number;
  memberName?: string;
  memberFullName?: string;
  course: number;
  courseName?: string;
  tee: number;
  teeInfo?: string;
  bookingDate: string;
  formattedDate?: string;
  bookingTime: string;
  endTime?: string;
  participants: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  canCancel?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  formatted_time: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl: string;
  private bookingsSubject = new BehaviorSubject<Booking[]>([]);
  public bookings$ = this.bookingsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
  }

  // Tee Management
  getTeesByCourse(courseId: number): Observable<ApiResponse<Tee[]>> {
    const params = new HttpParams().set('course_id', courseId.toString());
    return this.http.get<ApiResponse<Tee[]>>(`${this.apiUrl}tee/by_course/`, { params })
      .pipe(
        catchError(this.handleError<Tee[]>('getTeesByCourse'))
      );
  }

  getAllTees(): Observable<ApiResponse<Tee[]>> {
    return this.http.get<ApiResponse<Tee[]>>(`${this.apiUrl}tee/`)
      .pipe(
        catchError(this.handleError<Tee[]>('getAllTees'))
      );
  }

  getTeeById(teeId: number): Observable<ApiResponse<Tee>> {
    return this.http.get<ApiResponse<Tee>>(`${this.apiUrl}tee/${teeId}/`)
      .pipe(
        catchError(this.handleError<Tee>('getTeeById'))
      );
  }

  // Time Slot Management
  getAvailableSlots(courseId: number, date: string, teeId: number): Observable<ApiResponse<TimeSlot[]>> {
    const params = new HttpParams()
      .set('course_id', courseId.toString())
      .set('date', date)
      .set('tee_id', teeId.toString());
    
    return this.http.get<ApiResponse<TimeSlot[]>>(`${this.apiUrl}booking/available_slots/`, { params })
      .pipe(
        catchError(this.handleError<TimeSlot[]>('getAvailableSlots'))
      );
  }

  // Booking Management
  createBooking(bookingData: Partial<Booking>): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(`${this.apiUrl}booking/`, bookingData)
      .pipe(
        map(response => {
          if (response.code === 1 && response.data) {
            this.refreshBookings();
          }
          return response;
        }),
        catchError(this.handleError<Booking>('createBooking'))
      );
  }

  getBookings(params?: any): Observable<ApiResponse<Booking[]>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<Booking[]>>(`${this.apiUrl}booking/`, { params: httpParams })
      .pipe(
        map(response => {
          if (response.code === 1 && response.data) {
            this.bookingsSubject.next(response.data);
          }
          return response;
        }),
        catchError(this.handleError<Booking[]>('getBookings'))
      );
  }

  // Helper methods
  private handleError<T>(operation = 'operation') {
    return (error: HttpErrorResponse): Observable<ApiResponse<T>> => {
      let errorMessage = 'An unknown error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }

      console.error(`${operation} failed: ${errorMessage}`);
      
      // Return a default error response
      const errorResponse: ApiResponse<T> = {
        code: 0,
        message: errorMessage,
        errors: error.error
      };
      
      return throwError(() => errorResponse);
    };
  }

  private refreshBookings(): void {
    // Refresh the bookings list after creating a new booking
    this.getBookings().subscribe();
  }
}