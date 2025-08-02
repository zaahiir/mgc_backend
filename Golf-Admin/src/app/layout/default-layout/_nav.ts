import { INavData } from '@coreui/angular';

export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cil-speedometer' }
  },
  {
    name: 'About',
    url: '/about',
    iconComponent: { name: 'cil-star' }
  },
  {
    name: 'Update Concept',
    url: '/concept',
    iconComponent: { name: 'cil-indent-decrease' }
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
    name: 'Plan',
    url: '/plan',
    iconComponent: { name: 'cil-notes' }
  },
  {
    name: 'Members',
    url: '/members',
    iconComponent: { name: 'cilPeople' }
  },
  {
    name: 'Booking',
    url: '/bookings',
    iconComponent: { name: 'cil-pencil' }
  },
  {
    name: 'Amenities',
    url: '/amenities',
    iconComponent: { name: 'cil-location-pin' }
  },
  {
    name: 'Courses',
    url: '/courses',
    iconComponent: { name: 'cil-layers' }
  },
  {
    name: 'Blog',
    url: '/blog',
    iconComponent: { name: 'cil-indent-decrease' }
  },
  {
    name: 'Events',
    url: '/events',
    iconComponent: { name: 'cil-calendar' }
  },
  {
    name: 'Team',
    url: '/team',
    iconComponent: { name: 'cil-star' }
  },
  {
    name: 'Contact',
    url: '/contact',
    iconComponent: { name: 'cil-credit-card' }
  },
  // {
  //   name: 'Coupon',
  //   url: '/coupon',
  //   iconComponent: { name: 'cil-credit-card' }
  // },
  {
    name: 'Report',
    url: '/base/popovers',
    iconComponent: { name: 'cil-description' }
  }
];
