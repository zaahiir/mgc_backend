import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faGolfBall, faTrophy, faBolt, faDollarSign,
  faUsers, faCalendarAlt, faInfoCircle, faCheckCircle, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { PlanService } from '../common-service/plan/plan.service';
import { ProfileService } from '../common-service/profile/profile.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.css'
})
export class MembershipComponent implements OnInit {
  loading: boolean = true;
  error: string = '';

  membershipPlans: any[] = [];

  // Current membership status for the user
  currentMemberships: any[] = [];

  // Icons for benefits section
  golfBallIcon = faGolfBall;
  trophyIcon = faTrophy;
  boltIcon = faBolt;
  dollarSignIcon = faDollarSign;
  usersIcon = faUsers;
  calendarIcon = faCalendarAlt;
  infoIcon = faInfoCircle;
  checkCircleIcon = faCheckCircle;
  timesIcon = faTimes;

  constructor(
    private planService: PlanService,
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Debug JWT token to see what's available
    this.profileService.debugJWTToken();
    
    // Clear and refresh user ID from token to ensure we have the latest
    this.profileService.clearAndRefreshUserData();
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated() && !this.profileService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadPlans();
    this.loadCurrentMemberships();
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
      // Get current user ID for verification
      const userId = this.authService.getUserId() || this.profileService.getCurrentUserId() || localStorage.getItem('user_id');
      if (!userId) {
        console.error('User ID not found');
        return;
      }

      console.log('Loading memberships for user ID:', userId);

      // Use ProfileService to get current member memberships
      this.currentMemberships = await this.profileService.getCurrentMemberMemberships();
      
      console.log('Current memberships loaded for user:', userId, this.currentMemberships);
      
      // Verify memberships belong to current user
      this.currentMemberships.forEach((membership, index) => {
        if (membership.memberId && membership.memberId.toString() !== userId.toString()) {
          console.warn(`Membership ${index} ID mismatch. Expected: ${userId}, Got: ${membership.memberId}`);
        }
      });
      
      // If no memberships found, show appropriate message
      if (this.currentMemberships.length === 0) {
        console.log('No memberships found for current user:', userId);
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
    this.currentMemberships = [];
  }
}
