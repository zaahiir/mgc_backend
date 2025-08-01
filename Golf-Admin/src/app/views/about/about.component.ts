import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AboutService } from '../common-service/about/about.service';
import {
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  ButtonDirective,
  ButtonModule,
  ColComponent,
  RowComponent,
  FormFloatingDirective,
  FormFeedbackComponent,
  FormControlDirective,
  FormLabelDirective,
  SpinnerModule
} from '@coreui/angular';
import { EditorModule } from '@tinymce/tinymce-angular';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    ButtonDirective,
    ButtonModule,
    ColComponent,
    RowComponent,
    FormFloatingDirective,
    FormFeedbackComponent,
    FormControlDirective,
    FormLabelDirective,
    SpinnerModule,
    EditorModule
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  aboutForm!: FormGroup;
  loading = false;
  submitted = false;
  aboutData: any = null;

  constructor(
    private formBuilder: FormBuilder,
    private aboutService: AboutService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadAboutData();
  }

  private initializeForm(): void {
    this.aboutForm = this.formBuilder.group({
      aboutHeading: ['', [Validators.required, Validators.maxLength(255)]],
      aboutDescription: ['', [Validators.required]],
      partnerGolfClubs: [0, [Validators.required, Validators.min(0)]],
      successfulYears: [0, [Validators.required, Validators.min(0)]]
    });
  }

  private async loadAboutData(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.aboutService.getAboutData();
      if (response.data && response.data.status === 'success' && response.data.data) {
        this.aboutData = response.data.data;
        this.aboutForm.patchValue({
          aboutHeading: this.aboutData.aboutHeading || '',
          aboutDescription: this.aboutData.aboutDescription || '',
          partnerGolfClubs: this.aboutData.partnerGolfClubs || 0,
          successfulYears: this.aboutData.successfulYears || 0
        });
      }
    } catch (error: any) {
      console.error('Error loading about data:', error);
    } finally {
      this.loading = false;
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.aboutForm.invalid) {
      return;
    }

    this.loading = true;

    try {
      const formData = this.aboutForm.value;
      
      const response = await this.aboutService.createOrUpdateAboutData(formData);
      
      if (response.data && response.data.status === 'success') {
        this.aboutData = response.data.data;
        this.submitted = false;
        alert('About section updated successfully!');
      } else {
        alert('Error updating about section: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error updating about section:', error);
      alert('Error updating about section. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.aboutForm.reset({
      aboutHeading: '',
      aboutDescription: '',
      partnerGolfClubs: 0,
      successfulYears: 0
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.aboutForm.get(fieldName);
    return field!.invalid && (field!.dirty || field!.touched || this.submitted);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.aboutForm.get(fieldName);
    if (field!.errors) {
      if (field!.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field!.errors['maxlength']) {
        return `${fieldName} cannot exceed ${field!.errors['maxlength'].requiredLength} characters`;
      }
      if (field!.errors['min']) {
        return `${fieldName} must be at least ${field!.errors['min'].min}`;
      }
    }
    return '';
  }
}
