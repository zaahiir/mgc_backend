import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ActivatedRoute, Router } from '@angular/router';
import { EventsService, Event } from '../common-service/events/events.service';
import { AuthService } from '../../auth/auth.service';
import { 
  faCalendarAlt, faMapMarkerAlt, faClock, faUser, 
  faEnvelope, faPhone, faHeart, faHeartBroken, 
  faCheckCircle, faSpinner, faExclamationTriangle,
  faUsers, faCalendarDay, faCalendarCheck, faMoneyBillWave,
  faBuilding, faInfoCircle, faSignInAlt, faTimes
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent implements OnInit {
  eventId: number | null = null;
  eventData: Event | null = null;
  loading = true;
  error = '';
  isMember = false;
  memberId: number | null = null;
  interestLoading = false;

  // Icons
  calendarIcon = faCalendarAlt;
  locationIcon = faMapMarkerAlt;
  clockIcon = faClock;
  userIcon = faUser;
  emailIcon = faEnvelope;
  phoneIcon = faPhone;
  heartIcon = faHeart;
  heartBrokenIcon = faHeartBroken;
  checkCircleIcon = faCheckCircle;
  spinnerIcon = faSpinner;
  exclamationTriangleIcon = faExclamationTriangle;
  usersIcon = faUsers;
  calendarDayIcon = faCalendarDay;
  calendarCheckIcon = faCalendarCheck;
  moneyIcon = faMoneyBillWave;
  buildingIcon = faBuilding;
  infoIcon = faInfoCircle;
  signInIcon = faSignInAlt;
  timesIcon = faTimes;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventsService: EventsService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.checkMemberStatus();
    
    // Subscribe to route parameters
    this.route.params.subscribe(params => {
      this.eventId = params['id'] ? parseInt(params['id']) : null;
      
      if (this.eventId) {
        this.fetchEventData();
      } else {
        this.error = 'Event ID not found';
        this.loading = false;
      }
    });
  }

  private checkMemberStatus(): void {
    const userType = this.authService.getUserType();
    const userId = this.authService.getUserId();
    
    this.isMember = userType === 'member';
    this.memberId = userId;
  }

  async loadEventData(): Promise<void> {
    this.loading = true;
    this.error = '';
    
    if (this.eventId) {
      await this.fetchEventData();
    } else {
      this.error = 'Event ID not found';
      this.loading = false;
    }
  }

  private async fetchEventData(): Promise<void> {
    if (!this.eventId) return;

    try {
      // Fetch event details
      const response = await this.eventsService.getEventDetails(this.eventId);
      
      if (response.data && response.data.status === 'success') {
        this.eventData = response.data.data;
      } else if (response.data) {
        this.eventData = response.data;
      } else {
        this.error = 'Failed to load event data';
      }

      this.loading = false;
    } catch (error: any) {
      console.error('Error loading event:', error);
      this.error = 'Failed to load event details';
      this.loading = false;
    }
  }

  async showInterest(): Promise<void> {
    if (!this.isMember || !this.eventId) {
      return;
    }

    this.interestLoading = true;

    try {
      const response = await this.eventsService.showInterest(this.eventId);
      
      if (response.data && response.data.status === 'success') {
        // Update the event data to reflect the new interest status
        if (this.eventData) {
          this.eventData.memberInterest = {
            is_interested: true,
            interest_id: response.data.data?.id || null
          };
        }
        alert('Interest registered successfully!');
      } else {
        const errorMessage = response.data?.message || 'Failed to register interest. Please try again.';
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Error showing interest:', error);
      const errorMessage = error.response?.data?.message || 'Failed to register interest. Please try again.';
      alert(errorMessage);
    } finally {
      this.interestLoading = false;
    }
  }

  async toggleInterest(): Promise<void> {
    if (!this.isMember || !this.eventData?.memberInterest?.interest_id) {
      return;
    }

    this.interestLoading = true;

    try {
      const response = await this.eventsService.toggleInterest(this.eventData.memberInterest.interest_id);
      
      if (response.data && response.data.status === 'success') {
        // Update the event data to reflect the new interest status
        if (this.eventData && this.eventData.memberInterest) {
          this.eventData.memberInterest.is_interested = !this.eventData.memberInterest.is_interested;
        }
        
        const action = this.eventData?.memberInterest?.is_interested ? 'registered' : 'removed';
        alert(`Interest ${action} successfully!`);
      } else {
        const errorMessage = response.data?.message || 'Failed to update interest. Please try again.';
        alert(errorMessage);
      }
    } catch (error: any) {
      console.error('Error toggling interest:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update interest. Please try again.';
      alert(errorMessage);
    } finally {
      this.interestLoading = false;
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  getEventImageUrl(event: Event): string {
    return event.EventImageUrl || 'assets/images/resource/event-default.jpg';
  }

  isInterested(): boolean {
    return this.eventData?.memberInterest?.is_interested || false;
  }

  canShowInterestButton(): boolean {
    return this.isMember && this.eventData !== null;
  }
}
