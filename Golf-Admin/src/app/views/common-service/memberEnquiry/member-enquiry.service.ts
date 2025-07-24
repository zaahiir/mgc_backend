import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberEnquiryService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
  }

  listMemberEnquiry(id: string = '0') {
    const url = `${this.apiUrl}memberEnquiry/listing/${id}/`;
    return axios.get(url);
  }

  processMemberEnquiry(data: any, id: string = '0') {
    const url = `${this.apiUrl}memberEnquiry/processing/${id}/`;
    return axios.post(url, data);
  }

  deleteMemberEnquiry(id: string) {
    const url = `${this.apiUrl}memberEnquiry/deletion/${id}/`;
    return axios.get(url);
  }

  // FIXED: Enhanced markEnquiryConverted method with better error handling and logging
  async markEnquiryConverted(enquiryId: string, data: { convertedMemberId: string }): Promise<any> {
    try {
      const url = `${this.apiUrl}memberEnquiry/mark-converted/${enquiryId}/`;

      console.log('Making API call to mark enquiry as converted:');
      console.log('URL:', url);
      console.log('Data:', data);

      // Add timeout and better headers
      const response = await axios.post(url, data, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('API Response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      return response;
    } catch (error) {
      console.error('Error in markEnquiryConverted service:', error);

      // Enhanced error logging
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:');
        console.error('Status:', error.response?.status);
        console.error('Status text:', error.response?.statusText);
        console.error('Response data:', error.response?.data);
        console.error('Request config:', error.config);
      }

      throw error;
    }
  }

  async getEnquiryById(enquiryId: string): Promise<any> {
    try {
      const url = `${this.apiUrl}memberEnquiry/listing/${enquiryId}/`;
      console.log('Getting enquiry by ID:', url);

      const response = await axios.get(url, {
        timeout: 30000
      });

      console.log('Get enquiry response:', response);
      return response;
    } catch (error) {
      console.error('Error getting enquiry by ID:', error);
      throw error;
    }
  }
}
