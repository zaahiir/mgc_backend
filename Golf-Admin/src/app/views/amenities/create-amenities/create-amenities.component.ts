// create-amenities.component.ts
import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  RowComponent,
  ColComponent,
  TextColorDirective,
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  FormFloatingDirective,
  FormDirective,
  FormLabelDirective,
  FormControlDirective,
  FormFeedbackComponent,
  ButtonDirective,
  ButtonModule
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { AmenitiesService } from '../../common-service/amenities/amenities.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface AmenityData {
  id?: number;
  amenityName: string;
  amenityIcon?: string;
  amenityTooltip?: string;
  hideStatus: number;
}

@Component({
  selector: 'app-create-amenities',
  standalone: true,
  imports: [
    NgIf,
    NgForOf,
    CommonModule,
    RowComponent,
    ColComponent,
    TextColorDirective,
    CardComponent,
    FormFloatingDirective,
    CardHeaderComponent,
    CardBodyComponent,
    ReactiveFormsModule,
    FormsModule,
    FormDirective,
    FormLabelDirective,
    FormControlDirective,
    FormFeedbackComponent,
    ButtonDirective,
    ButtonModule
  ],
  templateUrl: './create-amenities.component.html',
  styleUrls: ['./create-amenities.component.scss']
})
export class CreateAmenitiesComponent implements OnInit {
  amenityForm!: FormGroup;
  loading = false;
  submitted = false;
  isEditMode = false;
  amenityId: string | null = null;
  hasExistingData = false;

  // SVG handling properties
  svgPreview: SafeHtml | null = null;
  rawSvgContent: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private amenitiesService: AmenitiesService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeForm();

    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.amenityId = params['id'];
        this.isEditMode = true;
        this.loadAmenityData();
      }
    });
  }

  private async loadAmenityData(): Promise<void> {
    if (!this.amenityId) return;

    try {
      this.loading = true;
      const response = await this.amenitiesService.listAmenities(this.amenityId);

      if (response.data && response.data.code === 1 && response.data.data.length > 0) {
        const amenityData: any = response.data.data[0];
        this.hasExistingData = true;

        // Map the response data to form fields
        this.amenityForm.patchValue({
          amenityName: amenityData.amenityName || '',
          amenityIcon: amenityData.amenityIcon || '',
          amenityTooltip: amenityData.amenityTooltip || ''
        });

        // Set SVG preview if available
        if (amenityData.amenityIcon) {
          this.rawSvgContent = amenityData.amenityIcon;
          this.updateSVGPreview(amenityData.amenityIcon);
        }
      }
    } catch (error) {
      console.error('Error loading amenity data:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load amenity data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  private initializeForm(): void {
    this.amenityForm = this.formBuilder.group({
      amenityName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      amenityIcon: ['', [Validators.required, this.svgValidator.bind(this)]],
      amenityTooltip: ['', [Validators.maxLength(500)]],
      hideStatus: [0]
    });
  }

  private svgValidator(control: any) {
    if (!control.value) return null;

    const svgContent = control.value.trim();
    if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
      return { invalidSvg: true };
    }

    return null;
  }

  onSVGInput(event: any): void {
    const svgContent = event.target.value.trim();
    this.rawSvgContent = svgContent;

    if (svgContent && this.isValidSVG(svgContent)) {
      this.updateSVGPreview(svgContent);
    } else {
      this.svgPreview = null;
    }
  }

  private isValidSVG(content: string): boolean {
    return content.includes('<svg') && content.includes('</svg>');
  }

  private updateSVGPreview(svgContent: string): void {
    try {
      // Sanitize the SVG content for preview
      this.svgPreview = this.sanitizer.bypassSecurityTrustHtml(svgContent);
    } catch (error) {
      console.error('Error creating SVG preview:', error);
      this.svgPreview = null;
    }
  }

  clearSVG(): void {
    this.amenityForm.patchValue({ amenityIcon: '' });
    this.svgPreview = null;
    this.rawSvgContent = '';
  }

  get f() {
    return this.amenityForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.amenityForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.amenityForm.controls).forEach(key => {
        const control = this.amenityForm.get(key);
        control?.markAsTouched();
      });

      // Scroll to first error
      const firstErrorElement = document.querySelector('.is-invalid');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      this.loading = true;

      // Prepare data for submission
      const amenityData = {
        amenityName: this.amenityForm.value.amenityName.trim(),
        amenityIcon: this.amenityForm.value.amenityIcon.trim(),
        amenityTooltip: this.amenityForm.value.amenityTooltip?.trim() || '',
        hideStatus: 0
      };

      // Determine the ID for the request (0 for create, actual ID for update)
      const requestId = this.isEditMode && this.amenityId ? this.amenityId : '0';

      const response = await this.amenitiesService.processAmenitiesWithSVG(amenityData, requestId);

      if (response.data && response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: this.isEditMode
            ? 'Amenity has been updated successfully'
            : 'Amenity has been created successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/amenities']);
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);

      let errorMessage = 'Failed to save amenity';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.keys(errors).map(key => `${key}: ${errors[key].join(', ')}`).join('\n');
      } else if (error.message) {
        errorMessage = error.message;
      }

      await Swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  async onDelete(): Promise<void> {
    if (!this.amenityId || !this.hasExistingData) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        this.loading = true;
        const response = await this.amenitiesService.deleteAmenities(this.amenityId);

        if (response.data && response.data.code === 1) {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Amenity has been deleted successfully',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.router.navigate(['/amenities']);
        } else {
          throw new Error(response.data?.message || 'Failed to delete amenity');
        }
      } catch (error: any) {
        console.error('Error deleting amenity:', error);
        await Swal.fire({
          title: 'Error!',
          text: 'Failed to delete amenity',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  onReset(): void {
    this.submitted = false;
    this.svgPreview = null;
    this.rawSvgContent = '';

    this.amenityForm.reset({
      hideStatus: 0
    });

    // If in edit mode, reload the data
    if (this.isEditMode) {
      this.loadAmenityData();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.amenityForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.amenityForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      switch (fieldName) {
        case 'amenityName':
          return 'Amenity name is required';
        case 'amenityIcon':
          return 'SVG icon is required';
        default:
          return 'This field is required';
      }
    }

    if (errors['invalidSvg']) {
      return 'Please enter a valid SVG code (must contain <svg> and </svg> tags)';
    }

    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['maxlength']) {
      switch (fieldName) {
        case 'amenityName':
          return 'Amenity name cannot exceed 200 characters';
        case 'amenityTooltip':
          return 'Tooltip cannot exceed 500 characters';
        default:
          return `Maximum length is ${errors['maxlength'].requiredLength} characters`;
      }
    }

    return 'Invalid input';
  }
}
