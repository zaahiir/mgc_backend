import { Component, OnInit } from '@angular/core';
import { NgClass, NgStyle, CommonModule, DatePipe } from '@angular/common';
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
  PageItemDirective,
  SpinnerComponent
} from '@coreui/angular';
import { BlogService } from '../../common-service/blog/blog.service';
import Swal from 'sweetalert2';

interface BlogInterface {
  id: number;
  blogTitle: string;
  blogHighlight: string;
  blogDescription: string;
  blogDate: string;
  blogImage: string;
}

@Component({
  selector: 'app-list-blog',
  standalone: true,
  imports: [
    NgClass,
    CommonModule,
    DatePipe,
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
    SpinnerComponent
  ],
  templateUrl: './list-blog.component.html',
  styleUrl: './list-blog.component.scss'
})
export class ListBlogComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Edit';
  tooltipDeleteText = 'Delete';

  blogList: BlogInterface[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;
  searchTerm: string = '';

  constructor(private blogService: BlogService) {}

  ngOnInit() {
    this.loadBlogList();
  }

  getImageName(imageUrl: string): string {
    if (!imageUrl) return '';

    try {
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return decodeURIComponent(fileName);
    } catch (error) {
      console.error('Error getting image name:', error);
      return 'Unknown Image';
    }
  }

  async loadBlogList() {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      const response = await this.blogService.listBlog('0');
      if (response.data.code === 1) {
        this.blogList = response.data.data;
        this.updatePageRange();
      } else {
        await Swal.fire('Error', 'Failed to load blog list', 'error');
      }
    } catch (error) {
      console.error('Error loading blog list:', error);
      await Swal.fire('Error', 'An error occurred while loading the blog list', 'error');
    } finally {
      this.isLoading = false;
    }
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

  search() {
    this.currentPage = 1;
    this.updatePageRange();
  }

  openImage(imageUrl: string) {
    if (!imageUrl) return;

    // Construct the full URL using your backend URL
    const baseUrl = 'https://mastergolfclub'; // Replace with your actual backend URL
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;

    window.open(fullUrl, '_blank');
  }

  get paginatedBlogList() {
    let filtered = this.blogList;
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = this.blogList.filter(blog =>
        blog.blogTitle.toLowerCase().includes(searchTermLower) ||
        blog.blogDescription.toLowerCase().includes(searchTermLower) ||
        blog.blogDate.toLowerCase().includes(searchTermLower)
      );
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    const filteredLength = this.searchTerm
      ? this.blogList.filter(blog =>
          blog.blogTitle.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          blog.blogDescription.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          blog.blogDate.toLowerCase().includes(this.searchTerm.toLowerCase())
        ).length
      : this.blogList.length;
    return Math.ceil(filteredLength / this.itemsPerPage);
  }

  async deleteBlog(id: number) {
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
        const response = await this.blogService.deleteBlog(id.toString());
        if (response.data.code === 1) {
          await Swal.fire('Deleted!', 'Blog has been deleted.', 'success');
          await this.loadBlogList();
        } else {
          await Swal.fire('Error', 'Failed to delete blog', 'error');
        }
      } catch (error) {
        console.error('Error deleting blog:', error);
        await Swal.fire('Error', 'An error occurred while deleting the blog', 'error');
      } finally {
        this.isLoading = false;
      }
    }
  }
}
