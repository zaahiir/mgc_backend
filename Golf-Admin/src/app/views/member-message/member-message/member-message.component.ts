import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { cilPen } from '@coreui/icons';
import { IconDirective } from '@coreui/icons-angular';
import { FormsModule } from '@angular/forms';
import {
  TooltipDirective,
  RowComponent,
  ColComponent,
  CardComponent,
  CardBodyComponent,
  ButtonDirective,
  TableDirective,
  PaginationComponent,
  PageItemComponent,
  PageLinkDirective,
  FormControlDirective
} from '@coreui/angular';
import { MemberMessageService } from '../../common-service/member-message/member-message.service';
import Swal from 'sweetalert2';

// Message Interface
interface MessageInterface {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-member-message',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    TooltipDirective,
    IconDirective,
    RouterLink,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    FormsModule,
    FormControlDirective,
    ButtonDirective,
    TableDirective,
    PaginationComponent,
    PageItemComponent,
    PageLinkDirective,
  ],
  templateUrl: './member-message.component.html',
  styleUrl: './member-message.component.scss'
})
export class MemberMessageComponent implements OnInit {
  icons = { cilPen };
  tooltipViewText = 'View Message';
  tooltipMarkReadText = 'Mark as Read';
  tooltipMarkRepliedText = 'Mark as Replied';
  tooltipMarkClosedText = 'Mark as Closed';
  Math = Math; // Add Math for template access

  messageList: MessageInterface[] = [];
  filteredList: MessageInterface[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;
  searchTerm: string = '';

  constructor(
    private memberMessageService: MemberMessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMessageList();
  }

  async loadMessageList() {
    try {
      this.isLoading = true;
      const response = await this.memberMessageService.listMemberMessage('0');
      
      if (response.data.status === 'success') {
        this.messageList = response.data.data;
        this.filteredList = [...this.messageList];
        this.updatePageRange();
      } else {
        console.error('Error loading messages:', response.data.message);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to load messages'
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load messages'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async markMessageAsRead(messageId: number) {
    try {
      const response = await this.memberMessageService.markMessageAsRead(messageId.toString());
      
      if (response.data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Message marked as read'
        });
        this.loadMessageList(); // Reload the list
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to mark message as read'
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark message as read'
      });
    }
  }

  async markMessageAsReplied(messageId: number) {
    try {
      const response = await this.memberMessageService.markMessageAsReplied(messageId.toString());
      
      if (response.data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Message marked as replied'
        });
        this.loadMessageList(); // Reload the list
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to mark message as replied'
        });
      }
    } catch (error) {
      console.error('Error marking message as replied:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark message as replied'
      });
    }
  }

  async markMessageAsClosed(messageId: number) {
    try {
      const response = await this.memberMessageService.markMessageAsClosed(messageId.toString());
      
      if (response.data.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Message marked as closed'
        });
        this.loadMessageList(); // Reload the list
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: response.data.message || 'Failed to mark message as closed'
        });
      }
    } catch (error) {
      console.error('Error marking message as closed:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark message as closed'
      });
    }
  }

  getStatusText(message: MessageInterface): string {
    switch (message.status) {
      case 'new':
        return 'New';
      case 'read':
        return 'Read';
      case 'replied':
        return 'Replied';
      case 'closed':
        return 'Closed';
      default:
        return 'Unknown';
    }
  }

  getStatusClass(message: MessageInterface): string {
    switch (message.status) {
      case 'new':
        return 'bg-warning';
      case 'read':
        return 'bg-info';
      case 'replied':
        return 'bg-success';
      case 'closed':
        return 'bg-secondary';
      default:
        return 'bg-light';
    }
  }

  isMessageNew(message: MessageInterface): boolean {
    return message.status === 'new';
  }

  isMessageRead(message: MessageInterface): boolean {
    return message.status === 'read' || message.status === 'replied' || message.status === 'closed';
  }

  isMessageReplied(message: MessageInterface): boolean {
    return message.status === 'replied';
  }

  isMessageClosed(message: MessageInterface): boolean {
    return message.status === 'closed';
  }

  filterList() {
    if (!this.searchTerm.trim()) {
      this.filteredList = [...this.messageList];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredList = this.messageList.filter(message =>
        message.name.toLowerCase().includes(searchLower) ||
        message.email.toLowerCase().includes(searchLower) ||
        message.subject.toLowerCase().includes(searchLower) ||
        message.description.toLowerCase().includes(searchLower) ||
        message.phone.toLowerCase().includes(searchLower)
      );
    }
    this.currentPage = 1;
    this.updatePageRange();
  }

  updatePageRange() {
    const totalPages = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    
    this.pageRange = [];
    
    for (let i = Math.max(1, current - delta); i <= Math.min(totalPages, current + delta); i++) {
      this.pageRange.push(i);
    }
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  get paginatedMessageList() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredList.slice(startIndex, endIndex);
  }

  get totalPages() {
    return Math.ceil(this.filteredList.length / this.itemsPerPage);
  }

  search() {
    this.filterList();
  }
}
