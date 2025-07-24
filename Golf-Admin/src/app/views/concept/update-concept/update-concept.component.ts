import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
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
  ButtonDirective,
  ButtonModule
} from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ConceptService, ConceptData, ConceptItem } from '../../common-service/concept/concept.service';

@Component({
  selector: 'app-update-concept',
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
    ButtonDirective,
    ButtonModule
  ],
  templateUrl: './update-concept.component.html',
  styleUrl: './update-concept.component.scss'
})
export class UpdateConceptComponent implements OnInit {
  conceptForm!: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private conceptService: ConceptService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.conceptForm = this.formBuilder.group({
      conceptHighlight: ['', [Validators.required, Validators.maxLength(1500)]],
      conceptCount: [1],
      items: this.formBuilder.array([
        this.createConceptItem()
      ]),
      hideStatus: [0]
    });
  }

  private createConceptItem(): FormGroup {
    return this.formBuilder.group({
      heading: ['', [Validators.required, Validators.maxLength(255)]],
      paragraph: ['', [Validators.required, Validators.maxLength(1000)]],
      order: [0]
    });
  }

  get conceptItems(): FormArray {
    return this.conceptForm.get('items') as FormArray;
  }

  addConceptItem(): void {
    if (this.conceptItems.length < 8) {
      const newItem = this.createConceptItem();
      newItem.patchValue({ order: this.conceptItems.length });
      this.conceptItems.push(newItem);
      this.conceptForm.patchValue({ conceptCount: this.conceptItems.length });
    }
  }

  removeConceptItem(index: number): void {
    if (this.conceptItems.length > 1) {
      this.conceptItems.removeAt(index);
      this.conceptForm.patchValue({ conceptCount: this.conceptItems.length });
      // Update order for remaining items
      this.conceptItems.controls.forEach((control, i) => {
        control.patchValue({ order: i });
      });
    }
  }

  async loadExistingConcept(): Promise<void> {
    try {
      this.loading = true;
      const response = await this.conceptService.listConcept();

      console.log('Load response:', response.data); // Debug log

      if (response.data && response.data.code === 1) {
        const conceptData = response.data.data;

        if (!conceptData) {
          throw new Error('No concept data received');
        }

        // Clear existing form array
        while (this.conceptItems.length !== 0) {
          this.conceptItems.removeAt(0);
        }

        // Set main concept data
        this.conceptForm.patchValue({
          conceptHighlight: conceptData.conceptHighlight || '',
          conceptCount: conceptData.conceptCount || 1
        });

        // Add concept items
        if (conceptData.items && conceptData.items.length > 0) {
          conceptData.items.forEach((item: ConceptItem) => {
            const itemForm = this.createConceptItem();
            itemForm.patchValue({
              heading: item.heading || '',
              paragraph: item.paragraph || '',
              order: item.order || 0
            });
            this.conceptItems.push(itemForm);
          });
        } else {
          // Add at least one empty item if no items exist
          this.conceptItems.push(this.createConceptItem());
        }

        await Swal.fire({
          title: 'Success!',
          text: 'Existing concept loaded successfully',
          icon: 'success',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      } else {
        throw new Error(response.data?.message || 'Failed to load concept data');
      }
    } catch (error: any) {
      console.error('Error loading concept:', error);

      const errorMessage = error?.response?.data?.message ||
                          error?.message ||
                          'Failed to load existing concept';

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

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.conceptForm.invalid) {
      this.markAllFieldsAsTouched();

      // Show validation error
      await Swal.fire({
        title: 'Validation Error!',
        text: 'Please fill in all required fields correctly',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
      return;
    }

    try {
      this.loading = true;

      const formValue = this.conceptForm.value;

      // Validate data before sending
      if (!formValue.conceptHighlight?.trim()) {
        throw new Error('Concept highlight is required');
      }

      if (!formValue.items || formValue.items.length === 0) {
        throw new Error('At least one concept item is required');
      }

      // Check for empty items
      for (let i = 0; i < formValue.items.length; i++) {
        const item = formValue.items[i];
        if (!item.heading?.trim()) {
          throw new Error(`Heading is required for item ${i + 1}`);
        }
        if (!item.paragraph?.trim()) {
          throw new Error(`Paragraph is required for item ${i + 1}`);
        }
      }

      const conceptData: ConceptData = {
        conceptHighlight: formValue.conceptHighlight.trim(),
        conceptCount: formValue.items.length,
        items: formValue.items.map((item: any, index: number) => ({
          heading: item.heading?.trim() || '',
          paragraph: item.paragraph?.trim() || '',
          order: index + 1
        })),
        hideStatus: 0
      };

      console.log('Sending concept data:', conceptData); // Debug log

      const response = await this.conceptService.processConcept(conceptData);

      console.log('Submit response:', response.data); // Debug log

      if (response.data && response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Concept has been saved successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/concept']);
      } else {
        const errorMessage = response.data?.message || 'Unknown error occurred';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error submitting concept:', error);

      let errorMessage = 'Failed to save concept';

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
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

  onReset(): void {
    this.submitted = false;

    // Clear the form array
    while (this.conceptItems.length !== 0) {
      this.conceptItems.removeAt(0);
    }

    // Reset the form and add one default item
    this.conceptForm.reset({
      conceptHighlight: '',
      conceptCount: 1,
      hideStatus: 0
    });

    // Add one default concept item
    this.conceptItems.push(this.createConceptItem());
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.conceptForm.controls).forEach(key => {
      const control = this.conceptForm.get(key);
      control?.markAsTouched();
    });

    this.conceptItems.controls.forEach(group => {
      // Cast to FormGroup to access controls property
      const formGroup = group as FormGroup;
      Object.keys(formGroup.controls).forEach(key => {
        formGroup.get(key)?.markAsTouched();
      });
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.conceptForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  isItemFieldInvalid(index: number, fieldName: string): boolean {
    const field = this.conceptItems.at(index).get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.conceptForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Maximum length is ${maxLength} characters`;
    }

    return 'Invalid input';
  }
}
