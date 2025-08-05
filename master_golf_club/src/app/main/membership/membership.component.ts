import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanService } from '../common-service/plan/plan.service';

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

  constructor(private planService: PlanService) {}

  ngOnInit() {
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
      //     period: plan.planDuration === 1 ? 'Per Month' : 'Per Year',
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
            period: plan.planDuration === 1 ? 'Per Month' : 'Per Year',
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
        isActive: true
      },
      {
        type: 'Regular Membership',
        startDate: '2022-05-10',
        expirationDate: '2023-05-10',
        status: 'Expired',
        isActive: false
      }
    ];
  }





  async renewMembership(membership: any) {
    try {
      console.log('Renewing membership:', membership);
      
      // Check if user is authenticated
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Please login to renew your membership.');
        return;
      }

      // Call the plan service to renew membership
      const result = await this.planService.renewMembership(membership.id);
      
      if (result.success) {
        alert('Membership renewed successfully!');
        // Optionally reload current memberships
        await this.loadCurrentMemberships();
      } else {
        alert('Failed to renew membership. Please try again.');
      }
    } catch (error) {
      console.error('Error renewing membership:', error);
      alert('An error occurred while renewing the membership. Please try again.');
    }
  }
}
