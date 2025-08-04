// create-courses.component.ts - Updated with tee management
import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
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
  title: string;
  tooltip: string;
  icon_svg?: string;
  icon_path?: string;
  viewbox?: string;
  icon?: string;
}

interface CourseData {
  id?: number;
  courseName: string;
  courseAddress: string;
  courseOpenFrom?: string;
  coursePhoneNumber: string;
  courseAlternatePhoneNumber?: string;
  courseWebsite?: string;
  courseDescription?: string;
  courseLocation: string;
  courseImage?: string;
  courseAmenities: number[];
  hideStatus: number;
  imageUrl?: string;
  amenities?: number[];
  tees?: any[];
}

interface TeeData {
  id?: number;
  holeNumber: number;
}

@Component({
  selector: 'app-create-courses',
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
  templateUrl: './create-courses.component.html',
  styleUrls: ['./create-courses.component.scss']
})
export class CreateCoursesComponent implements OnInit {
  golfCourseForm!: FormGroup;
  loading = false;
  submitted = false;
  amenitiesList: Amenity[] = [];
  selectedAmenities: number[] = [];
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isEditMode = false;
  courseId: string | null = null;
  hasExistingData = false;
  courseTees: any[] = [];

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

    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.courseId = params['id'];
        this.isEditMode = true;
        this.loadCourseData();
      } else {
        // Add default tee for new course
        this.addDefaultTee();
      }
    });
  }

  private initializeForm(): void {
    this.golfCourseForm = this.formBuilder.group({
      courseName: ['', [Validators.required, Validators.minLength(2)]],
      courseAddress: ['', [Validators.required]],
      courseOpenFrom: ['06:00', [Validators.required]],
      coursePhoneNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      courseAlternatePhoneNumber: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      courseWebsite: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      courseDescription: [''],
      courseLocation: ['', [Validators.required]],
      courseAmenities: [[], [Validators.required, Validators.minLength(1)]],
      courseImage: [null],
      hideStatus: [0],
      tees: this.formBuilder.array([], [Validators.required, Validators.minLength(1)])
    });
  }

  // Tee FormArray getter
  get teesFormArray(): FormArray {
    return this.golfCourseForm.get('tees') as FormArray;
  }

  // Create a new tee form group
  private createTeeFormGroup(teeData?: TeeData): FormGroup {
    return this.formBuilder.group({
      id: [teeData?.id || null],
      holeNumber: [
        teeData?.holeNumber || '', 
        [Validators.required, Validators.min(1), Validators.pattern('^[0-9]+$')]
      ]
    });
  }

  // Add a new tee
  addTee(): void {
    const teeForm = this.createTeeFormGroup({
      holeNumber: 9 // Default to 9 holes
    });
    this.teesFormArray.push(teeForm);
  }

  // Add default tee for new courses
  private addDefaultTee(): void {
    const defaultTee = this.createTeeFormGroup({
      holeNumber: 9
    });
    this.teesFormArray.push(defaultTee);
  }

  // Remove a tee
  removeTee(index: number): void {
    if (this.teesFormArray.length > 1) {
      this.teesFormArray.removeAt(index);
    } else {
      Swal.fire({
        title: 'Cannot Remove',
        text: 'At least one tee must be defined for the course',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
    }
  }

  // Get tee form group at index
  getTeeFormGroup(index: number): FormGroup {
    return this.teesFormArray.at(index) as FormGroup;
  }

  // Check if tee field is invalid
  isTeeFieldInvalid(teeIndex: number, fieldName: string): boolean {
    const teeGroup = this.getTeeFormGroup(teeIndex);
    const field = teeGroup.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  // Get tee field error message
  getTeeErrorMessage(teeIndex: number, fieldName: string): string {
    const teeGroup = this.getTeeFormGroup(teeIndex);
    const control = teeGroup.get(fieldName);
    if (!control || !control.errors) return '';
  
    const errors = control.errors;
  
    if (errors['required']) {
      switch (fieldName) {
        case 'holeNumber': return 'Please enter number of holes';
        default: return 'This field is required';
      }
    }
  
    if (errors['min']) {
      if (fieldName === 'holeNumber') return 'Hole number must be at least 1';
    }
  
    if (errors['pattern']) {
      if (fieldName === 'holeNumber') return 'Hole number must be a positive integer';
    }
  
    return 'Invalid input';
  }

  private validateTeeData(): boolean {
    const teesData = this.teesFormArray.value;
    
    // Check for duplicate hole numbers
    const holeNumbers = teesData.map((tee: any) => tee.holeNumber);
    const duplicates = holeNumbers.filter((item: number, index: number) => holeNumbers.indexOf(item) !== index);
    
    if (duplicates.length > 0) {
      Swal.fire({
        title: 'Duplicate Tees!',
        text: 'You have duplicate hole configurations. Each tee must have a unique number of holes.',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
      return false;
    }
  
    return true;
  }

  private async loadAmenities(): Promise<void> {
    try {
      const response = await this.courseService.getAmenities();
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

      if (response.data && response.data.code === 1 && response.data.data.length > 0) {
        const courseData: CourseData = response.data.data[0];
        this.hasExistingData = true;

        // Map the response data to form fields
        this.golfCourseForm.patchValue({
          courseName: courseData.courseName || '',
          courseAddress: courseData.courseAddress || '',
          courseOpenFrom: this.convertTimeForInput(courseData.courseOpenFrom) || '06:00',
          coursePhoneNumber: courseData.coursePhoneNumber || '',
          courseAlternatePhoneNumber: courseData.courseAlternatePhoneNumber || '',
          courseWebsite: courseData.courseWebsite || '',
          courseDescription: courseData.courseDescription || '',
          courseLocation: courseData.courseLocation || '',
          hideStatus: courseData.hideStatus || 0
        });

        // Set selected amenities
        this.selectedAmenities = courseData.courseAmenities || courseData.amenities || [];
        this.golfCourseForm.patchValue({ courseAmenities: this.selectedAmenities });

        // Set image preview if exists
        if (courseData.imageUrl && !courseData.imageUrl.includes('default-course.jpg')) {
          this.imagePreview = courseData.imageUrl;
        } else if (courseData.courseImage && !courseData.courseImage.includes('default-course.jpg')) {
          this.imagePreview = courseData.courseImage;
        }

        // Load tees data
        await this.loadCourseTees();
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load course data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  private async loadCourseTees(): Promise<void> {
    if (!this.courseId) return;

    try {
      const response = await this.courseService.getTeesByCourse(this.courseId);
      if (response.data && response.data.code === 1) {
        const tees = response.data.data;
        console.log('Course tees loaded:', tees);
        
        // Clear existing tee forms
        while (this.teesFormArray.length > 0) {
          this.teesFormArray.removeAt(0);
        }

        // Add loaded tees to form
        if (tees && tees.length > 0) {
          tees.forEach((tee: any) => {
            const teeForm = this.createTeeFormGroup({
              id: tee.id,
              holeNumber: tee.holeNumber
            });
            this.teesFormArray.push(teeForm);
          });
        } else {
          // Add default tee if no tees exist
          this.addDefaultTee();
        }
      }
    } catch (error) {
      console.error('Error loading course tees:', error);
      // Add default tee if loading fails
      if (this.teesFormArray.length === 0) {
        this.addDefaultTee();
      }
    }
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

  getAmenityTitle(amenityId: number): string {
    const amenity = this.amenitiesList.find(a => a.id === amenityId);
    return amenity ? amenity.title : `Amenity ${amenityId}`;
  }

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

      // Also mark tee form fields as touched
      this.teesFormArray.controls.forEach(teeGroup => {
        Object.keys(teeGroup.value).forEach(key => {
          const control = teeGroup.get(key);
          control?.markAsTouched();
        });
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

      // Add amenities as array
      if (this.selectedAmenities.length > 0) {
        this.selectedAmenities.forEach((amenityId, index) => {
          formData.append(`courseAmenities[${index}]`, amenityId.toString());
        });
      } else {
        // Send empty array if no amenities selected
        formData.append('courseAmenities[]', '');
      }

      // Add tees data as JSON string
      formData.append('tees', JSON.stringify(formValues.tees));

      // Add the file if selected
      if (this.selectedFile) {
        formData.append('courseImage', this.selectedFile);
      }

      // Determine the ID for the request
      const requestId = this.isEditMode && this.courseId ? this.courseId : '0';

      const response = await this.courseService.processCourse(formData, requestId);

      if (response.data && response.data.code === 1) {
        const teeCount = formValues.tees.length;
        const successMessage = this.isEditMode
          ? `Golf course has been updated successfully with ${teeCount} tee(s)`
          : `Golf course has been created successfully with ${teeCount} tee(s)`;
        
        await Swal.fire({
          title: 'Success!',
          text: successMessage,
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/courses']);
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);

      let errorMessage = 'Failed to save golf course';
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
      text: 'This action cannot be undone! This will also delete all associated tees.',
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
            text: 'Golf course and all associated tees have been deleted successfully',
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
    
    // Clear tee forms
    while (this.teesFormArray.length > 0) {
      this.teesFormArray.removeAt(0);
    }

    this.golfCourseForm.reset({
      hideStatus: 0,
      courseAmenities: []
    });

    // If in edit mode, reload the data
    if (this.isEditMode) {
      this.loadCourseData();
    } else {
      // Add default tee for new course
      this.addDefaultTee();
    }
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
        case 'tees':
          return 'At least one tee must be defined';
        case 'courseName':
          return 'Course name is required';
        case 'courseAddress':
          return 'Course address is required';
        case 'courseOpenFrom':
          return 'Opening hours are required';
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
      if (fieldName === 'tees') {
        return 'At least one tee must be defined';
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

  private convertTimeForInput(timeString: string | undefined): string {
    if (!timeString) return '06:00';
    
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's in "6:00 AM" format, convert to HH:MM
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2];
      const period = timeMatch[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    
    return '06:00';
  }
}