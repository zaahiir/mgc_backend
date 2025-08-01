import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

export interface AboutData {
  id: number;
  aboutHeading: string;
  aboutDescription?: string;
  partnerGolfClubs: number;
  successfulYears: number;
  hideStatus: number;
  createdAt: string;
  updatedAt: string;
}

export interface AboutResponse {
  status: string;
  message: string;
  data: AboutData;
}

@Injectable({
  providedIn: 'root'
})
export class AboutService {
  private apiUrl: string;
  private baseUrl: string;
  private getAbout: string;

  constructor() {
    const baseAPIUrl = new BaseAPIUrl();
    this.apiUrl = baseAPIUrl.getUrl(baseURLType);
    // Fix: Use apiUrl directly for API calls, same as news service
    this.baseUrl = this.apiUrl.replace(/\/api[s]?\/?$/, '');
    this.getAbout = `${this.apiUrl}about/get_about/`;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getAboutData(): Observable<AboutResponse> {
    return from(axios.get(this.getAbout)).pipe(
      map(response => response.data)
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