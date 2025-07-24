import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private profileUrl: string;
  private currentProfileUrl: string;
  private updateProfileUrl: string;
  private uploadImageUrl: string;
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

    // Profile endpoints
    this.profileUrl = this.apiUrl + "member/{id}/profile/";
    this.currentProfileUrl = this.apiUrl + "member/current-profile/";
    this.updateProfileUrl = this.apiUrl + "member/{id}/update-profile/";
    this.uploadImageUrl = this.apiUrl + "member/{id}/upload-image/";

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

  // Get member profile by ID
  getMemberProfile(memberId: string) {
    const config: any = {};

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    return axios.get(this.profileUrl.replace('{id}', memberId), config);
  }

  // Get current authenticated user's profile
  getCurrentMemberProfile() {
    const config: any = {};

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }

    const userId = localStorage.getItem('user_id');
    if (userId) {
      config.params = { user_id: userId };
    }

    return axios.get(this.currentProfileUrl, config);
  }

  // Update member profile by ID
  updateMemberProfile(data: any, memberId: string) {
    const config: any = {};

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }

    return axios.put(this.updateProfileUrl.replace('{id}', memberId), data, config);
  }

  // ADDED: Upload profile image method
  uploadProfileImage(file: File, memberId?: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // Get user ID if not provided
        const userId = memberId || localStorage.getItem('user_id');

        if (!userId) {
          reject(new Error('User ID not found'));
          return;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('profilePhoto', file);

        // Set up config with auth headers
        const config: any = {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        };

        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }

        // Upload the image
        const response = await axios.post(
          this.uploadImageUrl.replace('{id}', userId),
          formData,
          config
        );

        if (response.data && response.data.code === 1) {
          // Return the uploaded image URL
          const imageUrl = response.data.data?.profilePhoto || response.data.data?.imageUrl;
          resolve(imageUrl);
        } else {
          reject(new Error(response.data?.message || 'Upload failed'));
        }
      } catch (error: any) {
        console.error('Error uploading profile image:', error);

        if (error.response?.status === 413) {
          reject(new Error('File too large. Please choose a smaller image.'));
        } else if (error.response?.status === 415) {
          reject(new Error('Invalid file type. Please upload an image file.'));
        } else if (error.response?.status === 401) {
          reject(new Error('Session expired. Please log in again.'));
        } else {
          reject(new Error(error.response?.data?.message || 'Upload failed'));
        }
      }
    });
  }

  // ADDED: Alternative method for uploading via update profile
  async uploadProfileImageViaUpdate(file: File, memberId?: string): Promise<string> {
    try {
      const userId = memberId || localStorage.getItem('user_id');

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const config: any = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      // Use the update profile endpoint with FormData
      const response = await axios.put(
        this.updateProfileUrl.replace('{id}', userId),
        formData,
        config
      );

      if (response.data && response.data.code === 1) {
        return response.data.data?.profilePhoto || response.data.data?.imageUrl;
      } else {
        throw new Error(response.data?.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading profile image via update:', error);
      throw error;
    }
  }

  // Helper method to get current user's profile with error handling
  async getCurrentProfile(): Promise<any> {
    try {
      const userId = localStorage.getItem('user_id');

      if (!userId) {
        throw new Error('User ID not found in localStorage');
      }

      const response = await this.getMemberProfile(userId);

      if (response.data && response.data.code === 1) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to fetch profile');
      }
    } catch (error: any) {
      console.error('Error fetching current profile:', error);

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

  // Helper method to update current user's profile with error handling
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

  // ADDED: Method to validate image file
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image file size should be less than 5MB'
      };
    }

    return { valid: true };
  }

  // ADDED: Method to compress image before upload (optional)
  compressImage(file: File, quality: number = 0.8): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800x800)
        const maxDimension = 800;
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Return original if compression fails
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

