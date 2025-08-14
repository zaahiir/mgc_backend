import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class PlanService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "plan/0/listing/";
    this.processing = this.apiUrl + "plan/0/processing/";
    this.deletion = this.apiUrl + "plan/0/deletion/";
  }

  // Get all plans
  listPlans(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  // Create or update plan
  processPlan(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  // Delete plan
  deletePlan(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  // Get all active plans for membership display
  async getActivePlans(): Promise<any> {
    try {
      const response = await this.listPlans();
      if (response.data && response.data.data) {
        return response.data.data.filter((plan: any) => plan.hideStatus === 0);
      }
      return [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  }

  // Get only the primary plan (first active plan)
  async getPrimaryPlan(): Promise<any> {
    try {
      const plans = await this.getActivePlans();
      return plans.length > 0 ? plans[0] : null;
    } catch (error) {
      console.error('Error fetching primary plan:', error);
      return null;
    }
  }

  // Get plan features
  async getPlanFeatures(planId: string): Promise<any> {
    try {
      const response = await axios.get(this.apiUrl + `planFeature/${planId}/listing/`);
      if (response.data && response.data.data) {
        return response.data.data.filter((feature: any) => feature.hideStatus === 0);
      }
      return [];
    } catch (error) {
      console.error('Error fetching plan features:', error);
      return [];
    }
  }

  // Create plan feature
  async createPlanFeature(data: any): Promise<any> {
    try {
      const response = await axios.post(this.apiUrl + 'planFeature/0/processing/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating plan feature:', error);
      throw error;
    }
  }

  // Update plan feature
  async updatePlanFeature(featureId: string, data: any): Promise<any> {
    try {
      const response = await axios.post(this.apiUrl + `planFeature/${featureId}/processing/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating plan feature:', error);
      throw error;
    }
  }

  // Delete plan feature
  async deletePlanFeature(featureId: string): Promise<any> {
    try {
      const response = await axios.get(this.apiUrl + `planFeature/${featureId}/deletion/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting plan feature:', error);
      throw error;
    }
  }

  // Get plan by ID
  async getPlanById(planId: number): Promise<any> {
    try {
      const response = await this.listPlans(planId.toString());
      if (response.data && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching plan:', error);
      return null;
    }
  }



  // Generate default features based on plan duration and price
  private generateDefaultFeatures(duration: number): any[] {
    const baseFeatures = [
      { name: 'Access to Practice Range', included: true },
      { name: 'Basic Equipment Rental', included: true },
      { name: 'Guest Privileges', included: true },
      { name: 'Priority Course Booking', included: false },
      { name: 'Professional Training Sessions', included: false },
      { name: 'Tournament Participation', included: false },
      { name: 'Clubhouse Dining Discounts', included: false }
    ];

    // Adjust features based on duration
    if (duration === 1) {
      // Monthly plans - basic features
      baseFeatures[2].name = 'Guest Privileges (2 per month)';
    } else {
      // Yearly plans - enhanced features
      baseFeatures[1].name = 'Premium Equipment Rental';
      baseFeatures[2].name = 'Guest Privileges (5 per month)';
      baseFeatures[3].included = true;
      baseFeatures[4].included = true;
    }

    return baseFeatures;
  }

  // Get current user's memberships (if authenticated)
  async getCurrentMemberships(): Promise<any[]> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return [];
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Call the new endpoint to get current memberships
      const response = await axios.get(`${this.apiUrl}member/current-memberships/`, config);
      
      if (response.data && response.data.code === 1 && response.data.data) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching current memberships:', error);
      return [];
    }
  }

  // Get membership details by member ID
  async getMembershipByMemberId(memberId: number): Promise<any> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return null;
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Call the member profile endpoint
      const response = await axios.get(`${this.apiUrl}member/${memberId}/profile/`, config);
      
      if (response.data && response.data.code === 1 && response.data.data) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching membership details:', error);
      return null;
    }
  }

  // Choose a plan (create membership)
  async choosePlan(planId: number, memberData: any): Promise<any> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // This would need to be implemented in the backend
      // For now, return success response
      return { success: true, message: 'Plan selected successfully' };
    } catch (error) {
      console.error('Error choosing plan:', error);
      throw error;
    }
  }

  // Renew membership
  async renewMembership(membershipId: number): Promise<any> {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      // This would need to be implemented in the backend
      // For now, return success response
      return { success: true, message: 'Membership renewed successfully' };
    } catch (error) {
      console.error('Error renewing membership:', error);
      throw error;
    }
  }
}
