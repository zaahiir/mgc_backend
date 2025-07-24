import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-members-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members-team.component.html',
  styleUrl: './members-team.component.css'
})
export class MembersTeamComponent {
  // Team members data
  teamMembers = [
    {
      id: 1,
      name: 'John Smith',
      role: 'Club President',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3',
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
        linkedin: '#'
      }
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      role: 'Operations Manager',
      image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3',
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
        linkedin: '#'
      }
    },
    {
      id: 3,
      name: 'Michael Chen',
      role: 'Head Coach',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3',
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
        linkedin: '#'
      }
    },
    {
      id: 4,
      name: 'Emily Davis',
      role: 'Membership Director',
      image: 'https://images.unsplash.com/photo-1502767089025-6572583495f9?ixlib=rb-4.0.3',
      socialLinks: {
        facebook: '#',
        twitter: '#',
        instagram: '#',
        linkedin: '#'
      }
    }
  ];

  constructor() {}
}
