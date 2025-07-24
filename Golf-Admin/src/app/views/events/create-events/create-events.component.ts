import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-events',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgClass, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    InputGroupComponent, InputGroupTextDirective, FormSelectDirective,
    ButtonDirective
  ],
  templateUrl: './create-events.component.html',
  styleUrl: './create-events.component.scss'
})
export class CreateEventsComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.eventForm = this.formBuilder.group({
      eventName: ['', [Validators.required, Validators.minLength(2)]],
      eventDate: ['', [Validators.required]],
      eventTime: ['', [Validators.required]],
      eventLocation: ['', [Validators.required, Validators.minLength(3)]],
      eventDescription: ['', [Validators.required, Validators.minLength(10)]]
    });
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

      // Add your API call here to save the event data
      // const response = await this.eventService.createEvent(this.eventForm.value);
      
      await Swal.fire({
        title: 'Success!',
        text: 'Event has been created successfully',
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      this.router.navigate(['/events']);
    } catch (error) {
      console.error('Error creating event:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to create event',
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

    return 'Invalid input';
  }
}
