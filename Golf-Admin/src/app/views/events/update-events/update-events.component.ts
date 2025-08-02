import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EditorModule } from '@tinymce/tinymce-angular';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { MemberEventsService } from '../../common-service/member-events/member-events.service';

@Component({
  selector: 'app-update-events',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgClass, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    InputGroupComponent, InputGroupTextDirective, FormSelectDirective,
    ButtonDirective, RouterModule, EditorModule
  ],
  templateUrl: './update-events.component.html',
  styleUrl: './update-events.component.scss'
})
export class UpdateEventsComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;
  isEditMode = false;

  eventId: string | null = null;

  // Image preview properties
  mainImagePreview: string | null = null;
  detailImageOnePreview: string | null = null;
  detailImageTwoPreview: string | null = null;
  activitiesImageOnePreview: string | null = null;
  activitiesImageTwoPreview: string | null = null;

  // Selected files
  selectedMainImage: File | null = null;
  selectedDetailImageOne: File | null = null;
  selectedDetailImageTwo: File | null = null;
  selectedActivitiesImageOne: File | null = null;
  selectedActivitiesImageTwo: File | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private eventService: MemberEventsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private checkEditMode(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.eventId = params['id'];
        this.loadEventData();
      }
    });
  }

  private async loadEventData(): Promise<void> {
    if (!this.eventId) return;

    try {
      this.loading = true;
      const response = await this.eventService.listEvent(this.eventId);
      const eventData = response.data.data;
      
      if (eventData) {
        this.eventForm.patchValue({
          EventTitle: eventData.EventTitle || '',
          EventDate: eventData.EventDate || '',
          EventVenue: eventData.EventVenue || '',
          EventEntryPrice: eventData.EventEntryPrice || '',
          EventDetails: eventData.EventDetails || '',
          EventActivities: eventData.EventActivities || '',
          EventDetailOrganizer: eventData.EventDetailOrganizer || '',
          EventEndDate: eventData.EventEndDate || '',
          EventTime: eventData.EventTime || '',
          EventEmail: eventData.EventEmail || '',
          EventPhone: eventData.EventPhone || '',
          is_active: eventData.is_active !== undefined ? eventData.is_active : true,
          hideStatus: eventData.hideStatus || 0
        });

        // Set image previews if they exist - using the correct field names from backend
        if (eventData.EventImageUrl) {
          this.mainImagePreview = eventData.EventImageUrl;
        }
        
        // Handle detail images - backend returns an array
        if (eventData.EventDetailImages && eventData.EventDetailImages.length > 0) {
          this.detailImageOnePreview = eventData.EventDetailImages[0];
          if (eventData.EventDetailImages.length > 1) {
            this.detailImageTwoPreview = eventData.EventDetailImages[1];
          }
        }
        
        // Handle activities images - backend returns an array
        if (eventData.EventActivitiesImages && eventData.EventActivitiesImages.length > 0) {
          this.activitiesImageOnePreview = eventData.EventActivitiesImages[0];
          if (eventData.EventActivitiesImages.length > 1) {
            this.activitiesImageTwoPreview = eventData.EventActivitiesImages[1];
          }
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load event data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  private initializeForm(): void {
    this.eventForm = this.formBuilder.group({
      EventTitle: ['', [Validators.required, Validators.maxLength(255)]],
      EventDate: ['', [Validators.required]],
      EventVenue: ['', [Validators.required, Validators.maxLength(255)]],
      EventEntryPrice: ['', [Validators.required, Validators.maxLength(50)]],
      EventImage: [null], // Will be made required conditionally
      EventDetails: ['', [Validators.required]],
      EventDetailimageOne: [null],
      EventDetailimageTwo: [null],
      EventActivities: ['', [Validators.required]],
      EventActivitiesimageOne: [null],
      EventActivitiesimageTwo: [null],
      EventDetailOrganizer: ['', [Validators.required, Validators.maxLength(255)]],
      EventEndDate: ['', [Validators.required]],
      EventTime: ['', [Validators.required, Validators.maxLength(50)]],
      EventEmail: ['', [Validators.required, Validators.email]],
      EventPhone: ['', [Validators.required, Validators.maxLength(50)]],
      is_active: [true],
      hideStatus: [0]
    });
  }

  // Image change handlers
  onMainImageChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedMainImage = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.mainImagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Clear preview if no file selected
      this.selectedMainImage = null;
      this.mainImagePreview = null;
    }
  }

  onDetailImageOneChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedDetailImageOne = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.detailImageOnePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Clear preview if no file selected
      this.selectedDetailImageOne = null;
      this.detailImageOnePreview = null;
    }
  }

  onDetailImageTwoChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedDetailImageTwo = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.detailImageTwoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Clear preview if no file selected
      this.selectedDetailImageTwo = null;
      this.detailImageTwoPreview = null;
    }
  }

  onActivitiesImageOneChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedActivitiesImageOne = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.activitiesImageOnePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Clear preview if no file selected
      this.selectedActivitiesImageOne = null;
      this.activitiesImageOnePreview = null;
    }
  }

  onActivitiesImageTwoChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedActivitiesImageTwo = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.activitiesImageTwoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Clear preview if no file selected
      this.selectedActivitiesImageTwo = null;
      this.activitiesImageTwoPreview = null;
    }
  }

  // Clear image methods
  clearMainImage(): void {
    this.mainImagePreview = null;
    this.selectedMainImage = null;
    // Reset the file input
    const fileInput = document.getElementById('EventImage') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  clearDetailImageOne(): void {
    this.detailImageOnePreview = null;
    this.selectedDetailImageOne = null;
    // Reset the file input
    const fileInput = document.getElementById('EventDetailimageOne') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  clearDetailImageTwo(): void {
    this.detailImageTwoPreview = null;
    this.selectedDetailImageTwo = null;
    // Reset the file input
    const fileInput = document.getElementById('EventDetailimageTwo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  clearActivitiesImageOne(): void {
    this.activitiesImageOnePreview = null;
    this.selectedActivitiesImageOne = null;
    // Reset the file input
    const fileInput = document.getElementById('EventActivitiesimageOne') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  clearActivitiesImageTwo(): void {
    this.activitiesImageTwoPreview = null;
    this.selectedActivitiesImageTwo = null;
    // Reset the file input
    const fileInput = document.getElementById('EventActivitiesimageTwo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  get f() { 
    return this.eventForm.controls; 
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    // Add conditional validation for main image
    const mainImageControl = this.eventForm.get('EventImage');
    if (!this.isEditMode) {
      // In create mode, main image is required
      mainImageControl?.setValidators([Validators.required]);
    } else {
      // In edit mode, main image is only required if no existing image and no new image selected
      if (!this.mainImagePreview && !this.selectedMainImage) {
        mainImageControl?.setValidators([Validators.required]);
      } else {
        mainImageControl?.clearValidators();
      }
    }
    mainImageControl?.updateValueAndValidity();

    if (this.eventForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      const formData = new FormData();

      // Append form fields to FormData
      Object.keys(this.eventForm.value).forEach(key => {
        if (!key.includes('Image')) {
          formData.append(key, this.eventForm.value[key]);
        }
      });

      // Append image files if selected
      if (this.selectedMainImage) {
        formData.append('EventImage', this.selectedMainImage);
      }
      if (this.selectedDetailImageOne) {
        formData.append('EventDetailimageOne', this.selectedDetailImageOne);
      }
      if (this.selectedDetailImageTwo) {
        formData.append('EventDetailimageTwo', this.selectedDetailImageTwo);
      }
      if (this.selectedActivitiesImageOne) {
        formData.append('EventActivitiesimageOne', this.selectedActivitiesImageOne);
      }
      if (this.selectedActivitiesImageTwo) {
        formData.append('EventActivitiesimageTwo', this.selectedActivitiesImageTwo);
      }

      let response;
      if (this.isEditMode && this.eventId) {
        response = await this.eventService.processEvent(formData, this.eventId);
      } else {
        response = await this.eventService.processEvent(formData);
      }
      
      await Swal.fire({
        title: 'Success!',
        text: this.isEditMode ? 'Event has been updated successfully' : 'Event has been created successfully',
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      this.router.navigate(['/events']);
    } catch (error) {
      console.error('Error saving event:', error);
      await Swal.fire({
        title: 'Error!',
        text: this.isEditMode ? 'Failed to update event' : 'Failed to create event',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.eventForm.reset();
    
    // Clear all selected files
    this.selectedMainImage = null;
    this.selectedDetailImageOne = null;
    this.selectedDetailImageTwo = null;
    this.selectedActivitiesImageOne = null;
    this.selectedActivitiesImageTwo = null;
    
    // Clear all image previews
    this.mainImagePreview = null;
    this.detailImageOnePreview = null;
    this.detailImageTwoPreview = null;
    this.activitiesImageOnePreview = null;
    this.activitiesImageTwoPreview = null;
    
    // Reset all file inputs
    const fileInputs = [
      'EventImage',
      'EventDetailimageOne', 
      'EventDetailimageTwo',
      'EventActivitiesimageOne',
      'EventActivitiesimageTwo'
    ];
    
    fileInputs.forEach(id => {
      const fileInput = document.getElementById(id) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.eventForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      if (fieldName === 'EventImage') {
        return this.isEditMode ? 'Please select a new image or keep the existing one' : 'This field is required';
      }
      return 'This field is required';
    }
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['email']) return 'Please enter a valid email address';

    return 'Invalid input';
  }
}