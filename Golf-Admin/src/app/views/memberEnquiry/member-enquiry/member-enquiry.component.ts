// Updated member-enquiry.component.ts with getPlanName method

import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { cilPen, cilTrash } from '@coreui/icons';
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
import { MemberEnquiryService } from '../../common-service/memberEnquiry/member-enquiry.service';
import Swal from 'sweetalert2';

// Updated MemberEnquiryInterface
interface MemberEnquiryInterface {
  id: number;
  memberEnquiryDate: string;
  memberEnquiryPlan: any;
  memberEnquiryFirstName: string;
  memberEnquiryLastName: string;
  memberEnquiryPhoneNumber: string;
  memberEnquiryEmail: string;
  memberEnquiryMessage: string;
  isConverted?: boolean; // Add this field to track conversion status
  convertedMemberId?: string; // Add this field to store the member ID after conversion
  convertedDate?: string; // Add this field to store conversion date
}

// Updated MemberEnquiryComponent
@Component({
  selector: 'app-member-enquiry',
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
  templateUrl: './member-enquiry.component.html',
  styleUrl: './member-enquiry.component.scss'
})
export class MemberEnquiryComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Convert to Member';
  tooltipDeleteText = 'Delete';
  tooltipConvertedText = 'Already Converted to Member';

  memberEnquiryList: MemberEnquiryInterface[] = [];
  filteredList: MemberEnquiryInterface[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;
  searchTerm: string = '';

  constructor(
    private memberEnquiryService: MemberEnquiryService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMemberEnquiryList();
  }

  getPlanName(plan: any): string {
    if (!plan) return 'N/A';

    if (typeof plan === 'object' && plan.planName) {
      return plan.planName;
    }

    if (typeof plan === 'string' || typeof plan === 'number') {
      return plan.toString();
    }

    return 'N/A';
  }

  async loadMemberEnquiryList() {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      const response = await this.memberEnquiryService.listMemberEnquiry('0');
      if (response.data.code === 1) {
        this.memberEnquiryList = response.data.data;
        this.filterList();
        this.updatePageRange();
      } else {
        await Swal.fire('Error', 'Failed to load member enquiry list', 'error');
      }
    } catch (error) {
      await Swal.fire('Error', 'An error occurred while loading the list', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  convertToMember(enquiryId: number) {
    // Check if already converted
    const enquiry = this.memberEnquiryList.find(e => e.id === enquiryId);
    if (enquiry?.isConverted) {
      Swal.fire('Info', 'This enquiry has already been converted to a member.', 'info');
      return;
    }

    // Navigate to create member page with enquiry ID as query parameter
    this.router.navigate(['/members/add'], {
      queryParams: { enquiryId: enquiryId }
    });
  }

  // Method to check if an enquiry is converted
  isEnquiryConverted(enquiry: MemberEnquiryInterface): boolean {
    return enquiry.isConverted === true;
  }

  // Method to get the status display text
  getStatusText(enquiry: MemberEnquiryInterface): string {
    if (enquiry.isConverted) {
      return `Converted (${enquiry.convertedMemberId || 'Member ID'})`;
    }
    return 'Pending';
  }

  filterList() {
    if (!this.searchTerm) {
      this.filteredList = [...this.memberEnquiryList];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim();
    this.filteredList = this.memberEnquiryList.filter(enquiry => {
      const fullName = `${enquiry.memberEnquiryFirstName || ''} ${enquiry.memberEnquiryLastName || ''}`.toLowerCase();
      const planName = this.getPlanName(enquiry.memberEnquiryPlan).toLowerCase();
      const status = this.getStatusText(enquiry).toLowerCase();

      const searchableFields = [
        planName,
        fullName,
        (enquiry.memberEnquiryPhoneNumber || '').toLowerCase(),
        (enquiry.memberEnquiryEmail || '').toLowerCase(),
        status
      ];

      return searchableFields.some(field => field.includes(searchTermLower));
    });
  }

  updatePageRange() {
    const totalPages = this.totalPages;
    let start = Math.max(1, this.currentPage - 1);
    let end = Math.min(totalPages, start + 2);

    if (end === totalPages) {
      start = Math.max(1, totalPages - 2);
    }

    this.pageRange = Array.from({ length: Math.min(3, totalPages) }, (_, i) => start + i);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages && !this.isLoading) {
      this.currentPage = page;
      this.updatePageRange();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages && !this.isLoading) {
      this.changePage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1 && !this.isLoading) {
      this.changePage(this.currentPage - 1);
    }
  }

  get paginatedMemberEnquiryList() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredList.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredList.length / this.itemsPerPage);
  }

  search() {
    this.filterList();
    this.currentPage = 1;
    this.updatePageRange();
  }
}
