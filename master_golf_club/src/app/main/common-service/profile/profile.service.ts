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
    if (!token) {
      throw new Error('Authentication token not found');
    }

    config.headers = {
      'Authorization': `Bearer ${token}`
    };

    // Get user ID using the enhanced method
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User ID not found. Please log in again.');
    }

    console.log('Fetching profile for user ID:', userId);

    // Use the current profile endpoint with user_id parameter
    return axios.get(`${this.currentProfileUrl}?user_id=${userId}`, config);
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
        // Get user ID if not provided - use current authenticated user
        const userId = memberId || this.getCurrentUserId();

        if (!userId) {
          reject(new Error('User ID not found. Please log in again.'));
          return;
        }

        console.log('Uploading profile image for user ID:', userId);

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
      // Get user ID if not provided - use current authenticated user
      const userId = memberId || this.getCurrentUserId();

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('Uploading profile image via update for user ID:', userId);

      // Create FormData
      const formData = new FormData();
      formData.append('profilePhoto', file);

      const config: any = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      config.headers['Authorization'] = `Bearer ${token}`;

      // Use the update profile endpoint with FormData
      const response = await axios.put(
        this.updateProfileUrl.replace('{id}', userId),
        formData,
        config
      );

      if (response.data && response.data.code === 1) {
        return response.data.data?.profilePhoto || response.data.data.imageUrl;
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
      // Get user ID using the enhanced method
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('Getting current profile for user ID:', userId);

      // First try to get current profile from the dedicated endpoint
      try {
        const response = await this.getCurrentMemberProfile();
        if (response.data && response.data.code === 1) {
          console.log('Profile fetched from current endpoint for user:', userId);
          return response.data.data;
        }
      } catch (endpointError) {
        console.log('Current profile endpoint not available, falling back to user_id method');
      }

      // Fallback: get profile using user ID
      console.log('Using fallback method to get profile for user:', userId);
      const response = await this.getMemberProfile(userId);
      if (response.data && response.data.code === 1) {
        console.log('Profile fetched from fallback method for user:', userId);
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
      // Get user ID using the enhanced method
      const userId = this.getCurrentUserId();

      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('Updating profile for user ID:', userId);

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

  // Get QR code for current member
  async getCurrentMemberQRCode(): Promise<any> {
    try {
      const config: any = {};

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      config.headers = {
        'Authorization': `Bearer ${token}`
      };

      // Get user ID using the enhanced method
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('Getting QR code for user ID:', userId);

      // Try to get QR code from current member endpoint with user_id
      try {
        const response = await axios.get(`${this.apiUrl}member/current-qr-code/?user_id=${userId}`, config);
        if (response.data && response.data.code === 1) {
          return response.data.data;
        }
      } catch (endpointError) {
        console.log('Current QR code endpoint not available, trying alternative method');
      }

      // Fallback: get current profile and generate QR code
      try {
        const profileData = await this.getCurrentProfile();
        if (profileData && profileData.golfClubId) {
          // Generate QR code URL for verification
          const qrUrl = `https://mastergolfclub.com/member/verify/${profileData.golfClubId}/`;
          return {
            qrCode: null, // Will be generated by frontend
            memberId: profileData.golfClubId,
            memberEmail: profileData.email,
            qrUrl: qrUrl
          };
        }
      } catch (profileError) {
        console.error('Error getting profile for QR code:', profileError);
      }

      throw new Error('Unable to generate QR code for current member');
    } catch (error: any) {
      console.error('Error getting QR code:', error);

      if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('QR code not found for this member.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to get QR code');
      }
    }
  }

  // Get QR code for specific member
  async getMemberQRCode(memberId: string): Promise<any> {
    try {
      const config: any = {};

      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        };
      }

      const response = await axios.get(this.apiUrl + `member/${memberId}/qr-code/`, config);

      if (response.data && response.data.code === 1) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || 'Failed to get QR code');
      }
    } catch (error: any) {
      console.error('Error getting QR code:', error);

      if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Member or QR code not found.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to get QR code');
      }
    }
  }

  // ADDED: Get current member membership details
  async getCurrentMemberMembershipDetails(): Promise<any> {
    try {
      const config: any = {};

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      config.headers = {
        'Authorization': `Bearer ${token}`
      };

      // Get user ID using the enhanced method
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      console.log('Getting membership details for user ID:', userId);

      // First try to get current profile which includes membership info
      const profileResponse = await this.getCurrentMemberProfile();
      
      if (profileResponse.data && profileResponse.data.code === 1) {
        const profileData = profileResponse.data.data;
        
        // Transform profile data to membership details format
        const membershipDetails = {
          memberId: profileData.golfClubId || profileData.id || userId,
          memberEmail: profileData.email,
          type: profileData.plan || 'Standard Membership',
          startDate: profileData.membershipStartDate,
          expirationDate: profileData.membershipEndDate,
          status: profileData.membershipStatus || 'Active',
          isActive: profileData.daysUntilExpiry > 0,
          daysUntilExpiry: profileData.daysUntilExpiry || 0,
          paymentStatus: profileData.paymentStatus,
          paymentMethod: profileData.paymentMethod,
          profilePhoto: profileData.profilePhoto,
          handicap: profileData.handicap,
          lastVisit: profileData.lastVisit,
          totalVisits: profileData.totalVisits,
          membershipLevel: profileData.membershipLevel
        };

        return membershipDetails;
      } else {
        throw new Error(profileResponse.data?.message || 'Failed to fetch membership details');
      }
    } catch (error: any) {
      console.error('Error fetching current member membership details:', error);

      if (error.response?.status === 401) {
        throw new Error('Session expired. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Membership details not found. Please contact support.');
      } else {
        throw new Error(error.response?.data?.message || 'Failed to fetch membership details');
      }
    }
  }

  // ADDED: Get current member memberships (for multiple memberships if applicable)
  async getCurrentMemberMemberships(): Promise<any[]> {
    try {
      const config: any = {};

      const token = localStorage.getItem('access_token');
      if (!token) {
        return [];
      }

      config.headers = {
        'Authorization': `Bearer ${token}`
      };

      // Get user ID using the enhanced method
      const userId = this.getCurrentUserId();
      if (!userId) {
        console.error('User ID not found');
        return [];
      }

      console.log('Getting memberships for user ID:', userId);

      // Try to get current memberships from dedicated endpoint with user_id
      try {
        const response = await axios.get(`${this.apiUrl}member/current-memberships/?user_id=${userId}`, config);
        
        if (response.data && response.data.code === 1 && response.data.data) {
          return response.data.data;
        }
      } catch (endpointError) {
        console.log('Current memberships endpoint not available, falling back to profile data');
      }

      // Fallback: get membership details from current profile
      try {
        const membershipDetails = await this.getCurrentMemberMembershipDetails();
        return membershipDetails ? [membershipDetails] : [];
      } catch (profileError) {
        console.error('Error getting membership details from profile:', profileError);
        return [];
      }
    } catch (error: any) {
      console.error('Error fetching current member memberships:', error);
      return [];
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
      const config: any = {};
      
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        };
      }

      const response = await axios.get(`${this.apiUrl}member/last-member-id/${year}/${month}/`, config);
      return response.data?.data?.memberId || null;
    } catch (error) {
      console.error('Error fetching last member ID:', error);
      return null;
    }
  }

  // Get current user ID from localStorage or JWT token
  getCurrentUserId(): string | null {
    // First try to get from localStorage
    let userId = localStorage.getItem('user_id');
    
    if (!userId) {
      // Fallback: try to extract from JWT token
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          // The backend sends member_id in the JWT token, not user_id
          userId = tokenData.member_id || tokenData.user_id || tokenData.sub || null;
          
          // If found in token, store it in localStorage for future use
          if (userId) {
            localStorage.setItem('user_id', userId.toString());
            console.log('Member ID extracted from token and stored:', userId);
          }
        } catch (error) {
          console.error('Error parsing JWT token:', error);
        }
      }
    }
    
    return userId;
  }

  // Refresh user ID from token (useful after login)
  refreshUserIdFromToken(): string | null {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        // The backend sends member_id in the JWT token, not user_id
        const userId = tokenData.member_id || tokenData.user_id || tokenData.sub || null;
        
        if (userId) {
          localStorage.setItem('user_id', userId.toString());
          console.log('Member ID refreshed from token:', userId);
          return userId.toString();
        }
      } catch (error) {
        console.error('Error parsing JWT token for user ID refresh:', error);
      }
    }
    return null;
  }

  // Clear user data and refresh from token
  clearAndRefreshUserData(): string | null {
    // Clear existing user ID
    localStorage.removeItem('user_id');
    console.log('Cleared existing member ID, refreshing from token...');
    
    // Refresh from token
    return this.refreshUserIdFromToken();
  }

  // Debug method to inspect JWT token
  debugJWTToken(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        console.log('JWT Token Data:', tokenData);
        console.log('Available fields:', Object.keys(tokenData));
        console.log('member_id:', tokenData.member_id);
        console.log('user_id:', tokenData.user_id);
        console.log('sub:', tokenData.sub);
      } catch (error) {
        console.error('Error parsing JWT token for debugging:', error);
      }
    } else {
      console.log('No access token found in localStorage');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_id');
    
    // Check if both token and user ID exist
    if (!token || !userId) {
      return false;
    }
    
    // Additional check: verify token is not expired (basic check)
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (tokenData.exp && tokenData.exp < currentTime) {
        // Token expired, clear storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_id');
        return false;
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      return false;
    }
    
    return true;
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

