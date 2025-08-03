import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import {
  ContainerComponent,
  RowComponent,
  ColComponent,
  CardComponent,
  CardBodyComponent,
  FormDirective,
  FormControlDirective,
  ButtonDirective
} from '@coreui/angular';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ContainerComponent,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    FormDirective,
    FormControlDirective,
    ButtonDirective,
    NgIf
  ]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // Check if user is superuser
          if (response.user_type === 'superuser') {
            this.router.navigate(['/dashboard']);
          } else {
            // Clear any stored data and show error
            this.authService.forceLogout();
            this.errorMessage = 'Access denied. Only superuser accounts are allowed.';
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.detail || 'Login failed. Please check your credentials and try again.';
        }
      });
    }
  }
}
