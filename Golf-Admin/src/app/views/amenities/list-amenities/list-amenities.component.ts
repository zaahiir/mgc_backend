// list-amenities.component.ts - Updated Component
import { Component, OnInit, SecurityContext } from '@angular/core';
import { NgClass, NgStyle, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { cilPen, cilTrash } from '@coreui/icons';
import { IconDirective } from '@coreui/icons-angular';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  TooltipDirective,
  RowComponent,
  ColComponent,
  TextColorDirective,
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  FormDirective,
  FormControlDirective,
  ButtonDirective,
  TableDirective,
  PaginationComponent,
  PageItemComponent,
  PageLinkDirective
} from '@coreui/angular';
import { AmenitiesService } from '../../common-service/amenities/amenities.service';
import Swal from 'sweetalert2';

interface AmenityInterface {
  id: number;
  // Original format properties
  amenityName?: string;
  amenityIcon?: string;
  amenityTooltip?: string;
  amenitiesDescription?: string;
  hideStatus?: number;
  createdAt?: string;
  updatedAt?: string;
  amenity_icon_url?: string; // From backend serializer
  amenity_icon_svg?: string; // SVG content
  amenity_icon_path?: string; // SVG path data
  viewbox?: string; // SVG viewBox
  // New format properties (from list_all endpoint)
  title?: string;
  tooltip?: string;
  description?: string;
  icon?: string;
  icon_file?: string;
  icon_svg?: string;
  icon_path?: string;
  // Icon size properties from backend
  icon_width?: number;
  icon_height?: number;
  icon_size?: number;
  amenity_icon_width?: number;
  amenity_icon_height?: number;
  amenity_icon_size?: number;
}

