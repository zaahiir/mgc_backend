import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';

export interface FAQData {
  id?: number;
  faqQuestion: string;
  faqAnswer: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FaqService {
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

  // FAQ methods
  listFAQ(id: string = '0'): Observable<any> {
    return this.http.get(`${this.apiUrl}faq/${id}${this.lists}`);
  }

  processFAQ(data: FAQData, id: string = '0'): Observable<any> {
    return this.http.post(`${this.apiUrl}faq/${id}${this.processing}`, data);
  }

  deleteFAQ(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}faq/${id}${this.deletion}`);
  }

  getActiveFAQs(): Observable<any> {
    return this.http.get(`${this.apiUrl}faq/active_faqs/`);
  }

  getAllFAQs(): Observable<any> {
    return this.http.get(`${this.apiUrl}faq/0${this.lists}`);
  }
}
