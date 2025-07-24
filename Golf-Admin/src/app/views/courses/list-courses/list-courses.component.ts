import { Component, OnInit } from '@angular/core';
import { NgClass, NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { cilPen, cilTrash } from '@coreui/icons';
import { IconDirective } from '@coreui/icons-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TooltipDirective, RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormDirective, FormControlDirective, ButtonDirective, TableDirective, PaginationComponent, PageItemComponent, PageLinkDirective } from '@coreui/angular';
import { CourseService } from '../../common-service/course/course.service';
import Swal from 'sweetalert2';

interface CourseInterface {
  id: number;
  name?: string;           // From CourseDetailSerializer
  courseName?: string;     // From direct model field
  address?: string;        // From CourseDetailSerializer
  courseAddress?: string;  // From direct model field
  phone?: string;          // From CourseDetailSerializer
  coursePhoneNumber?: string; // From direct model field
  website?: string;        // From CourseDetailSerializer
  courseWebsite?: string;  // From direct model field
  location?: string;       // From CourseDetailSerializer
  courseLocation?: string; // From direct model field
  timing?: string;         // From CourseDetailSerializer
  courseOpenFrom?: string; // From direct model field
  description?: string;    // From CourseDetailSerializer
  courseDescription?: string; // From direct model field
  imageUrl?: string;       // From serializer method
  amenities?: number[];    // From serializer method
}

@Component({
  selector: 'app-list-courses',
  standalone: true,
  imports: [
    CommonModule, TooltipDirective, IconDirective, RouterLink,
    RowComponent, ColComponent, TextColorDirective, CardComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule,
    FormDirective, FormControlDirective, ButtonDirective,
    TableDirective,
    PaginationComponent, PageItemComponent,
    PageLinkDirective,
  ],
  templateUrl: './list-courses.component.html',
  styleUrl: './list-courses.component.scss'
})
export class ListCoursesComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Edit';
  tooltipDeleteText = 'Delete';

  courseList: CourseInterface[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;
  searchTerm: string = '';

  constructor(private courseService: CourseService) {}

  ngOnInit() {
    this.loadCourseList();
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

  async loadCourseList() {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      const response = await this.courseService.listCourse('0');
      if (response.data.code === 1) {
        this.courseList = response.data.data;
        this.updatePageRange();
      } else {
        await Swal.fire('Error', 'Failed to load Course list', 'error');
      }
    } catch (error) {
      console.error('Error loading Course list:', error);
      await Swal.fire('Error', 'An error occurred while loading the Course list', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  search() {
    this.currentPage = 1;
    this.updatePageRange();
  }

  // Helper methods to safely get field values
  getCourseName(course: CourseInterface): string {
    return course.name || course.courseName || 'N/A';
  }

  getCourseAddress(course: CourseInterface): string {
    return course.address || course.courseAddress || 'N/A';
  }

  getCoursePhone(course: CourseInterface): string {
    return course.phone || course.coursePhoneNumber || 'N/A';
  }

  getCourseWebsite(course: CourseInterface): string {
    return course.website || course.courseWebsite || 'N/A';
  }

  getCourseLocation(course: CourseInterface): string {
    return course.location || course.courseLocation || 'N/A';
  }

  getCourseTiming(course: CourseInterface): string {
    return course.timing || course.courseOpenFrom || 'N/A';
  }

  // Extract town from address (first part before comma)
  getTownFromAddress(course: CourseInterface): string {
    const address = this.getCourseAddress(course);
    if (address && address !== 'N/A') {
      const parts = address.split(',');
      return parts[0].trim();
    }
    return 'N/A';
  }

  get paginatedCourseList() {
    let filtered = this.courseList;
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = this.courseList.filter(course =>
        this.getCourseName(course).toLowerCase().includes(searchTermLower) ||
        this.getTownFromAddress(course).toLowerCase().includes(searchTermLower) ||
        this.getCoursePhone(course).toLowerCase().includes(searchTermLower) ||
        this.getCourseWebsite(course).toLowerCase().includes(searchTermLower) ||
        this.getCourseLocation(course).toLowerCase().includes(searchTermLower)
      );
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    const filteredLength = this.searchTerm ?
      this.courseList.filter(course =>
        this.getCourseName(course).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getTownFromAddress(course).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getCoursePhone(course).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getCourseWebsite(course).toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        this.getCourseLocation(course).toLowerCase().includes(this.searchTerm.toLowerCase())
      ).length :
      this.courseList.length;
    return Math.ceil(filteredLength / this.itemsPerPage);
  }

  async deleteCourse(id: number) {
    if (this.isLoading) return;

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
      try {
        const response = await this.courseService.deleteCourse(id.toString());
        if (response.data.code === 1) {
          this.courseList = this.courseList.filter(course => course.id !== id);
          await Swal.fire('Deleted!', 'Course has been deleted.', 'success');
          await this.loadCourseList();
        } else {
          await Swal.fire('Error', 'Failed to delete Course', 'error');
        }
      } catch (error) {
        console.error('Error deleting Course:', error);
        await Swal.fire('Error', 'An error occurred while deleting the Course', 'error');
      } finally {
        this.isLoading = false;
      }
    }
  }
}
