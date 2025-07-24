import { Component, OnInit } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  RowComponent, 
  ColComponent, 
  CardComponent, 
  CardHeaderComponent, 
  CardBodyComponent, 
  FormFloatingDirective, 
  FormControlDirective, 
  FormLabelDirective, 
  FormFeedbackComponent, 
  ButtonDirective,
  FormSelectDirective
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

interface CourseInfo {
  id: number;
  name: string;
  holes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface TimeSlot {
  time: string;
  available: boolean;
}

@Component({
  selector: 'app-update-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgFor,
    NgIf,
    RowComponent,
    ColComponent,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormFloatingDirective,
    FormControlDirective,
    FormLabelDirective,
    FormFeedbackComponent,
    ButtonDirective,
    FormSelectDirective
  ],
  templateUrl: './update-booking.component.html',
  styleUrl: './update-booking.component.scss'
})
export class UpdateBookingComponent implements OnInit {
  bookingForm!: FormGroup;
  submitted = false;
  loading = false;

  // Sample course information (would typically come from a service)
  courses: CourseInfo[] = [
    { id: 1, name: 'Championship Course', holes: 18, difficulty: 'Hard' },
    { id: 2, name: 'Meadow Course', holes: 9, difficulty: 'Easy' },
    { id: 3, name: 'Lake Course', holes: 18, difficulty: 'Medium' }
  ];

  // Sample time slots (would typically be dynamically fetched)
  timeSlots: TimeSlot[] = [
    { time: '06:00 AM', available: true },
    { time: '07:00 AM', available: true },
    { time: '08:00 AM', available: true },
    { time: '09:00 AM', available: false },
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '12:00 PM', available: false },
    { time: '01:00 PM', available: true },
    { time: '02:00 PM', available: true },
    { time: '03:00 PM', available: true }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeBookingForm();
  }

  private initializeBookingForm(): void {
    const today = new Date().toISOString().split('T')[0];
    
    this.bookingForm = this.formBuilder.group({
      memberId: ['', [Validators.required]],
      courseId: ['', [Validators.required]],
      bookingDate: [today, [Validators.required]],
      timeSlot: ['', [Validators.required]],
      numberOfPlayers: [1, [Validators.required, Validators.min(1), Validators.max(4)]],
      additionalGuests: [0, [Validators.min(0), Validators.max(3)]],
      cartRequired: [false],
      specialRequirements: ['']
    });
  }

  // Convenience getter for easy access to form controls
  get f() { 
    return this.bookingForm.controls; 
  }

  // Check if a field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const field = this.bookingForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  // Generate error message for invalid fields
  getErrorMessage(fieldName: string): string {
    const control = this.bookingForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
    if (control.errors['max']) return `Maximum value is ${control.errors['max'].max}`;

    return 'Invalid input';
  }

  // Filter available time slots based on selected date
  getAvailableTimeSlots(): TimeSlot[] {
    return this.timeSlots.filter(slot => slot.available);
  }

  // Get selected course details
  getSelectedCourse(): CourseInfo | undefined {
    const courseId = this.bookingForm.get('courseId')?.value;
    return this.courses.find(course => course.id === Number(courseId));
  }

  // Submit booking form
  async onSubmit(): Promise<void> {
    this.submitted = true;

    // Check form validity
    if (this.bookingForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      // Simulate booking submission (replace with actual API call)
      await this.submitBooking(this.bookingForm.value);

      // Show success message
      await Swal.fire({
        title: 'Booking Successful!',
        text: 'Your tee time has been booked successfully.',
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      // Navigate to bookings list or dashboard
      this.router.navigate(['/bookings']);
    } catch (error) {
      console.error('Booking submission error:', error);

      // Show error message
      await Swal.fire({
        title: 'Booking Failed',
        text: 'Unable to complete your booking. Please try again.',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  // Reset form
  onReset(): void {
    this.submitted = false;
    this.bookingForm.reset({
      bookingDate: new Date().toISOString().split('T')[0],
      numberOfPlayers: 1,
      additionalGuests: 0,
      cartRequired: false
    });
  }

  // Simulate booking submission (replace with actual service method)
  private async submitBooking(bookingData: any): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real application, you would call a booking service here
    console.log('Booking submitted:', bookingData);
  }
}