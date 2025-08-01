import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditorModule } from '@tinymce/tinymce-angular';
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
import { MemberEventsService } from '../../common-service/member-events/member-events.service';

interface EventOption {
  value: string;
  label: string;
}

interface EventData {
  id?: number;
  EventTitle: string;
  EventDate: string | Date;
  EventVenue: string;
  EventEntryPrice: string;
  EventImage?: string;
  EventDetails: string;
  EventActivities: string;
  EventActivitiesimageOne?: string;
  EventActivitiesimageTwo?: string;
  EventDetailOrganizer: string;
  EventEndDate: string;
  EventTime: string;
  EventEmail: string;
  EventPhone: string;
  is_active: boolean;
  hideStatus: number;
  EventImageUrl?: string;
  EventDetailImages?: string[];
  EventActivitiesImages?: string[];
}

@Component({
  selector: 'app-create-member-events',
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
    ButtonModule,
    EditorModule
  ],
  templateUrl: './create-events.component.html',
  styleUrl: './create-events.component.scss'
})
export class CreateEventsComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  additionalImagePreviews: { [key: string]: string | null } = {};
  selectedAdditionalFiles: { [key: string]: File | null } = {};
  isEditMode = false;
  eventId: string | null = null;
  hasExistingData = false;


  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private memberEventsService: MemberEventsService,
    private domSanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.eventForm = this.formBuilder.group({
      EventTitle: ['', [Validators.required, Validators.maxLength(255)]],
      EventDate: ['', [Validators.required]],
      EventVenue: ['', [Validators.required, Validators.maxLength(255)]],
      EventEntryPrice: ['', [Validators.required, Validators.maxLength(50)]],
      EventImage: [null],
      EventDetails: ['', [Validators.required]],
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

  private async checkEditMode(): Promise<void> {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId && this.eventId !== '0') {
      this.isEditMode = true;
      await this.loadEventData();
    }
  }

  private async loadEventData(): Promise<void> {
    try {
      this.loading = true;
      const response = await this.memberEventsService.listEvent(this.eventId!);
      
      if (response.data?.status === 'success' && response.data?.data) {
        const eventData = response.data.data;
        this.hasExistingData = true;
        
        // Update form with existing data
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

        // Set image previews
        if (eventData.EventImageUrl) {
          this.imagePreview = eventData.EventImageUrl;
        }



        // Set activities image previews
        if (eventData.EventActivitiesImages) {
          eventData.EventActivitiesImages.forEach((url: string, index: number) => {
            this.additionalImagePreviews[`EventActivitiesimage${index === 0 ? 'One' : 'Two'}`] = url;
          });
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load event data'
      });
    } finally {
      this.loading = false;
    }
  }

  onMainImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      this.selectedFile = target.files[0];
      this.eventForm.patchValue({ EventImage: this.selectedFile });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  onAdditionalImageChange(event: Event, imageField: string): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      this.selectedAdditionalFiles[imageField] = target.files[0];
      this.eventForm.patchValue({ [imageField]: target.files[0] });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.additionalImagePreviews[imageField] = e.target?.result as string;
      };
      reader.readAsDataURL(target.files[0]);
    }
  }

  removeMainImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.eventForm.patchValue({ EventImage: null });
  }

  removeAdditionalImage(imageField: string): void {
    this.selectedAdditionalFiles[imageField] = null;
    this.additionalImagePreviews[imageField] = null;
    this.eventForm.patchValue({ [imageField]: null });
  }



  get f() {
    return this.eventForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.eventForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      const formData = new FormData();
      const formValue = this.eventForm.value;

      // Add all form fields to FormData
      Object.keys(formValue).forEach(key => {
        if (key === 'is_active') {
          formData.append(key, formValue[key] ? 'true' : 'false');
        } else if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
          formData.append(key, formValue[key]);
        }
      });

      // Add main image if selected
      if (this.selectedFile) {
        formData.append('EventImage', this.selectedFile);
      }

      // Add additional images if selected
      Object.keys(this.selectedAdditionalFiles).forEach(imageField => {
        const file = this.selectedAdditionalFiles[imageField];
        if (file) {
          formData.append(imageField, file);
        }
      });

      const response = await this.memberEventsService.processEvent(formData, this.eventId || '0');

      if (response.data?.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: this.isEditMode ? 'Event updated successfully!' : 'Event created successfully!'
        }).then(() => {
          this.router.navigate(['/events']);
        });
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error saving event:', error);
      let errorMessage = 'Failed to save event';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage
      });
    } finally {
      this.loading = false;
    }
  }

  async onDelete(): Promise<void> {
    if (!this.eventId || this.eventId === '0') {
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        this.loading = true;
        const response = await this.memberEventsService.deleteEvent(this.eventId);

        if (response.data?.status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Event has been deleted successfully.'
          }).then(() => {
            this.router.navigate(['/member-events']);
          });
        } else {
          throw new Error(response.data?.message || 'Unknown error occurred');
        }
      } catch (error: any) {
        console.error('Error deleting event:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete event'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  onReset(): void {
    this.submitted = false;
    this.imagePreview = null;
    this.selectedFile = null;
    this.additionalImagePreviews = {};
    this.selectedAdditionalFiles = {};
    this.eventForm.reset({
      is_active: true,
      hideStatus: 0
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventForm.get(fieldName);
    return field ? (this.submitted && field.invalid) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.eventForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['maxlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is too long`;
      }
    }
    return '';
  }

  getSafeHtml(html: string): SafeHtml {
    return this.domSanitizer.bypassSecurityTrustHtml(html);
  }

  navigateToEvents(): void {
    this.router.navigate(['/events']);
  }


}
