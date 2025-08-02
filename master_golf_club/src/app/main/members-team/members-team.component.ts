import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemberTeamService } from '../common-service/member-team/member-team.service';

interface Instructor {
  id: number;
  instructorName: string;
  instructorPosition: string;
  instructorPhotoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
}

@Component({
  selector: 'app-members-team',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members-team.component.html',
  styleUrl: './members-team.component.css'
})
export class MembersTeamComponent implements OnInit {
  teamMembers: Instructor[] = [];
  loading: boolean = true;
  error: string | null = null;

  constructor(private memberTeamService: MemberTeamService) {}

  ngOnInit() {
    this.loadInstructors();
  }

  loadInstructors() {
    this.loading = true;
    this.error = null;

    this.memberTeamService.getActiveInstructors()
      .then(response => {
        if (response.data && response.data.status === 'success') {
          this.teamMembers = response.data.data.map((instructor: any) => ({
            id: instructor.id,
            instructorName: instructor.instructorName,
            instructorPosition: instructor.instructorPosition,
            instructorPhotoUrl: instructor.instructorPhotoUrl,
            facebookUrl: instructor.facebookUrl,
            instagramUrl: instructor.instagramUrl,
            twitterUrl: instructor.twitterUrl
          }));
        } else {
          this.error = 'Failed to load instructors';
        }
      })
      .catch(error => {
        console.error('Error loading instructors:', error);
        this.error = 'Failed to load instructors. Please try again later.';
      })
      .finally(() => {
        this.loading = false;
      });
  }

  getSocialLinks(instructor: Instructor) {
    return {
      facebook: instructor.facebookUrl || '#',
      twitter: instructor.twitterUrl || '#',
      instagram: instructor.instagramUrl || '#',
      linkedin: '#'
    };
  }

  getInstructorImage(instructor: Instructor): string {
    return instructor.instructorPhotoUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3';
  }
}
