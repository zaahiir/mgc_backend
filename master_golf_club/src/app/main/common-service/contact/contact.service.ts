import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

// Interface for About response
export interface AboutResponse {
  id: number;
  aboutHeading: string;
  aboutDescription: string;
  partnerGolfClubs: number;
  successfulYears: number;
  hideStatus: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for Contact Message
export interface ContactMessage {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  description: string;
}

// Interface for FAQ response
export interface FAQResponse {
  id: number;
  faqQuestion: string;
  faqAnswer: string;
  hideStatus: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for FAQ item with accordion state
export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl: string;
  private baseUrl: string;
  private getAbout: string;
  private sendContactMessage: string;
  private activeFAQsUrl: string;

  constructor() {
    const baseAPIUrl = new BaseAPIUrl();
    this.apiUrl = baseAPIUrl.getUrl(baseURLType);
    // Fix: Use apiUrl directly for API calls, same as news service
    this.baseUrl = this.apiUrl.replace(/\/api[s]?\/?$/, '');
    this.getAbout = `${this.apiUrl}about/get_about/`;
    this.sendContactMessage = `${this.apiUrl}message/`;
    this.activeFAQsUrl = `${this.apiUrl}faq/active_faqs/`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getAboutData(): Observable<AboutResponse> {
    return from(axios.get(this.getAbout)).pipe(
      map(response => response.data)
    );
  }

  sendMessage(message: ContactMessage): Observable<any> {
    return from(axios.post(this.sendContactMessage, message)).pipe(
      map(response => response.data)
    );
  }

  getActiveFAQs(): Observable<FAQResponse[]> {
    return from(axios.get(this.activeFAQsUrl)).pipe(
      map(response => response.data.data || [])
    );
  }

  formatImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a relative URL, prepend the base URL
    if (imageUrl.startsWith('/')) {
      return `${this.baseUrl}${imageUrl}`;
    }

    // If it doesn't start with /, add it
    return `${this.baseUrl}/${imageUrl}`;
  }

  stripHtmlTags(html: string): string {
    if (!html) return '';
    
    // Create a temporary div element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Return the text content without HTML tags
    return tempDiv.textContent || tempDiv.innerText || '';
  }
} 
