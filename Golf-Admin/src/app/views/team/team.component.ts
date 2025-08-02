import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

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
    ButtonModule
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
  showForm = false;

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
      facebookUrl: [''],
      instagramUrl: [''],
      twitterUrl: [''],
      hideStatus: [0]
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.loading = true;
      
      // Load protocols
      const protocolResponse = await this.teamService.getAllProtocols().toPromise();
      if (protocolResponse && (protocolResponse as any).status === 'success') {
        this.protocols = (protocolResponse as any).data || [];
      }

      // Load instructors
      const instructorResponse = await this.teamService.getAllInstructors().toPromise();
      if (instructorResponse && (instructorResponse as any).status === 'success') {
        this.instructors = (instructorResponse as any).data || [];
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
      this.showForm = true;
      await this.loadItemData();
    }
  }

  private async loadItemData(): Promise<void> {
    try {
      this.loading = true;
      
      if (this.activeTab === 'protocol') {
        const response = await this.teamService.listProtocol(this.itemId!).toPromise();
        if (response && (response as any).status === 'success' && (response as any).data) {
          const protocolData = (response as any).data;
          this.protocolForm.patchValue({
            protocolTitle: protocolData.protocolTitle || '',
            protocolDescription: protocolData.protocolDescription || '',
            hideStatus: protocolData.hideStatus || 0
          });
        }
      } else {
        const response = await this.teamService.listInstructor(this.itemId!).toPromise();
        if (response && (response as any).status === 'success' && (response as any).data) {
          const instructorData = (response as any).data;
          this.instructorForm.patchValue({
            instructorName: instructorData.instructorName || '',
            instructorPosition: instructorData.instructorPosition || '',
            facebookUrl: instructorData.facebookUrl || '',
            instagramUrl: instructorData.instagramUrl || '',
            twitterUrl: instructorData.twitterUrl || '',
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

      if (response && (response as any).status === 'success') {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: this.isEditMode ? `${this.activeTab} updated successfully!` : `${this.activeTab} created successfully!`
        }).then(async () => {
          await this.loadData();
          this.cancelForm();
        });
      } else {
        throw new Error((response as any)?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      let errorMessage = `Failed to save ${this.activeTab}`;
      
      if (error.response?.message) {
        errorMessage = error.response.message;
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
    this.showForm = false;
    
    // Reset forms
    this.protocolForm.reset({
      hideStatus: 0
    });
    this.instructorForm.reset({
      hideStatus: 0
    });
  }

  showProtocolForm(): void {
    this.showForm = true;
    this.isEditMode = false;
    this.itemId = null;
    this.protocolForm.reset({
      hideStatus: 0
    });
  }

  showInstructorForm(): void {
    this.showForm = true;
    this.isEditMode = false;
    this.itemId = null;
    this.selectedFile = null;
    this.imagePreview = null;
    this.instructorForm.reset({
      hideStatus: 0
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.itemId = null;
    this.submitted = false;
    this.imagePreview = null;
    this.selectedFile = null;
  }

  async editProtocol(protocol: any): Promise<void> {
    this.showForm = true;
    this.isEditMode = true;
    this.itemId = protocol.id.toString();
    await this.loadItemData();
  }

  async editInstructor(instructor: any): Promise<void> {
    this.showForm = true;
    this.isEditMode = true;
    this.itemId = instructor.id.toString();
    await this.loadItemData();
  }

  async deleteProtocol(id: number): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: 'This will delete the protocol. This action cannot be undone!',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        this.loading = true;
        const response = await this.teamService.deleteProtocol(id.toString()).toPromise();

        if (response && (response as any).status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Protocol has been deleted successfully.'
          });
          await this.loadData();
        } else {
          throw new Error((response as any)?.message || 'Unknown error occurred');
        }
      } catch (error: any) {
        console.error('Error deleting protocol:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete protocol'
        });
      } finally {
        this.loading = false;
      }
    }
  }

  async deleteInstructor(id: number): Promise<void> {
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
        const response = await this.teamService.deleteInstructor(id.toString()).toPromise();

        if (response && (response as any).status === 'success') {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Instructor has been deleted successfully.'
          });
          await this.loadData();
        } else {
          throw new Error((response as any)?.message || 'Unknown error occurred');
        }
      } catch (error: any) {
        console.error('Error deleting instructor:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete instructor'
        });
      } finally {
        this.loading = false;
      }
    }
  }


}

