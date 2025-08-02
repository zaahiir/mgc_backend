import { Component, OnInit } from '@angular/core';
import { NgClass, NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { cilPen, cilTrash } from '@coreui/icons';
import { IconDirective } from '@coreui/icons-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TooltipDirective, RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormDirective, FormLabelDirective, FormControlDirective, ButtonDirective,  TableDirective, TableColorDirective, TableActiveDirective, BorderDirective, AlignDirective, PaginationComponent, PageItemComponent, PageLinkDirective, PageItemDirective  } from '@coreui/angular';
import Swal from 'sweetalert2';
import { MemberEventsService } from '../../common-service/member-events/member-events.service';

@Component({
  selector: 'app-list-events',
  standalone: true,
  imports: [NgClass, CommonModule, TooltipDirective, IconDirective, RouterLink, RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective, FormLabelDirective, FormControlDirective, ButtonDirective, NgStyle,  TableDirective, TableColorDirective, TableActiveDirective, BorderDirective, AlignDirective, PaginationComponent, PageItemComponent, PageLinkDirective, PageItemDirective ],
  templateUrl: './list-events.component.html',
  styleUrl: './list-events.component.scss'
})
export class ListEventsComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Edit';
  tooltipDeleteText = 'Delete';
  
  isLoading = false;
  searchTerm: string = '';
  events: any[] = [];
  filteredEvents: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  constructor(private memberEventsService: MemberEventsService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  async loadEvents(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.memberEventsService.listEvent();
      this.events = response.data || [];
      this.filteredEvents = [...this.events];
      this.calculatePagination();
    } catch (error) {
      console.error('Error loading events:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load events',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.isLoading = false;
    }
  }

  search(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEvents = [...this.events];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredEvents = this.events.filter(event => 
        event.EventTitle?.toLowerCase().includes(searchLower) ||
        event.EventVenue?.toLowerCase().includes(searchLower) ||
        event.EventDate?.toLowerCase().includes(searchLower) ||
        event.EventTime?.toLowerCase().includes(searchLower)
      );
    }
    this.currentPage = 1;
    this.calculatePagination();
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredEvents.length / this.itemsPerPage);
  }

  get paginatedEvents(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredEvents.slice(startIndex, endIndex);
  }

  get pageRange(): number[] {
    const pages: number[] = [];
    const maxPages = Math.min(5, this.totalPages);
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  async deleteEvent(eventId: number): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        this.isLoading = true;
        await this.memberEventsService.deleteEvent(eventId.toString());
        
        await Swal.fire(
          'Deleted!',
          'Event has been deleted.',
          'success'
        );
        
        this.loadEvents(); // Reload the list
      } catch (error) {
        console.error('Error deleting event:', error);
        await Swal.fire({
          title: 'Error!',
          text: 'Failed to delete event',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  getEventStatus(event: any): string {
    if (!event.is_active) return 'Inactive';
    if (event.is_featured) return 'Featured';
    return 'Active';
  }

  getStatusClass(event: any): string {
    if (!event.is_active) return 'text-danger';
    if (event.is_featured) return 'text-success';
    return 'text-primary';
  }
}
