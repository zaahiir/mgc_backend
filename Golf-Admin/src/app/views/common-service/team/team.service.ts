import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

export interface ProtocolData {
  id?: number;
  protocolTitle: string;
  protocolDescription: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorData {
  id?: number;
  instructorName: string;
  instructorPosition: string;
  instructorPhoto?: File | null;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;

  constructor(private http: HttpClient) {
    const baseUrl = new BaseAPIUrl();
    this.apiUrl = baseUrl.getUrl(baseURLType);
    this.lists = '/listing/';
    this.processing = '/processing/';
    this.deletion = '/deletion/';
  }

  // Protocol methods
  listProtocol(id: string = '0'): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/${id}${this.lists}`);
  }

  processProtocol(data: FormData | ProtocolData, id: string = '0'): Observable<any> {
    // If data is FormData, send it directly
    if (data instanceof FormData) {
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      return this.http.post(`${this.apiUrl}protocol/${id}${this.processing}`, data);
    }
    // If data is a plain object, convert to FormData
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    return this.http.post(`${this.apiUrl}protocol/${id}${this.processing}`, formData);
  }

  deleteProtocol(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/${id}${this.deletion}`);
  }

  getActiveProtocols(): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/active_protocols/`);
  }

  getAllProtocols(): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/0${this.lists}`);
  }

  // Instructor methods
  listInstructor(id: string = '0'): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/${id}${this.lists}`);
  }

  processInstructor(data: FormData | InstructorData, id: string = '0'): Observable<any> {
    // If data is FormData, send it directly
    if (data instanceof FormData) {
      // Don't set Content-Type header for FormData - let the browser set it with boundary
      return this.http.post(`${this.apiUrl}instructor/${id}${this.processing}`, data);
    }
    // If data is a plain object, convert to FormData
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        if (key === 'instructorPhoto' && data[key] instanceof File) {
          formData.append(key, data[key] as File);
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return this.http.post(`${this.apiUrl}instructor/${id}${this.processing}`, formData);
  }

  deleteInstructor(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/${id}${this.deletion}`);
  }

  getActiveInstructors(): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/active_instructors/`);
  }

  getAllInstructors(): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/0${this.lists}`);
  }
}

