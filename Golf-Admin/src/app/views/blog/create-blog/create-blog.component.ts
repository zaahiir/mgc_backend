import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EditorModule } from '@tinymce/tinymce-angular';
import {
  CardComponent,
  CardHeaderComponent,
  CardBodyComponent,
  FormFloatingDirective,
  FormLabelDirective,
  FormControlDirective,
  FormFeedbackComponent,
  ButtonDirective,
  RowComponent,
  ColComponent,
  SpinnerComponent
} from '@coreui/angular';
import { BlogService } from '../../common-service/blog/blog.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-blog',
  standalone: true,
  imports: [
    NgIf,
    CommonModule,
    ReactiveFormsModule,
    EditorModule,
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    FormFloatingDirective,
    FormLabelDirective,
    FormControlDirective,
    FormFeedbackComponent,
    ButtonDirective,
    RowComponent,
    ColComponent,
    SpinnerComponent
  ],
  templateUrl: './create-blog.component.html',
  styleUrl: './create-blog.component.scss'
})
export class CreateBlogComponent implements OnInit {
  blogForm!: FormGroup;
  loading = false;
  submitted = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private blogService: BlogService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.blogForm = this.formBuilder.group({
      blogTitle: ['', [Validators.required, Validators.minLength(3)]],
      blogDate: ['', [Validators.required]],
      blogDescription: ['', [Validators.required]],
      blogHighlight: [''],
      blogImage: [null]
    });
  }

  onFileChange(event: Event): void {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];

    if (file) {
      // File size validation (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'Error!',
          text: 'File size should not exceed 5MB',
          icon: 'error'
        });
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.blogForm.invalid) {
      // Highlight all invalid fields
      Object.keys(this.blogForm.controls).forEach(key => {
        const control = this.blogForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    try {
      this.loading = true;
      const formData = new FormData();

      // Append form fields to FormData
      Object.keys(this.blogForm.value).forEach(key => {
        if (key !== 'blogImage') {
          formData.append(key, this.blogForm.value[key]);
        }
      });

      // Append file if selected
      if (this.selectedFile) {
        formData.append('blogImage', this.selectedFile);
      }

      const response = await this.blogService.processBlog(formData);

      if (response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Blog post has been created successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/blog']);
      } else {
        throw new Error(response.data.message || 'Failed to create blog post');
      }
    } catch (error) {
      console.error('Error creating blog:', error);
      await Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to create blog post',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
    } finally {
      this.loading = false;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.blogForm.reset();
    this.selectedFile = null;
    this.imagePreview = null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.blogForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.blogForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) {
      return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters`;
    }

    return 'Invalid input';
  }
}
