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
import { TeamService } from '../common-service/team/team.service';

@Component({
  selector: 'app-team',
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
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss'
})
export class TeamComponent implements OnInit {
  protocolForm!: FormGroup;
  instructorForm!: FormGroup;
  loading = false;
  submitted = false;
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  isEditMode = false;
  itemId: string | null = null;
  activeTab: 'protocol' | 'instructor' = 'protocol';
  protocols: any[] = [];
  instructors: any[] = [];

  constructor(
    private formBuilder: FormBuilder,
    public router: Router,
    private route: ActivatedRoute,
    private teamService: TeamService,
    private domSanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadData();
    this.checkEditMode();
  }

  private initializeForms(): void {
    // Protocol Form
    this.protocolForm = this.formBuilder.group({
      protocolTitle: ['', [Validators.required, Validators.maxLength(255)]],
      protocolDescription: ['', [Validators.required]],
      hideStatus: [0]
    });

    // Instructor Form
    this.instructorForm = this.formBuilder.group({
      instructorName: ['', [Validators.required, Validators.maxLength(255)]],
      instructorPosition: ['', [Validators.required, Validators.maxLength(255)]],
      instructorPhoto: [null],
      hideStatus: [0]
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.loading = true;
      
      // Load protocols
      const protocolResponse = await this.teamService.getActiveProtocols().toPromise();
      if (protocolResponse && (protocolResponse as any).data?.status === 'success') {
        this.protocols = (protocolResponse as any).data.data || [];
      }

      // Load instructors
      const instructorResponse = await this.teamService.getActiveInstructors().toPromise();
      if (instructorResponse && (instructorResponse as any).data?.status === 'success') {
        this.instructors = (instructorResponse as any).data.data || [];
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading = false;
    }
  }

  private async checkEditMode(): Promise<void> {
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId && this.itemId !== '0') {
      this.isEditMode = true;
      await this.loadItemData();
    }
  }

  private async loadItemData(): Promise<void> {
    try {
      this.loading = true;
      
      if (this.activeTab === 'protocol') {
        const response = await this.teamService.listProtocol(this.itemId!).toPromise();
        if (response && (response as any).data?.status === 'success' && (response as any).data?.data) {
          const protocolData = (response as any).data.data;
          this.protocolForm.patchValue({
            protocolTitle: protocolData.protocolTitle || '',
            protocolDescription: protocolData.protocolDescription || '',
            hideStatus: protocolData.hideStatus || 0
          });
        }
      } else {
        const response = await this.teamService.listInstructor(this.itemId!).toPromise();
        if (response && (response as any).data?.status === 'success' && (response as any).data?.data) {
          const instructorData = (response as any).data.data;
          this.instructorForm.patchValue({
            instructorName: instructorData.instructorName || '',
            instructorPosition: instructorData.instructorPosition || '',
            hideStatus: instructorData.hideStatus || 0
          });

          if (instructorData.instructorPhotoUrl) {
            this.imagePreview = instructorData.instructorPhotoUrl;
          }
        }
      }
    } catch (error) {
      console.error('Error loading item data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load data'
      });
    } finally {
      this.loading = false;
    }
  }

  onMainImageChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      this.selectedFile = target.files[0];
      this.instructorForm.patchValue({ instructorPhoto: this.selectedFile });
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeMainImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.instructorForm.patchValue({ instructorPhoto: null });
  }

  get f() {
    return this.activeTab === 'protocol' ? this.protocolForm.controls : this.instructorForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    const currentForm = this.activeTab === 'protocol' ? this.protocolForm : this.instructorForm;
    
    if (currentForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      const formData = new FormData();
      const formValue = currentForm.value;

      // Add all form fields to FormData
      Object.keys(formValue).forEach(key => {
        if (key === 'is_active') {
          formData.append(key, formValue[key] ? 'true' : 'false');
        } else if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
          formData.append(key, formValue[key]);
        }
      });

      // Add image if selected (only for instructor)
      if (this.activeTab === 'instructor' && this.selectedFile) {
        formData.append('instructorPhoto', this.selectedFile);
      }

      let response;
      if (this.activeTab === 'protocol') {
        response = await this.teamService.processProtocol(formData as any, this.itemId || '0').toPromise();
      } else {
        response = await this.teamService.processInstructor(formData as any, this.itemId || '0').toPromise();
      }

      if (response && (response as any).data?.status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: this.isEditMode ? `${this.activeTab} updated successfully!` : `${this.activeTab} created successfully!`
        }).then(() => {
          this.router.navigate(['/team']);
        });
      } else {
        throw new Error((response as any)?.data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      let errorMessage = `Failed to save ${this.activeTab}`;
      
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
    if (!this.itemId || this.itemId === '0') {
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
        let response;
        
        if (this.activeTab === 'protocol') {
          response = await this.teamService.deleteProtocol(this.itemId).toPromise();
        } else {
          response = await this.teamService.deleteInstructor(this.itemId).toPromise();
        }

        if (response && (response as any).data?.status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${this.activeTab} has been deleted successfully.`
          }).then(() => {
            this.router.navigate(['/team']);
          });
        } else {
          throw new Error((response as any)?.data?.message || 'Unknown error occurred');
        }
      } catch (error: any) {
        console.error('Error deleting item:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to delete ${this.activeTab}`
        });
      } finally {
        this.loading = false;
      }
    }
  }



  isFieldInvalid(fieldName: string): boolean {
    const currentForm = this.activeTab === 'protocol' ? this.protocolForm : this.instructorForm;
    const field = currentForm.get(fieldName);
    return field ? (this.submitted && field.invalid) : false;
  }

  getErrorMessage(fieldName: string): string {
    const currentForm = this.activeTab === 'protocol' ? this.protocolForm : this.instructorForm;
    const field = currentForm.get(fieldName);
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

  setActiveTab(tab: 'protocol' | 'instructor'): void {
    this.activeTab = tab;
    this.submitted = false;
    this.imagePreview = null;
    this.selectedFile = null;
    this.isEditMode = false;
    this.itemId = null;
    
    // Reset forms
    this.protocolForm.reset({
      is_active: true,
      hideStatus: 0
    });
    this.instructorForm.reset({
      is_active: true,
      hideStatus: 0
    });
  }


}

