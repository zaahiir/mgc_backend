// update-amenities.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
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
  ButtonModule,
  SpinnerComponent
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AmenitiesService } from '../../common-service/amenities/amenities.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface AmenityData {
  id: number;
  amenityName: string;
  amenityIcon: string;
  amenityTooltip?: string;
  hideStatus: number;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-update-amenities',
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
    ButtonModule,
    SpinnerComponent
  ],
  templateUrl: './update-amenities.component.html',
  styleUrls: ['./update-amenities.component.scss']
})
export class UpdateAmenitiesComponent implements OnInit, OnDestroy {
  amenityForm!: FormGroup;
  loading = false;
  loadingData = false;
  submitted = false;
  amenityId: string | null = null;
  amenityData: AmenityData | null = null;

  // SVG handling properties
  svgPreview: SafeHtml | null = null;
  rawSvgContent: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private amenitiesService: AmenitiesService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadRouteData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRouteData(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.amenityId = params['id'];
          this.loadAmenityData();
        } else {
          this.redirectToAmenitiesList();
        }
      });
  }

  private async loadAmenityData(): Promise<void> {
    if (!this.amenityId) return;

    try {
      this.loadingData = true;
      const response = await this.amenitiesService.listAmenities(this.amenityId);

      if (response.data && response.data.code === 1 && response.data.data.length > 0) {
        const amenityData: any = response.data.data[0];
        this.amenityData = amenityData;

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
      } else {
        await this.handleDataLoadError('Amenity not found');
      }
    } catch (error) {
      console.error('Error loading amenity data:', error);
      await this.handleDataLoadError('Failed to load amenity data. Please try again.');
    } finally {
      this.loadingData = false;
    }
  }

  private async handleDataLoadError(message: string): Promise<void> {
    await Swal.fire({
      title: 'Error!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Ok'
    });
    this.redirectToAmenitiesList();
  }

  private redirectToAmenitiesList(): void {
    this.router.navigate(['/amenities']);
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
        hideStatus: this.amenityData?.hideStatus || 0
      };

      const response = await this.amenitiesService.processAmenitiesWithSVG(amenityData, this.amenityId!);

      if (response.data && response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Amenity has been updated successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/amenities']);
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error updating amenity:', error);

      let errorMessage = 'Failed to update amenity';
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

  onCancel(): void {
    this.router.navigate(['/amenities']);
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
