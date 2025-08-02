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

  processProtocol(data: ProtocolData, id: string = '0'): Observable<any> {
    return this.http.post(`${this.apiUrl}protocol/${id}${this.processing}`, data);
  }

  deleteProtocol(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/${id}${this.deletion}`);
  }

  getActiveProtocols(): Observable<any> {
    return this.http.get(`${this.apiUrl}protocol/active_protocols/`);
  }

  // Instructor methods
  listInstructor(id: string = '0'): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/${id}${this.lists}`);
  }

  processInstructor(data: InstructorData, id: string = '0'): Observable<any> {
    return this.http.post(`${this.apiUrl}instructor/${id}${this.processing}`, data);
  }

  deleteInstructor(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/${id}${this.deletion}`);
  }

  getActiveInstructors(): Observable<any> {
    return this.http.get(`${this.apiUrl}instructor/active_instructors/`);
  }
}

