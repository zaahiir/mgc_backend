import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membership.component.html',
  styleUrl: './membership.component.css'
})
export class MembershipComponent {
  activeTab: string = 'monthly';

  membershipPlans = {
    monthly: [
      {
        title: 'Basic Membership',
        price: 25.00,
        period: 'Per Month',
        description: 'Perfect for beginners looking to explore golf with basic access and amenities.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Basic Equipment Rental', included: true },
          { name: 'Guest Privileges (2 per month)', included: true },
          { name: 'Priority Course Booking', included: false },
          { name: 'Professional Training Sessions', included: false },
          { name: 'Tournament Participation', included: false },
          { name: 'Clubhouse Dining Discounts', included: false }
        ]
      },
      {
        title: 'Regular Membership',
        price: 55.00,
        period: 'Per Month',
        description: 'Ideal for regular players who want enhanced access and exclusive benefits.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Basic Equipment Rental', included: true },
          { name: 'Guest Privileges (5 per month)', included: true },
          { name: 'Priority Course Booking', included: true },
          { name: 'Professional Training Sessions', included: true },
          { name: 'Tournament Participation', included: false },
          { name: 'Clubhouse Dining Discounts', included: false }
        ]
      },
      {
        title: 'Premium Membership',
        price: 95.00,
        period: 'Per Month',
        description: 'Complete access to all facilities and exclusive premium member benefits.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Premium Equipment Rental', included: true },
          { name: 'Unlimited Guest Privileges', included: true },
          { name: 'Priority Course Booking', included: true },
          { name: 'Professional Training Sessions', included: true },
          { name: 'Tournament Participation', included: true },
          { name: 'Clubhouse Dining Discounts', included: true }
        ]
      }
    ],
    yearly: [
      {
        title: 'Basic Membership',
        price: 250.00,
        period: 'Per Year',
        description: 'Perfect for beginners looking to explore golf with basic access and amenities.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Basic Equipment Rental', included: true },
          { name: 'Guest Privileges (2 per month)', included: true },
          { name: 'Priority Course Booking', included: false },
          { name: 'Professional Training Sessions', included: false },
          { name: 'Tournament Participation', included: false },
          { name: 'Clubhouse Dining Discounts', included: false }
        ]
      },
      {
        title: 'Regular Membership',
        price: 580.00,
        period: 'Per Year',
        description: 'Ideal for regular players who want enhanced access and exclusive benefits.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Basic Equipment Rental', included: true },
          { name: 'Guest Privileges (5 per month)', included: true },
          { name: 'Priority Course Booking', included: true },
          { name: 'Professional Training Sessions', included: true },
          { name: 'Tournament Participation', included: false },
          { name: 'Clubhouse Dining Discounts', included: false }
        ]
      },
      {
        title: 'Premium Membership',
        price: 980.00,
        period: 'Per Year',
        description: 'Complete access to all facilities and exclusive premium member benefits.',
        features: [
          { name: 'Access to Practice Range', included: true },
          { name: 'Premium Equipment Rental', included: true },
          { name: 'Unlimited Guest Privileges', included: true },
          { name: 'Priority Course Booking', included: true },
          { name: 'Professional Training Sessions', included: true },
          { name: 'Tournament Participation', included: true },
          { name: 'Clubhouse Dining Discounts', included: true }
        ]
      }
    ]
  };

  // Current membership status for the user
  currentMemberships = [
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

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  choosePlan(plan: any) {
    console.log('Selected plan:', plan);
    // Add your plan selection logic here
  }

  renewMembership(membership: any) {
    console.log('Renewing membership:', membership);
    // Add your renewal logic here
  }

  getCurrentPlans() {
    return this.membershipPlans[this.activeTab as keyof typeof this.membershipPlans];
  }
}
