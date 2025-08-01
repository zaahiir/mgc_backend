import { Injectable } from '@angular/core';
import { BaseAPIUrl, baseURLType } from '../commom-api-url';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class MemberEventsService {
  private apiUrl: string;
  private lists: string;
  private processing: string;
  private deletion: string;
  private activeEvents: string;
  private featuredEvents: string;

  constructor() {
    this.apiUrl = new BaseAPIUrl().getUrl(baseURLType);
    this.lists = this.apiUrl + "event/0/listing/";
    this.processing = this.apiUrl + "event/0/processing/";
    this.deletion = this.apiUrl + "event/0/deletion/";
    this.activeEvents = this.apiUrl + "event/active_events/";
    this.featuredEvents = this.apiUrl + "event/featured_events/";
  }

  listEvent(id: string = '0') {
    return axios.get(this.lists.replace('0', id));
  }

  processEvent(data: any, id: string = '0') {
    return axios.post(this.processing.replace('0', id), data);
  }

  deleteEvent(id: string) {
    return axios.get(this.deletion.replace('0', id));
  }

  getActiveEvents() {
    return axios.get(this.activeEvents);
  }

  getFeaturedEvents() {
    return axios.get(this.featuredEvents);
  }

  getEventBySlug(slug: string) {
    return axios.get(`${this.apiUrl}event/${slug}/by_slug/`);
  }
}
