// login.component.ts
import { Component, OnInit, PLATFORM_ID, Inject, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  @ViewChildren('codeInput') codeInputs!: QueryList<ElementRef>;

  loginForm: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  forgotPasswordForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  setNewPasswordForm: FormGroup = new FormGroup({
    verification_code: new FormArray([]),
    new_password: new FormControl('', [Validators.required, Validators.minLength(8)]),
    confirm_password: new FormControl('', [Validators.required])
  });

  isForgotPasswordActive: boolean = false;
  isSetNewPasswordActive: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  // Password visibility properties
  showLoginPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private formBuilder: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Redirect to home if already logged in
    if (isPlatformBrowser(this.platformId) && this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  ngOnInit(): void {
    // Initialize forms with FormBuilder
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.setNewPasswordForm = this.formBuilder.group({
      verification_code: this.formBuilder.array([
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)]),
        this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d$/)])
      ]),
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // Password visibility toggle methods
  toggleLoginPasswordVisibility(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get verificationCodeArray(): FormArray {
    return this.setNewPasswordForm.get('verification_code') as FormArray;
  }

  getVerificationCodeControls(): FormControl[] {
    return this.verificationCodeArray.controls as FormControl[];
  }

  // Also update your onCodeInput method to properly set the form control value
  onCodeInput(event: any, index: number): void {
    const input = event.target;
    const value = input.value;

    // Only allow single digit
    if (value.length > 1) {
      input.value = value.slice(-1);
    }

    // Set the form control value
    this.verificationCodeArray.at(index).setValue(input.value);

    // Move to next input if current is filled
    if (input.value && index < 5) {
      const nextInput = this.codeInputs.toArray()[index + 1];
      if (nextInput) {
        nextInput.nativeElement.focus();
      }
    }
  }

  // Handle backspace in verification code
  onCodeKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = this.codeInputs.toArray()[index - 1];
      if (prevInput) {
        prevInput.nativeElement.focus();
      }
    }
  }

  // Handle paste in verification code
  onCodePaste(event: ClipboardEvent, index: number): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const digits = pasteData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      const inputs = this.codeInputs.toArray();

      for (let i = 0; i < 6 && i < digits.length; i++) {
        this.verificationCodeArray.at(i).setValue(digits[i]);
        if (inputs[i]) {
          inputs[i].nativeElement.value = digits[i];
        }
      }

      // Focus on the next empty input or the last input
      const nextEmptyIndex = Math.min(digits.length, 5);
      if (inputs[nextEmptyIndex]) {
        inputs[nextEmptyIndex].nativeElement.focus();
      }
    }
  }

  // Get complete verification code
  getVerificationCode(): string {
    return this.verificationCodeArray.value.join('');
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('new_password');
    const confirmPassword = form.get('confirm_password');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword?.errors?.['passwordMismatch']) {
        delete confirmPassword.errors['passwordMismatch'];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
      return null;
    }
  }

  toggleForgotPassword(showForgotPassword: boolean): void {
    this.isForgotPasswordActive = showForgotPassword;
    this.isSetNewPasswordActive = false;
    this.errorMessage = '';
    this.successMessage = '';

    // Reset password visibility when switching forms
    this.showLoginPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  showSetNewPasswordForm(): void {
    this.isForgotPasswordActive = false;
    this.isSetNewPasswordActive = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Clear verification code inputs
    this.verificationCodeArray.controls.forEach(control => control.setValue(''));

    // Reset password visibility
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  backToLogin(): void {
    this.isForgotPasswordActive = false;
    this.isSetNewPasswordActive = false;
    this.errorMessage = '';
    this.successMessage = '';

    // Reset all password visibility states
    this.showLoginPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  onLoginSubmit(): void {
    if (this.loginForm.valid && isPlatformBrowser(this.platformId)) {
      this.isLoading = true;
      this.errorMessage = '';

      const username = this.loginForm.value.username;
      const password = this.loginForm.value.password;

      // Real authentication with Django backend
      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('Login successful:', response);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          
          // Handle different error scenarios
          if (error.status === 401) {
            this.errorMessage = 'Invalid username or password. Please check your credentials.';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Please provide both username and password.';
          } else if (error.status === 0 || error.status === 500) {
            this.errorMessage = 'Server connection error. Please check your internet connection and try again.';
          } else {
            this.errorMessage = 'Login failed. Please try again later.';
          }
        }
      });
    } else if (!this.loginForm.valid) {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.valid && isPlatformBrowser(this.platformId)) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      const email = this.forgotPasswordForm.value.email;

      // Real password reset request
      this.authService.requestPasswordReset(email).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Verification code has been sent to your email. Please check your email and use the code to set a new password.';
          this.forgotPasswordForm.reset();

          // Automatically show the set new password form after 3 seconds
          setTimeout(() => {
            this.showSetNewPasswordForm();
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Password reset error:', error);
          
          if (error.status === 404) {
            this.errorMessage = 'Email not found in our records. Please check the email address.';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid email format.';
          } else if (error.status === 0 || error.status === 500) {
            this.errorMessage = 'Server connection error. Please check your internet connection and try again.';
          } else {
            this.errorMessage = 'Password reset request failed. Please try again later.';
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.forgotPasswordForm);
    }
  }

  onSetNewPasswordSubmit(): void {
    if (this.setNewPasswordForm.valid && isPlatformBrowser(this.platformId)) {
      this.isLoading = true;
      this.errorMessage = '';

      const formData = {
        verification_code: this.getVerificationCode(),
        new_password: this.setNewPasswordForm.value.new_password,
        confirm_password: this.setNewPasswordForm.value.confirm_password
      };

      // Real password reset
      this.authService.setNewPassword(formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Password has been reset successfully. You can now login with your new password.';
          this.setNewPasswordForm.reset();
          this.verificationCodeArray.controls.forEach(control => control.setValue(''));

          // Automatically go back to login form after 3 seconds
          setTimeout(() => {
            this.backToLogin();
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Set new password error:', error);
          
          if (error.status === 400) {
            this.errorMessage = error.error?.message || 'Invalid verification code or password requirements not met.';
          } else if (error.status === 404) {
            this.errorMessage = 'Invalid or expired verification code.';
          } else if (error.status === 0 || error.status === 500) {
            this.errorMessage = 'Server connection error. Please check your internet connection and try again.';
          } else {
            this.errorMessage = 'Password reset failed. Please try again later.';
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.setNewPasswordForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
      if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          arrayControl.markAsTouched();
        });
      }
    });
  }
}
