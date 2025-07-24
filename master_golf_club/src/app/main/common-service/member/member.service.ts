import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private profileUrl: string;
  private currentProfileUrl: string;
  private updateProfileUrl: string;
  private gender: string;
  private nationality: string;
  private plan: string;
  private paymentStatus: string;
  private paymentMethod: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "member/0/listing/";
    this.processing = this.apiUrl + "member/0/processing/";
    this.deletion = this.apiUrl + "member/0/deletion/";

    // FIXED: Updated profile endpoints to match Django URLs
    this.profileUrl = this.apiUrl + "member/{id}/profile/";
    this.currentProfileUrl = this.apiUrl + "member/current-profile/";
    this.updateProfileUrl = this.apiUrl + "member/{id}/update-profile/";

    this.gender = this.apiUrl + "gender/";
    this.nationality = this.apiUrl + "country/";
    this.plan = this.apiUrl + "plan/";
    this.paymentStatus = this.apiUrl + "paymentStatus/";
    this.paymentMethod = this.apiUrl + "paymentMethod/";
  }

  // Existing methods
  listMember(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processMember(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deleteMember(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  // FIXED: Get member profile by ID
  getMemberProfile(memberId: string) {
    const config: any = {};

    // Add authorization headers if you have tokens
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    return axios.get(this.profileUrl.replace('{id}', memberId), config);
  }

  // FIXED: Get current authenticated user's profile
  getCurrentMemberProfile() {
    const config: any = {};

    // Add authorization headers if you have tokens
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    // Add user ID as query parameter if available
    const userId = localStorage.getItem('user_id');
    if (userId) {
      config.params = { user_id: userId };
    }

    return axios.get(this.currentProfileUrl, config);
  }

  // FIXED: Update member profile by ID
  updateMemberProfile(data: any, memberId: string) {
    const config: any = {};

    // Add authorization headers if you have tokens
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }

    return axios.put(this.updateProfileUrl.replace('{id}', memberId), data, config);
  }

  // FIXED: Helper method to get current user's profile with error handling
  async getCurrentProfile(): Promise<any> {
    try {
      const userId = localStorage.getItem('user_id');

      if (!userId) {
        throw new Error('User ID not found in localStorage');
      }

      // Option 1: Use current-profile endpoint (for authenticated users)
      // const response = await this.getCurrentMemberProfile();

      // Option 2: Use profile endpoint with user ID (simpler approach)
      const response = await this.getMemberProfile(userId);

      if (response.data && response.data.code === 1) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch profile');
      }
    } catch (error: any) {
      console.error('Error fetching current profile:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error('Profile not found. Please contact support.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Invalid request.');
      } else {
        throw error;
      }
    }
  }

  // FIXED: Helper method to update current user's profile with error handling
  async updateProfile(profileData: any): Promise<any> {
    try {
      const userId = localStorage.getItem('user_id');

      if (!userId) {
        throw new Error('User ID not found in localStorage');
      }

      const response = await this.updateMemberProfile(profileData, userId);

      if (response.data && response.data.code === 1) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);

      // Handle specific error cases
      if (error.response?.status === 404) {
        throw new Error('Profile not found. Please contact support.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid data provided. Please check your input.');
      } else {
        throw error;
      }
    }
  }

  // Existing methods
  getGender() {
    return axios.get(this.gender);
  }

  getNationality() {
    return axios.get(this.nationality);
  }

  getPlan() {
    return axios.get(this.plan);
  }

  getPaymentStatus() {
    return axios.get(this.paymentStatus);
  }

  getPaymentMethod() {
    return axios.get(this.paymentMethod);
  }

  async getLastMemberId(year: string, month: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.apiUrl}member/last-member-id/${year}/${month}/`);
      return response.data?.data?.memberId || null;
    } catch (error) {
      console.error('Error fetching last member ID:', error);
      return null;
    }
  }
}
