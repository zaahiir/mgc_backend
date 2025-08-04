import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { CourseService } from '../../common-service/course/course.service';
import Swal from 'sweetalert2';

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
  tees?: any[];       // API returns 'tees' from serializer
  allContacts?: string[];
  hideStatus?: number;
}

interface TeeData {
  id?: number;
  holeNumber: number;
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
  courseTees: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private domSanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    this.initializeForm();
    this.loadDataSequentially();
  }

  private async loadDataSequentially(): Promise<void> {
    try {
      // First load amenities
      await this.loadAmenities();
      
      // Then load course data (which sets selected amenities)
      await this.loadCourseData();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async loadAmenities(): Promise<void> {
    try {
      const response = await this.courseService.getAllAmenities();
      if (response && response.data && response.data.code === 1) {
        this.amenitiesList = response.data.data.map((amenity: any) => ({
          id: amenity.id,
          amenityName: amenity.amenityName,
          amenityTooltip: amenity.amenityTooltip,
          title: amenity.amenityName, // For frontend compatibility
          tooltip: amenity.amenityTooltip, // For frontend compatibility
          icon_svg: amenity.amenity_icon_svg,
          icon_path: amenity.amenity_icon_path,
          viewbox: amenity.amenity_viewbox,
          icon: amenity.amenityIcon // Fallback
        }));
      }
    } catch (error) {
      console.error('Error loading amenities:', error);
      Swal.fire({
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
      const response = await this.courseService.getCourse(this.courseId);
      if (response && response.data && response.data.code === 1 && response.data.data.length > 0) {
        const courseData = response.data.data[0];
        this.hasExistingData = true;

        // Update selected amenities
        this.selectedAmenities = courseData.amenities || [];
        
        // Extract amenity IDs from objects if they are objects
        if (this.selectedAmenities.length > 0 && typeof this.selectedAmenities[0] === 'object') {
          this.selectedAmenities = this.selectedAmenities.map((amenity: any) => amenity.id);
        }
        
        // Ensure amenities are numbers
        this.selectedAmenities = this.selectedAmenities.map(id => Number(id));
        
        this.golfCourseForm.patchValue({
          courseAmenities: this.selectedAmenities
        });

        // Load course tees
        await this.loadCourseTees();

        // Update form with course data
        this.golfCourseForm.patchValue({
          courseName: courseData.name || courseData.courseName,
          courseAddress: courseData.address || courseData.courseAddress,
          courseOpenFrom: this.convertTimeForInput(courseData.timing || courseData.courseOpenFrom),
          coursePhoneNumber: courseData.phone || courseData.coursePhoneNumber,
          courseAlternatePhoneNumber: courseData.alternatePhone || courseData.courseAlternatePhoneNumber,
          courseWebsite: courseData.website || courseData.courseWebsite,
          courseDescription: courseData.description || courseData.courseDescription,
          courseLocation: courseData.location || courseData.courseLocation,
          hideStatus: courseData.hideStatus || 0
        });

        // Set image preview if available
        if (courseData.imageUrl) {
          this.imagePreview = courseData.imageUrl;
        }
      }
    } catch (error) {
      console.error('Error loading course data:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to load course data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    }
  }

  private async loadCourseTees(): Promise<void> {
    if (!this.courseId) return;

    try {
      const response = await this.courseService.getTeesByCourse(this.courseId);
      if (response && response.data && response.data.code === 1) {
        this.courseTees = response.data.data;
        
        // Clear existing tees and add loaded tees to form
        while (this.teesFormArray.length !== 0) {
          this.teesFormArray.removeAt(0);
        }
        
        if (this.courseTees.length > 0) {
          this.courseTees.forEach(tee => {
            this.teesFormArray.push(this.createTeeFormGroup({
              id: tee.id,
              holeNumber: tee.holeNumber
            }));
          });
        } else {
          // Add default tee if no tees exist
          this.addDefaultTee();
        }
      }
    } catch (error) {
      console.error('Error loading course tees:', error);
      // Add default tee if loading fails
      this.addDefaultTee();
    }
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
      if (fieldName === 'holeNumber') return 'Hole number must be a whole number';
    }
  
    return 'Invalid value';
  }

  // Validate tee data
  private validateTeeData(): boolean {
    const teesArray = this.teesFormArray;
    
    if (teesArray.length === 0) {
      Swal.fire({
        title: 'Validation Error',
        text: 'At least one tee must be defined for the course',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return false;
    }
    
    for (let i = 0; i < teesArray.length; i++) {
      const teeGroup = teesArray.at(i) as FormGroup;
      if (teeGroup.invalid) {
        Swal.fire({
          title: 'Validation Error',
          text: `Please fix errors in tee ${i + 1}`,
          icon: 'error',
          confirmButtonText: 'Ok'
        });
        return false;
      }
    }
    
    return true;
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
    const isSelected = this.selectedAmenities.includes(amenityId);
    return isSelected;
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

  // Get tee information for display
  getTeeInfo(): string {
    if (this.courseTees && this.courseTees.length > 0) {
      const teeCount = this.courseTees.length;
      const holeTypes = this.courseTees.map((tee: any) => `${tee.holeNumber}H`).join(', ');
      return `${teeCount} tee${teeCount > 1 ? 's' : ''} (${holeTypes})`;
    }
    return 'No tees';
  }

  get f() {
    return this.golfCourseForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.golfCourseForm.invalid) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Please fix the errors in the form',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      return;
    }

    if (!this.validateTeeData()) {
      return;
    }

    this.loading = true;

    try {
      const formData = new FormData();
      const formValue = this.golfCourseForm.value;

      // Add basic course data
      formData.append('courseName', formValue.courseName);
      formData.append('courseAddress', formValue.courseAddress);
      formData.append('courseOpenFrom', formValue.courseOpenFrom);
      formData.append('coursePhoneNumber', formValue.coursePhoneNumber);
      formData.append('courseAlternatePhoneNumber', formValue.courseAlternatePhoneNumber || '');
      formData.append('courseWebsite', formValue.courseWebsite || '');
      formData.append('courseDescription', formValue.courseDescription || '');
      formData.append('courseLocation', formValue.courseLocation);
      formData.append('hideStatus', formValue.hideStatus.toString());

      // Add amenities as array
      if (this.selectedAmenities.length > 0) {
        this.selectedAmenities.forEach((amenityId, index) => {
          formData.append(`courseAmenities[${index}]`, amenityId.toString());
        });
      } else {
        // Send empty array if no amenities selected
        formData.append('courseAmenities[]', '');
      }

      // Add tees
      const teesData = this.teesFormArray.value;
      formData.append('tees', JSON.stringify(teesData));

      // Add image if selected
      if (this.selectedFile) {
        formData.append('courseImage', this.selectedFile);
      }

      const response = await this.courseService.processCourse(formData, this.courseId);

      if (response && response.data && response.data.code === 1) {
        Swal.fire({
          title: 'Success!',
          text: 'Course updated successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        }).then(() => {
          this.router.navigate(['/courses']);
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: response?.data?.message || 'Failed to update course',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    } catch (error) {
      console.error('Error updating course:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update course',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  async onDelete(): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      this.loading = true;

      try {
        const response = await this.courseService.deleteCourse(this.courseId);

        if (response && response.data && response.data.code === 1) {
          Swal.fire({
            title: 'Deleted!',
            text: 'Course has been deleted.',
            icon: 'success',
            confirmButtonText: 'Ok'
          }).then(() => {
            this.router.navigate(['/courses']);
          });
        } else {
          Swal.fire({
            title: 'Error!',
            text: response?.data?.message || 'Failed to delete course',
            icon: 'error',
            confirmButtonText: 'Ok'
          });
        }
      } catch (error) {
        console.error('Error deleting course:', error);
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete course',
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
    this.golfCourseForm.reset();
    this.selectedAmenities = [];
    this.imagePreview = null;
    this.selectedFile = null;
    
    // Clear tees and add default tee
    while (this.teesFormArray.length !== 0) {
      this.teesFormArray.removeAt(0);
    }
    this.addDefaultTee();
    
    // Reload course data
    this.loadCourseData();
  }

  onCancel(): void {
    this.router.navigate(['/courses']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.golfCourseForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.golfCourseForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;

    if (errors['required']) {
      return 'This field is required';
    }

    if (errors['minlength']) {
      return `Minimum length is ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['pattern']) {
      switch (fieldName) {
        case 'coursePhoneNumber':
        case 'courseAlternatePhoneNumber':
          return 'Please enter a valid phone number';
        case 'courseWebsite':
          return 'Please enter a valid URL starting with http:// or https://';
        default:
          return 'Invalid format';
      }
    }

    return 'Invalid value';
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
