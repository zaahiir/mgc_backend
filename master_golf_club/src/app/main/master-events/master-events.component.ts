import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventsService, Event } from '../common-service/events/events.service';

@Component({
  selector: 'app-master-events',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './master-events.component.html',
  styleUrl: './master-events.component.css'
})
export class MasterEventsComponent implements OnInit {
  events: Event[] = [];
  loading = true;
  error = '';

  constructor(private eventsService: EventsService) { }

  ngOnInit(): void {
    this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    this.loading = true;
    this.error = '';
    
    try {
      const response = await this.eventsService.getActiveEvents();
      console.log('API Response:', response);
      
      // Handle the response structure properly
      if (response.data && response.data.status === 'success') {
        // The events are in response.data.data array
        this.events = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        // Direct array response
        this.events = response.data;
      } else {
        // Fallback
        this.events = [];
      }
      
      console.log('Processed events:', this.events);
      this.loading = false;
    } catch (error: any) {
      console.error('Error loading events:', error);
      this.error = 'Failed to load events';
      this.loading = false;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getEventImageUrl(event: Event): string {
    return event.EventImageUrl || 'assets/images/resource/event-default.jpg';
  }
}
