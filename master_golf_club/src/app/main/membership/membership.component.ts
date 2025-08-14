import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanService } from '../common-service/plan/plan.service';
import { ProfileService } from '../common-service/profile/profile.service';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.css'
})
export class MembershipComponent implements OnInit {
  loading: boolean = true;
  error: string = '';

  membershipPlans: any[] = [];

  // Current membership status for the user
  currentMemberships: any[] = [];
  
  // Member profile data
  memberProfile: any = null;
  profileLoading: boolean = false;
  profileError: string = '';

  constructor(
    private planService: PlanService,
    private profileService: ProfileService
  ) {}

  ngOnInit() {
    this.loadPlans();
    this.loadCurrentMemberships();
    this.loadMemberProfile();
  }

  async loadPlans() {
    try {
      this.loading = true;
      this.error = '';
      
      // If you want to show only one plan, use getPrimaryPlan()
      // const plan = await this.planService.getPrimaryPlan();
      // if (plan) {
      //   this.membershipPlans = [{
      //     id: plan.id,
      //     title: plan.planName,
      //     price: parseFloat(plan.planPrice),
      //     period: 'Per Year',
      //     duration: plan.planDuration,
      //     description: plan.planDescription,
      //     features: this.generateDefaultFeatures(plan.planDuration)
      //   }];
      // } else {
      //   this.membershipPlans = [];
      // }
      
      // For now, showing all active plans
      const plans = await this.planService.getActivePlans();
      
                    // Transform plans to the format needed for display
        this.membershipPlans = await Promise.all(plans.map(async (plan: any) => {
          // Get features for this plan
          const features = await this.planService.getPlanFeatures(plan.id);
          
          // Transform features to the format expected by the template
          const transformedFeatures = features.map((feature: any) => ({
            name: feature.featureName,
            included: feature.isIncluded
          }));

          return {
            id: plan.id,
            title: plan.planName,
            price: parseFloat(plan.planPrice),
            period: 'Per Year',
            duration: plan.planDuration,
            description: plan.planDescription,
            features: transformedFeatures
          };
        }));
    } catch (error) {
      console.error('Error loading plans:', error);
      this.error = 'Failed to load membership plans. Please try again later.';
      // Fallback to default plans if API fails
      this.loadDefaultPlans();
    } finally {
      this.loading = false;
    }
  }

  async loadCurrentMemberships() {
    try {
      this.currentMemberships = await this.planService.getCurrentMemberships();
      
      // If no memberships found, show appropriate message
      if (this.currentMemberships.length === 0) {
        console.log('No memberships found for current user');
      }
    } catch (error) {
      console.error('Error loading current memberships:', error);
      // Fallback to default memberships if API fails
      this.loadDefaultMemberships();
    }
  }

  loadDefaultPlans() {
    this.membershipPlans = [];
  }

  loadDefaultMemberships() {
    this.currentMemberships = [
      {
        type: 'Premium Membership',
        startDate: '2024-01-15',
        expirationDate: '2025-01-15',
        status: 'Active',
        isActive: true,
        daysUntilExpiry: 45,
        memberId: 'MGC24001',
        memberName: 'John Doe',
        memberEmail: 'john@example.com'
      },
      {
        type: 'Regular Membership',
        startDate: '2022-05-10',
        expirationDate: '2023-05-10',
        status: 'Expired',
        isActive: false,
        daysUntilExpiry: 0,
        memberId: 'MGC22001',
        memberName: 'Jane Smith',
        memberEmail: 'jane@example.com'
      }
    ];
  }







  // Method to refresh member profile data
  async refreshMemberships() {
    try {
      await this.loadMemberProfile();
    } catch (error) {
      console.error('Error refreshing member profile:', error);
    }
  }

  // Method to load member profile
  async loadMemberProfile() {
    try {
      this.profileLoading = true;
      this.profileError = '';
      
      const profileData = await this.profileService.getCurrentProfile();
      this.memberProfile = profileData;
      
      console.log('Member profile loaded successfully:', this.memberProfile);
    } catch (error: any) {
      console.error('Error loading member profile:', error);
      this.profileError = error.message || 'Failed to load member profile';
      this.memberProfile = null;
    } finally {
      this.profileLoading = false;
    }
  }

  // Helper methods for member profile display
  getFullName(): string {
    if (!this.memberProfile) return '';
    return `${this.memberProfile.firstName || ''} ${this.memberProfile.lastName || ''}`.trim();
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
    if (!this.memberProfile?.dateOfBirth) return 0;
    
    try {
      const birthDate = new Date(this.memberProfile.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return 0;
    }
  }

                getDaysUntilExpiry(): number {
                if (!this.memberProfile?.membershipEndDate) return -1;
                
                try {
                  const endDate = new Date(this.memberProfile.membershipEndDate);
                  const today = new Date();
                  const timeDiff = endDate.getTime() - today.getTime();
                  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                  
                  return Math.max(0, daysDiff);
                } catch (error) {
                  return -1;
                }
              }

              // Added: Helper methods for membership status
              getMembershipStatus(): string {
                if (!this.memberProfile?.membershipEndDate) return 'Unknown';
                
                const daysUntilExpiry = this.getDaysUntilExpiry();
                
                if (daysUntilExpiry < 0) return 'Expired';
                if (daysUntilExpiry === 0) return 'Expires Today';
                if (daysUntilExpiry <= 30) return 'Expires Soon';
                return 'Active';
              }

              getMembershipStatusClass(): string {
                if (!this.memberProfile?.membershipEndDate) return 'status-unknown';
                
                const daysUntilExpiry = this.getDaysUntilExpiry();
                
                if (daysUntilExpiry < 0) return 'status-expired';
                if (daysUntilExpiry === 0) return 'status-warning';
                if (daysUntilExpiry <= 30) return 'status-warning';
                return 'status-active';
              }
            }
