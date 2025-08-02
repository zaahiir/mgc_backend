import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faShare, faHashtag, faImage, faGlobe, faLink
} from '@fortawesome/free-solid-svg-icons';
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

interface Protocol {
  id: number;
  protocolTitle: string;
  protocolDescription: string;
}

@Component({
  selector: 'app-members-team',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './members-team.component.html',
  styleUrl: './members-team.component.css'
})
export class MembersTeamComponent implements OnInit {
  // Social media icons using solid icons as placeholders
  facebookIcon = faGlobe;
  twitterIcon = faHashtag;
  xTwitterIcon = faHashtag;
  instagramIcon = faImage;

  teamMembers: Instructor[] = [];
  protocols: Protocol[] = [];
  loading: boolean = true;
  protocolLoading: boolean = true;
  error: string | null = null;
  protocolError: string | null = null;

  constructor(private memberTeamService: MemberTeamService) {}

  ngOnInit() {
    this.loadInstructors();
    this.loadProtocols();
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

  loadProtocols() {
    this.protocolLoading = true;
    this.protocolError = null;

    this.memberTeamService.getActiveProtocols()
      .then(response => {
        if (response.data && response.data.status === 'success') {
          this.protocols = response.data.data.map((protocol: any) => ({
            id: protocol.id,
            protocolTitle: protocol.protocolTitle,
            protocolDescription: protocol.protocolDescription
          }));
        } else {
          this.protocolError = 'Failed to load protocols';
        }
      })
      .catch(error => {
        console.error('Error loading protocols:', error);
        this.protocolError = 'Failed to load protocols. Please try again later.';
      })
      .finally(() => {
        this.protocolLoading = false;
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

  getProtocolTitle(): string {
    if (this.protocols.length > 0) {
      return this.protocols[0].protocolTitle;
    }
    return 'Dress Code Policies & Clubhouse Info';
  }

  getProtocolDescription(): string {
    if (this.protocols.length > 0) {
      return this.protocols[0].protocolDescription;
    }
    return 'Our golf club maintains the highest standards of elegance and professionalism. We believe that proper attire enhances the overall experience for all members and guests, creating an atmosphere of respect and tradition. Our golf club maintains the highest standards of elegance and professionalism. We believe that proper attire enhances the overall experience for all members and guests, creating an atmosphere of respect and tradition. Our golf club maintains the highest standards of elegance and professionalism. We believe that proper attire enhances the overall experience for all members and guests, creating an atmosphere of respect and tradition.';
  }
}
