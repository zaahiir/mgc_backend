import { Component, OnInit } from '@angular/core';
import { NgClass, NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { cilPen, cilTrash } from '@coreui/icons';
import { IconDirective } from '@coreui/icons-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import {
  TooltipDirective,
  RowComponent,
  ColComponent,
  TextColorDirective,
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  FormDirective,
  FormLabelDirective,
  FormControlDirective,
  ButtonDirective,
  TableDirective,
  TableColorDirective,
  TableActiveDirective,
  BorderDirective,
  AlignDirective,
  PaginationComponent,
  PageItemComponent,
  PageLinkDirective,
  PageItemDirective
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { MemberService } from '../../common-service/member/member.service';

interface Member {
  id: number;
  golfClubId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

@Component({
  selector: 'app-list-members',
  standalone: true,
  imports: [
    NgClass,
    CommonModule,
    TooltipDirective,
    IconDirective,
    RouterLink,
    RowComponent,
    ColComponent,
    TextColorDirective,
    CardComponent,
    CardBodyComponent,
    ReactiveFormsModule,
    FormsModule,
    FormDirective,
    FormControlDirective,
    ButtonDirective,
    TableDirective,
    PaginationComponent,
    PageItemComponent,
    PageLinkDirective,
  ],
  templateUrl: './list-members.component.html',
  styleUrl: './list-members.component.scss'
})
export class ListMembersComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Edit';
  tooltipDeleteText = 'Delete';

  isLoading = false;
  searchTerm = '';
  members: Member[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;

  constructor(private memberService: MemberService) {}

  ngOnInit() {
    this.loadMembers();
  }

  updatePageRange() {
    const totalPages = this.totalPages;
    let start = Math.max(1, this.currentPage - 1);
    let end = Math.min(totalPages, start + 2);

    if (end === totalPages) {
      start = Math.max(1, totalPages - 2);
    }

    this.pageRange = Array.from({length: Math.min(3, totalPages)}, (_, i) => start + i);
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

  async loadMembers() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      const response = await this.memberService.listMember();
      if (response.data?.data) {
        this.members = response.data.data;
        this.updatePageRange();
      } else {
        throw new Error('Failed to load members');
      }
    } catch (error) {
      console.error('Error loading members:', error);
      await Swal.fire('Error', 'Failed to load members', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  search() {
    this.currentPage = 1;
    this.updatePageRange();
  }

  get paginatedMembers() {
    let filtered = this.members;
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = this.members.filter(member =>
        member.golfClubId?.toLowerCase().includes(searchTermLower) ||
        member.firstName?.toLowerCase().includes(searchTermLower) ||
        member.lastName?.toLowerCase().includes(searchTermLower) ||
        member.email?.toLowerCase().includes(searchTermLower) ||
        member.phoneNumber?.includes(this.searchTerm)
      );
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    const filteredLength = this.searchTerm ?
      this.members.filter(member =>
        member.golfClubId?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        member.firstName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        member.lastName?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        member.phoneNumber?.includes(this.searchTerm)
      ).length :
      this.members.length;
    return Math.ceil(filteredLength / this.itemsPerPage);
  }

  async deleteMember(memberId: number) {
    if (this.isLoading) return;

    try {
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
        this.isLoading = true;
        const response = await this.memberService.deleteMember(memberId.toString());

        if (response.data?.code === 1) {
          await Swal.fire('Deleted!', 'Member has been deleted.', 'success');
          await this.loadMembers();
        } else {
          throw new Error(response.data?.message || 'Failed to delete member');
        }
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      await Swal.fire('Error', 'Failed to delete member', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  getFullName(member: Member): string {
    return `${member.firstName || ''} ${member.lastName || ''}`.trim();
  }
}
