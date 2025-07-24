import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-tournament',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgClass, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    InputGroupComponent, InputGroupTextDirective, FormSelectDirective,
    ButtonDirective
  ],
  templateUrl: './create-tournament.component.html',
  styleUrl: './create-tournament.component.scss'
})
export class CreateTournamentComponent implements OnInit {
  tournamentForm!: FormGroup;
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
    this.tournamentForm = this.formBuilder.group({
      tournamentName: ['', [Validators.required, Validators.minLength(2)]],
      tournamentDate: ['', [Validators.required]],
      tournamentTime: ['', [Validators.required]],
      tournamentLocation: ['', [Validators.required, Validators.minLength(3)]],
      tournamentDescription: ['', [Validators.required, Validators.minLength(10)]],
      entryFee: ['', [Validators.required, Validators.min(0)]],
      maxParticipants: ['', [Validators.required, Validators.min(1)]]
    });
  }

  get f() { 
    return this.tournamentForm.controls; 
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.tournamentForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      // Add your API call here to save the tournament data
      // const response = await this.tournamentService.createTournament(this.tournamentForm.value);
      
      await Swal.fire({
        title: 'Success!',
        text: 'Tournament has been created successfully',
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      this.router.navigate(['/tournaments']);
    } catch (error) {
      console.error('Error creating tournament:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to create tournament',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.tournamentForm.reset();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.tournamentForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.tournamentForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;

    return 'Invalid input';
  }
}
