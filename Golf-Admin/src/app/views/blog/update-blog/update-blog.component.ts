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
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-blog',
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
  templateUrl: './update-blog.component.html',
  styleUrl: './update-blog.component.scss'
})
export class UpdateBlogComponent implements OnInit {
  blogForm!: FormGroup;
  loading = false;
  submitted = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  blogId: string | null = null;
  existingImageUrl: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private blogService: BlogService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    // Add a small delay to ensure form is properly initialized
    setTimeout(() => {
      this.loadBlogData();
    }, 50);
  }

  private initializeForm(): void {
    this.blogForm = this.formBuilder.group({
      blogTitle: ['', [Validators.required, Validators.minLength(3)]],
      blogDate: ['', [Validators.required]],
      blogDescription: ['', [Validators.required]],
      blogHighlight: [''],
      blogQuote: [''],
      blogQuoteCreator: [''],
      blogImage: [null]
    });
  }

  private async loadBlogData(): Promise<void> {
    this.blogId = this.route.snapshot.paramMap.get('id');
    
    if (!this.blogId) {
      await Swal.fire({
        title: 'Error!',
        text: 'Blog ID is required',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      this.router.navigate(['/blog']);
      return;
    }

    try {
      this.loading = true;
      const response = await this.blogService.listBlog(this.blogId);
      
      if (response.data.code === 1 && response.data.data) {
        // Handle both array and single object responses
        let blogData;
        if (Array.isArray(response.data.data)) {
          // If data is an array, take the first item
          blogData = response.data.data[0];
        } else {
          // If data is a single object
          blogData = response.data.data;
        }
        
        if (!blogData) {
          throw new Error('Blog not found');
        }
        
        console.log('Blog data received:', blogData); // Debug log
        
        // Set form values using setValue for more reliable updates
        this.blogForm.setValue({
          blogTitle: blogData.blogTitle || '',
          blogDate: blogData.blogDate ? this.formatDateForInput(blogData.blogDate) : '',
          blogDescription: blogData.blogDescription || '',
          blogHighlight: blogData.blogHighlight || '',
          blogQuote: blogData.blogQuote || '',
          blogQuoteCreator: blogData.blogQuoteCreator || '',
          blogImage: null
        });

        // Set existing image URL if available
        if (blogData.blogImage) {
          this.existingImageUrl = blogData.blogImage;
          this.imagePreview = blogData.blogImage;
        }
        
        console.log('Form values after setValue:', this.blogForm.value); // Debug log
        
        // Add a small delay to ensure TinyMCE editor is properly initialized
        setTimeout(() => {
          this.blogForm.patchValue({
            blogDescription: blogData.blogDescription || ''
          });
        }, 100);
      } else {
        throw new Error('Blog not found');
      }
    } catch (error) {
      console.error('Error loading blog:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to load blog data',
        icon: 'error',
        confirmButtonText: 'Ok'
      });
      this.router.navigate(['/blog']);
    } finally {
      this.loading = false;
    }
  }

  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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

    if (!this.blogId) {
      await Swal.fire({
        title: 'Error!',
        text: 'Blog ID is required',
        icon: 'error',
        confirmButtonText: 'Ok'
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

      const response = await this.blogService.processBlog(formData, this.blogId);

      if (response.data.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Blog post has been updated successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/blog']);
      } else {
        throw new Error(response.data.message || 'Failed to update blog post');
      }
    } catch (error) {
      console.error('Error updating blog:', error);
      await Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to update blog post',
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
    this.imagePreview = this.existingImageUrl;
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

