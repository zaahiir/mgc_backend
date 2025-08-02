import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

export interface Event {
  id: number;
  EventTitle: string;
  EventDate: string;
  EventVenue: string;
  EventEntryPrice: string;
  EventImageUrl?: string;
  EventDetailImages?: string[];
  EventActivitiesImages?: string[];
  EventDetails?: string;
  EventActivities?: string;
  EventDetailOrganizer?: string;
  EventEndDate?: string;
  EventTime?: string;
  EventEmail?: string;
  EventPhone?: string;
  is_active: boolean;
  memberInterest?: {
    is_interested: boolean;
    interest_id: number | null;
  };
}

export interface EventInterest {
  id: number;
  member: number;
  memberName: string;
  memberFullName: string;
  event: number;
  eventTitle: string;
  is_interested: boolean;
  interested_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  private apiUrl: string;
  private activeEventsUrl: string;
  private eventDetailUrl: string;
  private showInterestUrl: string;
  private toggleInterestUrl: string;
  private memberInterestsUrl: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.activeEventsUrl = this.apiUrl + "event/active_events/";
    this.eventDetailUrl = this.apiUrl + "event/{id}/event_detail/";
    this.showInterestUrl = this.apiUrl + "eventInterest/";
    this.toggleInterestUrl = this.apiUrl + "eventInterest/{id}/toggle_interest/";
    this.memberInterestsUrl = this.apiUrl + "eventInterest/member_interests/";
  }

  getActiveEvents() {
    return axios.get(this.activeEventsUrl);
  }

  getEventDetails(eventId: number) {
    return axios.get(this.eventDetailUrl.replace('{id}', eventId.toString()));
  }

  showInterest(eventId: number) {
    const config: any = {};
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
    return axios.post(this.showInterestUrl, { event: eventId, is_interested: true }, config);
  }

  toggleInterest(interestId: number) {
    const config: any = {};
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    }
    return axios.post(this.toggleInterestUrl.replace('{id}', interestId.toString()), {}, config);
  }

  getMemberInterests() {
    const config: any = {};
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers = {
        'Authorization': `Bearer ${token}`
      };
    }
    return axios.get(this.memberInterestsUrl, config);
  }
}
