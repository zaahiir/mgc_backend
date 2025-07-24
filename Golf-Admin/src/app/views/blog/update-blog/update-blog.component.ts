import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-update-blog',
  standalone: true,
  imports: [
    NgIf, CommonModule, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    ButtonDirective
  ],
  templateUrl: './update-blog.component.html',
  styleUrl: './update-blog.component.scss'
})
export class UpdateBlogComponent implements OnInit {
  blogForm!: FormGroup;
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
    this.blogForm = this.formBuilder.group({
      blogTitle: ['', [Validators.required, Validators.minLength(5)]],
      blogAuthor: ['', [Validators.required, Validators.minLength(3)]],
      blogDate: ['', [Validators.required]],
      blogCategory: ['', [Validators.required, Validators.minLength(3)]],
      blogContent: ['', [Validators.required, Validators.minLength(100)]],
      blogTags: ['', [Validators.required, Validators.minLength(3)]],
      blogImage: ['']
    });
  }

  get f() {
    return this.blogForm.controls;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.blogForm.invalid) {
      return;
    }

    try {
      this.loading = true;

      // Add your API call here to save the blog data
      // const response = await this.blogService.createBlog(this.blogForm.value);

      await Swal.fire({
        title: 'Success!',
        text: 'Blog post has been created successfully',
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      this.router.navigate(['/blogs']);
    } catch (error) {
      console.error('Error creating blog:', error);
      await Swal.fire({
        title: 'Error!',
        text: 'Failed to create blog post',
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
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.blogForm.get(fieldName);
    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.blogForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;

    return 'Invalid input';
  }
}

