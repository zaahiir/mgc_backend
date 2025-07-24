// create-concept.component.ts
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
  selector: 'app-create-concept',
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
  templateUrl: './create-concept.component.html',
  styleUrl: './create-concept.component.scss'
})
export class CreateConceptComponent implements OnInit {
  conceptForm!: FormGroup;
  loading = false;
  submitted = false;
  isEditMode = false;
  hasExistingData = false;
  existingConceptId: number | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private conceptService: ConceptService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadConceptData();
  }

  private initializeForm(): void {
    this.conceptForm = this.formBuilder.group({
      conceptHighlight: ['', [Validators.required, Validators.maxLength(1500)]],
      items: this.formBuilder.array([
        this.createConceptItem()
      ])
    });
  }

  private createConceptItem(): FormGroup {
    return this.formBuilder.group({
      id: [null],
      heading: ['', [Validators.required, Validators.maxLength(255)]],
      paragraph: ['', [Validators.required, Validators.maxLength(1000)]],
      order: [0]
    });
  }

  get conceptItems(): FormArray {
    return this.conceptForm.get('items') as FormArray;
  }

  // Made public to be accessible from template
  public async loadConceptData(): Promise<void> {
    try {
      this.loading = true;
      const response = await this.conceptService.getConcept();

      if (response.data && response.data.code === 1) {
        const conceptData = response.data.data;

        // Check if we have actual data (not just default empty values)
        if (conceptData && conceptData.conceptHighlight && conceptData.conceptHighlight.trim()) {
          this.isEditMode = true;
          this.hasExistingData = true;
          this.existingConceptId = conceptData.id;

          // Clear existing form array
          while (this.conceptItems.length !== 0) {
            this.conceptItems.removeAt(0);
          }

          // Set concept highlight
          this.conceptForm.patchValue({
            conceptHighlight: conceptData.conceptHighlight
          });

          // Add concept items
          if (conceptData.items && conceptData.items.length > 0) {
            conceptData.items.forEach((item: ConceptItem) => {
              const itemForm = this.createConceptItem();
              itemForm.patchValue({
                id: item.id,
                heading: item.heading,
                paragraph: item.paragraph,
                order: item.order
              });
              this.conceptItems.push(itemForm);
            });
          } else {
            // Add one empty item if no items exist
            this.conceptItems.push(this.createConceptItem());
          }
        } else {
          // No existing data, start with empty form
          this.isEditMode = false;
          this.hasExistingData = false;
        }
      }
    } catch (error: any) {
      console.error('Error loading concept data:', error);
      // Continue with empty form for new concept
      this.isEditMode = false;
      this.hasExistingData = false;
    } finally {
      this.loading = false;
    }
  }

  addConceptItem(): void {
    if (this.conceptItems.length < 8) {
      const newItem = this.createConceptItem();
      newItem.patchValue({ order: this.conceptItems.length + 1 });
      this.conceptItems.push(newItem);
    }
  }

  async removeConceptItem(index: number): Promise<void> {
    if (this.conceptItems.length <= 1) {
      await Swal.fire({
        title: 'Cannot Delete',
        text: 'At least one concept item is required',
        icon: 'warning',
        confirmButtonText: 'Ok'
      });
      return;
    }

    const itemControl = this.conceptItems.at(index);
    const itemId = itemControl.get('id')?.value;

    // If item has ID (exists in database), delete from backend
    if (itemId && this.isEditMode) {
      const result = await Swal.fire({
        title: 'Delete Item',
        text: 'Are you sure you want to delete this concept item?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        try {
          this.loading = true;
          const response = await this.conceptService.deleteConceptItem(itemId);

          if (response.data && response.data.code === 1) {
            this.conceptItems.removeAt(index);
            this.updateItemOrders();

            await Swal.fire({
              title: 'Deleted!',
              text: 'Concept item has been deleted successfully',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            throw new Error(response.data?.message || 'Failed to delete item');
          }
        } catch (error: any) {
          console.error('Error deleting item:', error);
          await Swal.fire({
            title: 'Error!',
            text: error?.response?.data?.message || 'Failed to delete concept item',
            icon: 'error',
            confirmButtonText: 'Ok'
          });
        } finally {
          this.loading = false;
        }
      }
    } else {
      // Just remove from form (not saved yet)
      this.conceptItems.removeAt(index);
      this.updateItemOrders();
    }
  }

  private updateItemOrders(): void {
    this.conceptItems.controls.forEach((control, i) => {
      control.patchValue({ order: i + 1 });
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.conceptForm.invalid) {
      this.markAllFieldsAsTouched();
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

      const conceptData: any = {
        conceptHighlight: formValue.conceptHighlight.trim(),
        items: formValue.items.map((item: any, index: number) => ({
          heading: item.heading?.trim() || '',
          paragraph: item.paragraph?.trim() || '',
          order: index + 1
        }))
      };

      const response = await this.conceptService.createOrUpdateConcept(conceptData);

      if (response.data && response.data.code === 1) {
        const actionText = this.isEditMode ? 'updated' : 'created';
        await Swal.fire({
          title: 'Success!',
          text: `Concept has been ${actionText} successfully`,
          icon: 'success',
          confirmButtonText: 'Ok'
        });

        // Reload data to reflect changes
        await this.loadConceptData();
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error submitting concept:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save concept';

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
    if (!this.hasExistingData) {
      await Swal.fire({
        title: 'No Data',
        text: 'No concept data to delete',
        icon: 'info',
        confirmButtonText: 'Ok'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Concept',
      text: 'Are you sure you want to delete the entire concept? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        this.loading = true;
        const response = await this.conceptService.deleteConcept();

        if (response.data && response.data.code === 1) {
          await Swal.fire({
            title: 'Deleted!',
            text: 'Concept has been deleted successfully',
            icon: 'success',
            confirmButtonText: 'Ok'
          });

          // Reset form and state
          this.resetToCreateMode();
        } else {
          throw new Error(response.data?.message || 'Failed to delete concept');
        }
      } catch (error: any) {
        console.error('Error deleting concept:', error);
        await Swal.fire({
          title: 'Error!',
          text: error?.response?.data?.message || 'Failed to delete concept',
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  private resetToCreateMode(): void {
    this.isEditMode = false;
    this.hasExistingData = false;
    this.existingConceptId = null;
    this.submitted = false;

    // Reset form
    this.conceptForm.reset();

    // Clear items array and add one empty item
    while (this.conceptItems.length !== 0) {
      this.conceptItems.removeAt(0);
    }
    this.conceptItems.push(this.createConceptItem());
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.conceptForm.controls).forEach(key => {
      const control = this.conceptForm.get(key);
      control?.markAsTouched();
    });

    this.conceptItems.controls.forEach(group => {
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
