import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' }
  },
  {
    name: 'Enquiries',
    url: '/enquiry',
    iconComponent: { name: 'cil-notes' }
  },
  {
    name: 'Member Enquiries',
    url: '/memberEnquiry',
    iconComponent: { name: 'cil-location-pin' }
  },
  {
    name: 'Booking',
    url: '/bookings',
    iconComponent: { name: 'cil-pencil' }
  },
  {
    name: 'Members',
    url: '/members',
    iconComponent: { name: 'cilPeople' }
  },
  {
    name: 'Plan',
    url: '/plan',
    iconComponent: { name: 'cil-notes' }
  },
  {
    name: 'Courses',
    url: '/courses',
    iconComponent: { name: 'cil-layers' }
  },
  {
    name: 'Tee',
    url: '/tee',
    iconComponent: { name: 'cil-location-pin' }
  },
  {
    name: 'Amenities',
    url: '/amenities',
    iconComponent: { name: 'cil-location-pin' }
  },
  {
    name: 'Events',
    url: '/events',
    iconComponent: { name: 'cil-calendar' }
  },
  {
    name: 'Tournament',
    url: '/tournament',
    iconComponent: { name: 'cil-star' }
  },
  {
    name: 'ScoreBoard',
    url: '/scoreBoard',
    iconComponent: { name: 'cil-list-numbered' }
  },
  {
    name: 'Blog',
    url: '/blog',
    iconComponent: { name: 'cil-indent-decrease' }
  },
  {
    name: 'Update Concept',
    url: '/concept',
    iconComponent: { name: 'cil-indent-decrease' }
  },
  {
    name: 'Coupon',
    url: '/coupon',
    iconComponent: { name: 'cil-credit-card' }
  },
  {
    name: 'Report',
    url: '/base/popovers',
    iconComponent: { name: 'cil-description' }
  }
];
