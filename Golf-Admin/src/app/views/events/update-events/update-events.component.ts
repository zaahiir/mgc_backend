import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
    ButtonDirective, RouterModule
  ],
  templateUrl: './update-events.component.html',
  styleUrl: './update-events.component.scss'
})
export class UpdateEventsComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;
  isEditMode = false;
  eventOptions: Array<{value: string, label: string}> = [];
  eventId: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private eventService: MemberEventsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.checkEditMode();
    this.initializeDefaultEventOptions();
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
          title: eventData.title,
          date: eventData.date,
          location: eventData.location,
          time: eventData.time,
          description: eventData.description,
          additional_info: eventData.additional_info,
          organizer: eventData.organizer,
          cost: eventData.cost,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          activities_description: eventData.activities_description,
          additional_activities: eventData.additional_activities,
          venue: eventData.venue,
          phone: eventData.phone,
          email: eventData.email,
          website: eventData.website,
          address: eventData.address,
          meta_description: eventData.meta_description,
          is_active: eventData.is_active,
          is_featured: eventData.is_featured
        });

        // Load event options if they exist
        if (eventData.event_options && Array.isArray(eventData.event_options)) {
          this.eventOptions = [...eventData.event_options];
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

  private initializeDefaultEventOptions(): void {
    this.eventOptions = [
      { value: '1', label: 'Courses & Instructors' },
      { value: '2', label: 'Golf Accommodation' },
      { value: '3', label: 'Fitness Center' },
      { value: '4', label: 'Golf Practice' },
      { value: '5', label: 'Skill Development' },
      { value: '6', label: 'Basic Foundation' }
    ];
  }

  private initializeForm(): void {
    this.eventForm = this.formBuilder.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      date: ['', [Validators.required]],
      location: ['', [Validators.required, Validators.minLength(3)]],
      time: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      additional_info: [''],
      organizer: ['', [Validators.required]],
      cost: ['', [Validators.required]],
      start_date: ['', [Validators.required]],
      end_date: ['', [Validators.required]],
      activities_description: ['', [Validators.required]],
      additional_activities: [''],
      venue: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      website: [''],
      address: ['', [Validators.required]],
      meta_description: [''],
      is_active: [true],
      is_featured: [false]
    });
  }

  get f() { 
    return this.eventForm.controls; 
  }

  addEventOption(): void {
    this.eventOptions.push({ value: '', label: '' });
  }

  removeEventOption(index: number): void {
    this.eventOptions.splice(index, 1);
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.eventForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      const formData = {
        ...this.eventForm.value,
        event_options: this.eventOptions
      };

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
    this.initializeDefaultEventOptions();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.eventForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.eventForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['email']) return 'Please enter a valid email address';

    return 'Invalid input';
  }
}