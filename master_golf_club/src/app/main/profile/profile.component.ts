import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subscription } from 'rxjs';
import {
  faUser,
  faEdit,
  faCalendarAlt,
  faPhone,
  faEnvelope,
  faMapMarkerAlt,
  faIdCard,
  faCrown,
  faUserCheck,
  faGlobe,
  faBell,
  faLanguage,
  faNewspaper,
  faSignOutAlt,
  faSpinner,
  faExclamationTriangle,
  faQrcode,
  faTools,
  faDownload,
  faShare
} from '@fortawesome/free-solid-svg-icons';

import { ProfileService } from '../common-service/profile/profile.service';
import { AuthService } from '../../auth/auth.service';

interface MemberProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  plan?: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  paymentStatus?: string;
  profilePhoto?: string;
  golfClubId?: string;
  handicap: boolean;
  lastVisit?: string;
  totalVisits?: number;
  membershipLevel?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  paymentMethod?: string;
  age?: number;
  daysUntilExpiry?: number;
  membershipStatus?: string;
  preferences?: {
    newsletter: boolean;
    language: string;
    notifications: boolean;
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  // Font Awesome icons
  faUser = faUser;
  faEdit = faEdit;
  faCalendarAlt = faCalendarAlt;
  faPhone = faPhone;
  faEnvelope = faEnvelope;
  faMapMarkerAlt = faMapMarkerAlt;
  faIdCard = faIdCard;
  faCrown = faCrown;
  faUserCheck = faUserCheck;
  faGlobe = faGlobe;
  faBell = faBell;
  faLanguage = faLanguage;
  faNewspaper = faNewspaper;
  faSignOutAlt = faSignOutAlt;
  faSpinner = faSpinner;
  faExclamationTriangle = faExclamationTriangle;
  faQrcode = faQrcode;
  faTools = faTools;
  faDownload = faDownload;
  faShare = faShare;

  memberProfile: MemberProfile | null = null;
  isEditing = false;
  loadingError = false;
  isLoading = true;
  errorMessage = '';
  qrCodeUrl: string = '';

  // Image loading states
  imageLoading = false;
  imageLoadError = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMemberProfile();
    this.generateQRCode();
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadMemberProfile() {
    this.isLoading = true;
    this.loadingError = false;
    this.errorMessage = '';
    this.imageLoadError = false; // Reset image error state

    try {
      // Check if user is authenticated
      if (!this.authService.isAuthenticated()) {
        this.router.navigate(['/login']);
        return;
      }

      // Fetch current user's profile
      const profileData = await this.profileService.getCurrentProfile();
      this.memberProfile = profileData;

      console.log('Profile loaded successfully:', this.memberProfile);

    } catch (error: any) {
      console.error('Error loading profile:', error);
      this.loadingError = true;

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || 'Unknown server error';

        if (status === 401) {
          this.errorMessage = 'Session expired. Please log in again.';
          // Redirect to login after a short delay
          setTimeout(() => {
            this.authService.logout().subscribe();
          }, 2000);
        } else if (status === 404) {
          this.errorMessage = 'Profile not found. Please contact support.';
        } else {
          this.errorMessage = `Server error: ${message}`;
        }
      } else if (error.request) {
        // Network error
        this.errorMessage = 'Network error. Please check your internet connection.';
      } else {
        // Other error
        this.errorMessage = error.message || 'An unexpected error occurred.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  getFullName(): string {
    if (!this.memberProfile) return '';
    return `${this.memberProfile.firstName} ${this.memberProfile.lastName}`;
  }

  getMembershipStatus(): string {
    return this.memberProfile?.membershipStatus || 'Active';
  }

  getMembershipStatusClass(): string {
    const status = this.getMembershipStatus();
    return status === 'Active' ? 'status-active' : 'status-expired';
  }

  getDaysUntilExpiry(): number {
    return this.memberProfile?.daysUntilExpiry || 0;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Not specified';

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  }

  calculateAge(): number {
    return this.memberProfile?.age || 0;
  }

  // Updated getProfileImage method - only return if valid profile photo exists
  getProfileImage(): string {
    if (this.memberProfile?.profilePhoto &&
        this.memberProfile.profilePhoto.trim() !== '') {

      const photoPath = this.memberProfile.profilePhoto.trim();

      // If it's already a full URL, return as is
      if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
        return photoPath;
      }

      // If it's a relative path starting with /media/, construct full URL
      if (photoPath.startsWith('/media/')) {
        // Replace with your actual base URL
        const baseUrl = 'https://mastergolfclub.com'; // Update this to match your backend URL
        return baseUrl + photoPath;
      }

      // If it's a relative path without leading slash, add base URL and slash
      if (!photoPath.startsWith('/')) {
        const baseUrl = 'https://mastergolfclub.com'; // Update this to match your backend URL
        return baseUrl + '/media/' + photoPath;
      }

      // For any other relative paths, construct with base URL
      const baseUrl = 'https://mastergolfclub.com'; // Update this to match your backend URL
      return baseUrl + photoPath;
    }

    return '';
  }

  // Method to validate if the image URL is valid
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
    } catch {
      // If it's a relative path, consider it valid
      return !url.includes('default-avatar') && !url.includes('team-1.jpg');
    }
  }

  // Updated onImageError method
  onImageError(event: any) {
    console.log('Profile image failed to load:', event.target.src);
    this.imageLoadError = true;
    this.imageLoading = false;

    // Hide the failed image
    event.target.style.display = 'none';
  }

  // New method to handle successful image load
  onImageLoad(event: any) {
    console.log('Profile image loaded successfully');
    this.imageLoading = false;
    this.imageLoadError = false;
  }

  // Method to get user initials for avatar fallback
  getUserInitials(): string {
    if (!this.memberProfile) return '?';

    const firstName = this.memberProfile.firstName?.charAt(0)?.toUpperCase() || '';
    const lastName = this.memberProfile.lastName?.charAt(0)?.toUpperCase() || '';

    if (firstName && lastName) {
      return firstName + lastName;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    }

    // Fallback to email initial if no name available
    return this.memberProfile.email?.charAt(0)?.toUpperCase() || '?';
  }

  // Method to check if profile image exists and is valid
  hasValidProfileImage(): boolean {
    return !this.imageLoadError &&
           !!(this.memberProfile?.profilePhoto &&
              this.memberProfile.profilePhoto.trim() !== '' &&
              this.isValidImageUrl(this.memberProfile.profilePhoto));
  }

  // Optional: Method to retry image loading
  private retryImageLoad(imgElement: HTMLImageElement, retryCount = 0) {
    if (retryCount < 2) { // Only retry twice
      setTimeout(() => {
        imgElement.style.display = 'block';
        imgElement.src = this.getProfileImage() + '?retry=' + Date.now();
        retryCount++;
      }, 1000 * (retryCount + 1)); // Increasing delay
    }
  }

  // Method to handle profile image upload (if needed)
  async uploadProfileImage(file: File) {
    try {
      this.imageLoading = true;

      // Upload logic here - call your service
      const uploadedImageUrl = await this.profileService.uploadProfileImage(file);

      if (this.memberProfile) {
        this.memberProfile.profilePhoto = uploadedImageUrl;
        this.imageLoadError = false;
      }

      console.log('Profile image uploaded successfully:', uploadedImageUrl);
    } catch (error) {
      console.error('Error uploading profile image:', error);
      this.imageLoadError = true;
    } finally {
      this.imageLoading = false;
    }
  }

  // QR Code generation method
  generateQRCode() {
    if (this.memberProfile) {
      // Generate QR code with member information
      const qrData = {
        memberId: this.memberProfile.golfClubId || this.memberProfile.id,
        name: this.getFullName(),
        email: this.memberProfile.email
      };

      // You can use a QR code library here like 'qrcode' or generate via API
      // For now, we'll set a placeholder or use a service
      this.qrCodeUrl = this.generateQRCodeUrl(JSON.stringify(qrData));
    }
  }

  // Helper method to generate QR code URL (placeholder implementation)
  private generateQRCodeUrl(data: string): string {
    // You can use a QR code service like QR Server API
    const encodedData = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  }

  // Download QR Code method
  downloadQRCode() {
    if (this.qrCodeUrl) {
      const link = document.createElement('a');
      link.href = this.qrCodeUrl;
      link.download = `${this.getFullName()}_QR_Code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.warn('QR Code not available for download');
    }
  }

  // Share Profile method
  shareProfile() {
    if (navigator.share) {
      // Use native Web Share API if available
      navigator.share({
        title: `${this.getFullName()} - Golf Club Profile`,
        text: `Check out ${this.getFullName()}'s golf club profile`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      const profileUrl = window.location.href;
      navigator.clipboard.writeText(profileUrl).then(() => {
        alert('Profile link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy profile link:', err);
        // Fallback: show the URL in a prompt
        prompt('Copy this profile link:', profileUrl);
      });
    }
  }

  async retryLoading() {
    await this.loadMemberProfile();
  }

  redirectToAccount() {
    this.router.navigate(['/account']);
  }

  cancelEdit() {
    this.isEditing = false;
  }

  contactSupport() {
    console.log('Contact support clicked');
    // Implement contact support logic
    // You can redirect to a contact form or open a modal
    this.router.navigate(['/contact-support']);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if logout request fails, user is still logged out locally
      }
    });
  }

  // Utility method to refresh profile data
  async refreshProfile() {
    await this.loadMemberProfile();
  }

  // Method to handle session extension on user activity
  onUserActivity() {
    if (this.authService.isAuthenticated()) {
      this.authService.extendSession();
    }
  }
}
