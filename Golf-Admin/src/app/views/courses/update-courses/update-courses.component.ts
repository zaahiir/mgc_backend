import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  FormSelectDirective,
  ButtonDirective,
  ButtonModule
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { CourseService } from '../../common-service/course/course.service';

interface Amenity {
  id: number;
  amenityName: string;
  amenityTooltip: string;
  title: string;  // For frontend compatibility
  tooltip: string;  // For frontend compatibility
  icon_svg?: string;
  icon_path?: string;
  viewbox?: string;
  icon?: string;  // Fallback for old implementations
}

interface CourseData {
  id?: number;
  name: string;        // API returns 'name' instead of 'courseName'
  address: string;     // API returns 'address' instead of 'courseAddress'
  timing?: string;     // API returns 'timing' instead of 'courseOpenFrom'
  phone: string;       // API returns 'phone' instead of 'coursePhoneNumber'
  alternatePhone?: string;  // API returns 'alternatePhone' instead of 'courseAlternatePhoneNumber'
  website?: string;    // API returns 'website' instead of 'courseWebsite'
  description?: string; // API returns 'description' instead of 'courseDescription'
  location: string;    // API returns 'location' instead of 'courseLocation'
  imageUrl: string;    // API returns 'imageUrl' instead of 'courseImage'
  amenities: number[]; // API returns 'amenities' instead of 'courseAmenities'
  allContacts?: string[];
  hideStatus?: number;
}

@Component({
  selector: 'app-update-courses',
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
    FormSelectDirective,
    ButtonDirective,
    ButtonModule
  ],
  templateUrl: './update-courses.component.html',
  styleUrls: ['./update-courses.component.scss']
})
export class UpdateCoursesComponent implements OnInit {
  golfCourseForm!: FormGroup;
  loading = false;
  submitted = false;
  amenitiesList: Amenity[] = [];
  selectedAmenities: number[] = [];
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  courseId: string = '';
  hasExistingData = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private domSanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAmenities();

