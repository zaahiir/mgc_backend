import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent {
  // User profile data
  userProfile = {
    name: 'John Doe',
    email: 'johndoe@example.com',
    phone: '+123-456-7890',
    status: 'Premium Member',
    memberSince: 'January 2024'
  };

  // Address data
  addresses = {
    billing: {
      street: '123 Fairway Drive',
      city: 'Greenfield',
      postalCode: '12345',
      country: 'United States'
    },
    shipping: {
      street: '456 Golf Course Road',
      city: 'Greenfield',
      postalCode: '67890',
      country: 'United States'
    }
  };

  // Password form data
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor() {}

  // Method to handle profile edit
  onEditProfile(): void {
    console.log('Edit profile clicked');
    // Add your profile editing logic here
  }

  // Method to handle billing address edit
  onEditBilling(): void {
    console.log('Edit billing address clicked');
    // Add your billing address editing logic here
  }

  // Method to handle shipping address edit
  onEditShipping(): void {
    console.log('Edit shipping address clicked');
    // Add your shipping address editing logic here
  }

  // Method to handle password change
  onChangePassword(): void {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (this.passwordForm.newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    console.log('Password change submitted', this.passwordForm);
    // Add your password change logic here

    // Reset form after successful submission
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };

    alert('Password changed successfully');
  }

  // Method to handle form submission
  onSubmit(event: Event): void {
    event.preventDefault();
    this.onChangePassword();
  }
}
