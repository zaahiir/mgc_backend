import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

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
import { Router, ActivatedRoute } from '@angular/router';
import { FaqService, FAQData } from '../../common-service/faq/faq.service';

@Component({
  selector: 'app-faq',
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
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent implements OnInit {

  faqForm!: FormGroup;
  loading = false;
  submitted = false;
  isEditMode = false;
  itemId: string | null = null;
  faqs: any[] = [];
  showForm = false;

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private faqService: FaqService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadData();
    this.checkEditMode();
  }

  private initializeForm(): void {
    this.faqForm = this.formBuilder.group({
      faqQuestion: ['', [Validators.required, Validators.maxLength(500)]],
      faqAnswer: ['', [Validators.required]],
      hideStatus: [0]
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.loading = true;
      const response = await this.faqService.getAllFAQs().toPromise();
      if (response && response.data) {
        this.faqs = response.data;
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load FAQs'
      });
    } finally {
      this.loading = false;
    }
  }

  private async checkEditMode(): Promise<void> {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && id !== '0') {
        this.isEditMode = true;
        this.itemId = id;
        this.loadItemData();
      }
    });
  }

  private async loadItemData(): Promise<void> {
    if (!this.itemId) return;

    try {
      this.loading = true;
      const response = await this.faqService.listFAQ(this.itemId).toPromise();
      if (response && response.data) {
        const faq = response.data;
        this.faqForm.patchValue({
          faqQuestion: faq.faqQuestion,
          faqAnswer: faq.faqAnswer,
          hideStatus: faq.hideStatus
        });
        this.showForm = true;
      }
    } catch (error) {
      console.error('Error loading FAQ data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load FAQ data'
      });
    } finally {
      this.loading = false;
    }
  }

  get f() {
    return this.faqForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.faqForm.invalid) {
      return;
    }

    try {
      this.loading = true;
      const formData = this.faqForm.value;
      const id = this.isEditMode ? this.itemId : '0';

      const response = await this.faqService.processFAQ(formData, id!).toPromise();
      
      if (response && response.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: this.isEditMode ? 'FAQ updated successfully' : 'FAQ created successfully'
        });

        this.resetForm();
        this.loadData();
      } else {
        throw new Error(response?.message || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error processing FAQ:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process FAQ'
      });
    } finally {
      this.loading = false;
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.faqForm.get(fieldName);
    return field!.invalid && (field!.dirty || field!.touched || this.submitted);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.faqForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['maxlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  showFAQForm(): void {
    this.showForm = true;
    this.isEditMode = false;
    this.itemId = null;
    this.resetForm();
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.itemId = null;
    this.resetForm();
    this.submitted = false;
  }

  private resetForm(): void {
    this.faqForm.reset({
      faqQuestion: '',
      faqAnswer: '',
      hideStatus: 0
    });
    this.submitted = false;
  }

  async editFAQ(faq: any): Promise<void> {
    this.isEditMode = true;
    this.itemId = faq.id.toString();
    this.faqForm.patchValue({
      faqQuestion: faq.faqQuestion,
      faqAnswer: faq.faqAnswer,
      hideStatus: faq.hideStatus
    });
    this.showForm = true;
  }

  async deleteFAQ(id: number): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        this.loading = true;
        const response = await this.faqService.deleteFAQ(id.toString()).toPromise();
        
        if (response && response.status === 'success') {
          Swal.fire(
            'Deleted!',
            'FAQ has been deleted.',
            'success'
          );
          this.loadData();
        } else {
          throw new Error(response?.message || 'Unknown error');
        }
      } catch (error: any) {
        console.error('Error deleting FAQ:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete FAQ'
        });
      } finally {
        this.loading = false;
      }
    }
  }
}