    // Get course ID from route params
    this.route.params.subscribe(params => {
      this.courseId = params['id'];
      if (this.courseId) {
        this.loadCourseData();
      }
    });
  }

  private async loadAmenities(): Promise<void> {
    try {
      const response = await this.courseService.getAmenities();
      console.log('Amenities response:', response.data);

      if (response.data && response.data.code === 1) {
        this.amenitiesList = response.data.data.map((amenity: any) => ({
          ...amenity,
          title: amenity.amenityName || amenity.title,
          tooltip: amenity.amenityTooltip || amenity.tooltip || amenity.amenityName
        }));
        console.log('Loaded amenities:', this.amenitiesList);
      } else {
        console.warn('Unexpected amenities response format:', response.data);
        this.amenitiesList = [];
      }
    } catch (error) {
      console.error('Error loading amenities:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load amenities',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }
  }

  private async loadCourseData(): Promise<void> {
    if (!this.courseId) return;

    try {
      this.loading = true;
      const response = await this.courseService.listCourse(this.courseId);
      console.log('Course data response:', response.data);

      if (response.data && response.data.code === 1 && response.data.data.length > 0) {
        const courseData: CourseData = response.data.data[0];
        this.hasExistingData = true;

        console.log('Course data loaded:', courseData);

        // Map the response data to form fields - using the correct field names from API
        this.golfCourseForm.patchValue({
          courseName: courseData.name || '',
          courseAddress: courseData.address || '',
          courseOpenFrom: courseData.timing || '',
          coursePhoneNumber: courseData.phone || '',
          courseAlternatePhoneNumber: courseData.alternatePhone || '',
          courseWebsite: courseData.website || '',
          courseDescription: courseData.description || '',
          courseLocation: courseData.location || '',
          hideStatus: courseData.hideStatus || 0
        });

        // Set selected amenities
        this.selectedAmenities = courseData.amenities || [];
        this.golfCourseForm.patchValue({ courseAmenities: this.selectedAmenities });

        // Set image preview if exists
        if (courseData.imageUrl && !courseData.imageUrl.includes('default-course.jpg')) {
          this.imagePreview = courseData.imageUrl;
        }

        console.log('Form values after patch:', this.golfCourseForm.value);
        console.log('Selected amenities:', this.selectedAmenities);
      } else {
        console.warn('No course data found or invalid response format');
        await Swal.fire({
          title: 'Warning!',
          text: 'No course data found',
          icon: 'warning',
          confirmButtonText: 'Ok'
        });
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load course data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      this.router.navigate(['/courses']);
    } finally {
      this.loading = false;
    }
  }

  private initializeForm(): void {
    this.golfCourseForm = this.formBuilder.group({
      courseName: ['', [Validators.required, Validators.minLength(2)]],
      courseAddress: ['', [Validators.required]],
      courseOpenFrom: [''],
      coursePhoneNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      courseAlternatePhoneNumber: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      courseWebsite: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      courseDescription: [''],
      courseLocation: ['', [Validators.required]],
      courseAmenities: [[], [Validators.required, Validators.minLength(1)]],
      courseImage: [null],
      hideStatus: [0]
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          title: 'Error!',
          text: 'Please select an image file',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        Swal.fire({
          title: 'Error!',
          text: 'Image size should not exceed 5MB',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  isAmenitySelected(amenityId: number): boolean {
    return this.selectedAmenities.includes(amenityId);
  }

  toggleAmenity(amenity: Amenity): void {
    const index = this.selectedAmenities.indexOf(amenity.id);

    if (index === -1) {
      this.selectedAmenities.push(amenity.id);
    } else {
      this.selectedAmenities.splice(index, 1);
    }

    this.golfCourseForm.patchValue({ courseAmenities: this.selectedAmenities });
    this.golfCourseForm.get('courseAmenities')?.markAsTouched();
  }

  // Helper method to get amenity title by ID
  getAmenityTitle(amenityId: number): string {
    const amenity = this.amenitiesList.find(a => a.id === amenityId);
    return amenity ? amenity.title : `Amenity ${amenityId}`;
  }

  // Helper method to safely render HTML (for SVG icons)
  getSafeHtml(html: string): SafeHtml {
    return this.domSanitizer.bypassSecurityTrustHtml(html);
  }

  get f() {
    return this.golfCourseForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.golfCourseForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.golfCourseForm.controls).forEach(key => {
        const control = this.golfCourseForm.get(key);
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

      // Create FormData object to handle file upload
      const formData = new FormData();

      // Add all form fields to FormData (matching backend field names)
      const formValues = this.golfCourseForm.value;

      // Add course fields
      formData.append('courseName', formValues.courseName || '');
      formData.append('courseAddress', formValues.courseAddress || '');
      formData.append('courseOpenFrom', formValues.courseOpenFrom || '');
      formData.append('coursePhoneNumber', formValues.coursePhoneNumber || '');
      formData.append('courseAlternatePhoneNumber', formValues.courseAlternatePhoneNumber || '');
      formData.append('courseWebsite', formValues.courseWebsite || '');
      formData.append('courseDescription', formValues.courseDescription || '');
      formData.append('courseLocation', formValues.courseLocation || '');
      formData.append('hideStatus', formValues.hideStatus.toString());

      // Add amenities as JSON string (as expected by backend)
      formData.append('courseAmenities', JSON.stringify(this.selectedAmenities));

      // Add the file if selected
      if (this.selectedFile) {
        formData.append('courseImage', this.selectedFile);
      }

      console.log('Submitting form data:', formValues);
      console.log('Selected amenities:', this.selectedAmenities);

      const response = await this.courseService.processCourse(formData, this.courseId);

      if (response.data && response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Golf course has been updated successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/courses']);
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error updating course:', error);

      let errorMessage = 'Failed to update golf course';
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
    if (!this.courseId || !this.hasExistingData) return;

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
        const response = await this.courseService.deleteCourse(this.courseId);

        if (response.data && response.data.code === 1) {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Golf course has been deleted successfully',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.router.navigate(['/courses']);
        } else {
          throw new Error(response.data?.message || 'Failed to delete course');
        }
      } catch (error: any) {
        console.error('Error deleting course:', error);
        await Swal.fire({
          title: 'Error!',
          text: 'Failed to delete golf course',
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
    this.selectedAmenities = [];
    this.imagePreview = null;
    this.selectedFile = null;
    this.golfCourseForm.reset({
      hideStatus: 0,
      courseAmenities: []
    });

    // Reload the course data
    if (this.courseId) {
      this.loadCourseData();
    }
  }

  onCancel(): void {
    this.router.navigate(['/courses']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.golfCourseForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.golfCourseForm.get(fieldName);
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      switch (fieldName) {
        case 'courseAmenities':
          return 'Please select at least one amenity';
        case 'courseName':
          return 'Course name is required';
        case 'courseAddress':
          return 'Course address is required';
        case 'coursePhoneNumber':
          return 'Phone number is required';
        case 'courseLocation':
          return 'Course location is required';
        default:
          return 'This field is required';
      }
    }

    if (errors['minlength']) {
      if (fieldName === 'courseAmenities') {
        return 'Please select at least one amenity';
      }
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['pattern']) {
      switch (fieldName) {
        case 'coursePhoneNumber':
        case 'courseAlternatePhoneNumber':
          return 'Invalid phone number format';
        case 'courseWebsite':
          return 'Invalid website URL format (must start with http:// or https://)';
        default:
          return 'Invalid format';
      }
    }

    return 'Invalid input';
  }
}