@Component({
  selector: 'app-list-amenities',
  standalone: true,
  imports: [
    CommonModule,
    TooltipDirective,
    IconDirective,
    RouterLink,
    RowComponent,
    ColComponent,
    TextColorDirective,
    CardComponent,
    CardHeaderComponent,
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
  templateUrl: './list-amenities.component.html',
  styleUrls: ['./list-amenities.component.scss']
})
export class ListAmenitiesComponent implements OnInit {
  icons = { cilPen, cilTrash };
  tooltipEditText = 'Edit Amenity';
  tooltipDeleteText = 'Delete Amenity';

  amenityList: AmenityInterface[] = [];
  pageRange: number[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;
  searchTerm: string = '';

  constructor(
    private amenitiesService: AmenitiesService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadAmenityList();
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

  async loadAmenityList() {
    if (this.isLoading) return;

    this.isLoading = true;
    try {
      // Try to use the list_all endpoint first, fall back to regular listing
      let response;
      try {
        response = await this.amenitiesService.getAllAmenities();
      } catch (error) {
        console.log('Using fallback listing endpoint');
        response = await this.amenitiesService.listAmenities('0');
      }

      if (response.data.code === 1) {
        this.amenityList = response.data.data;
        this.updatePageRange();
      } else {
        throw new Error(response.data.message || 'Failed to load amenities');
      }
    } catch (error) {
      console.error('Error loading amenity list:', error);
      await Swal.fire({
        title: 'Error',
        text: 'An error occurred while loading the amenity list',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.isLoading = false;
    }
  }

  search() {
    this.currentPage = 1;
    this.updatePageRange();
  }

  clearSearch() {
    this.searchTerm = '';
    this.search();
  }

  get paginatedAmenityList() {
    let filtered = this.amenityList;
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = this.amenityList.filter(amenity => {
        const name = amenity.title || amenity.amenityName || '';
        const tooltip = amenity.tooltip || amenity.amenityTooltip || '';
        const description = amenity.description || amenity.amenitiesDescription || '';

        return name.toLowerCase().includes(searchTermLower) ||
               tooltip.toLowerCase().includes(searchTermLower) ||
               description.toLowerCase().includes(searchTermLower);
      });
    }
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages() {
    const filteredLength = this.searchTerm ?
      this.amenityList.filter(amenity => {
        const name = amenity.title || amenity.amenityName || '';
        const tooltip = amenity.tooltip || amenity.amenityTooltip || '';
        const description = amenity.description || amenity.amenitiesDescription || '';
        const searchTermLower = this.searchTerm.toLowerCase();

        return name.toLowerCase().includes(searchTermLower) ||
               tooltip.toLowerCase().includes(searchTermLower) ||
               description.toLowerCase().includes(searchTermLower);
      }).length :
      this.amenityList.length;
    return Math.ceil(filteredLength / this.itemsPerPage);
  }

  onImageError(event: any, amenity: AmenityInterface) {
    // Hide the failed image and show fallback
    event.target.style.display = 'none';
  }

  onSvgError(event: any, amenity: AmenityInterface) {
    // Handle SVG loading errors
    console.warn('SVG failed to load for amenity:', amenity.id);
    event.target.style.display = 'none';
  }

  // Helper method to safely render SVG content
  getSafeIconSvg(amenity: AmenityInterface): SafeHtml | null {
    const svgContent = amenity.icon_svg || amenity.amenity_icon_svg;
    if (!svgContent) return null;

    try {
      // Sanitize and trust the SVG content
      const sanitizedSvg = this.sanitizer.sanitize(SecurityContext.HTML, svgContent);
      if (sanitizedSvg) {
        // Ensure the SVG has proper dimensions for display
        let processedSvg = sanitizedSvg;

        // Get dynamic dimensions from backend
        const iconWidth = this.getIconWidth(amenity);
        const iconHeight = this.getIconHeight(amenity);

        // Add width and height attributes if missing
        if (!processedSvg.includes('width=') && !processedSvg.includes('height=')) {
          processedSvg = processedSvg.replace('<svg', `<svg width="${iconWidth}" height="${iconHeight}"`);
        }

        // Add CSS class for styling and ensure proper display
        const sizeClass = this.getIconSizeClass(amenity);
        if (!processedSvg.includes('class=')) {
          processedSvg = processedSvg.replace('<svg', `<svg class="amenity-icon-svg ${sizeClass}"`);
        } else {
          // Add our class to existing classes
          processedSvg = processedSvg.replace('class="', `class="amenity-icon-svg ${sizeClass} `);
        }

        // Ensure SVG has proper viewBox if missing
        if (!processedSvg.includes('viewBox=')) {
          processedSvg = processedSvg.replace('<svg', '<svg viewBox="0 0 24 24"');
        }

        return this.sanitizer.bypassSecurityTrustHtml(processedSvg);
      }
    } catch (error) {
      console.warn('Error sanitizing SVG for amenity:', amenity.id, error);
    }

    return null;
  }

  // Helper method to get icon path for custom SVG rendering
  getIconPath(amenity: AmenityInterface): string {
    return amenity.icon_path || amenity.amenity_icon_path || '';
  }

  // Helper method to get viewBox
  getViewBox(amenity: AmenityInterface): string {
    return amenity.viewbox || '0 0 448 512';
  }

  // Check if amenity has any icon data
  hasIcon(amenity: AmenityInterface): boolean {
    return !!(
      amenity.icon_svg ||
      amenity.amenity_icon_svg ||
      amenity.icon_path ||
      amenity.amenity_icon_path ||
      amenity.icon ||
      amenity.amenity_icon_url ||
      amenity.amenityIcon
    );
  }

  // Get icon size from backend data
  getIconSize(amenity: AmenityInterface): number {
    return amenity.icon_size || 
           amenity.amenity_icon_size || 
           amenity.icon_width || 
           amenity.amenity_icon_width || 
           32; // Default size
  }

  // Get icon width from backend data
  getIconWidth(amenity: AmenityInterface): number {
    return amenity.icon_width || 
           amenity.amenity_icon_width || 
           this.getIconSize(amenity);
  }

  // Get icon height from backend data
  getIconHeight(amenity: AmenityInterface): number {
    return amenity.icon_height || 
           amenity.amenity_icon_height || 
           this.getIconSize(amenity);
  }

  // Get dynamic CSS class based on icon size
  getIconSizeClass(amenity: AmenityInterface): string {
    const size = this.getIconSize(amenity);
    
    if (size <= 16) return 'icon-size-xs';
    if (size <= 24) return 'icon-size-sm';
    if (size <= 32) return 'icon-size-md';
    if (size <= 48) return 'icon-size-lg';
    if (size <= 64) return 'icon-size-xl';
    return 'icon-size-xxl';
  }

  // Get dynamic container size based on icon size
  getContainerSizeClass(amenity: AmenityInterface): string {
    const size = this.getIconSize(amenity);
    
    if (size <= 16) return 'container-size-xs';
    if (size <= 24) return 'container-size-sm';
    if (size <= 32) return 'container-size-md';
    if (size <= 48) return 'container-size-lg';
    if (size <= 64) return 'container-size-xl';
    return 'container-size-xxl';
  }

  async deleteAmenity(id: number) {
    if (this.isLoading) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      this.isLoading = true;
      try {
        const response = await this.amenitiesService.deleteAmenities(id.toString());
        if (response.data.code === 1) {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Amenity has been deleted successfully.',
            icon: 'success',
            confirmButtonText: 'Ok'
          });

          // Reload the list to get updated data
          await this.loadAmenityList();
        } else {
          throw new Error(response.data.message || 'Failed to delete amenity');
        }
      } catch (error) {
        console.error('Error deleting amenity:', error);
        await Swal.fire({
          title: 'Error',
          text: 'An error occurred while deleting the amenity',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
}
