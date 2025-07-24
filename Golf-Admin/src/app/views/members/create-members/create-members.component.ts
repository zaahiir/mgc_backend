import { Component, OnInit } from '@angular/core';
import { NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';
import { MemberService } from '../../common-service/member/member.service';
import { MemberEnquiryService } from '../../common-service/memberEnquiry/member-enquiry.service';

interface Gender {
  id: number;
  genderName: string;
}

interface Country {
  id: number;
  countryName: string;
}

interface PaymentStatus {
  id: number;
  statusName: string;
}

interface PaymentMethod {
  id: number;
  methodName: string;
}

interface Plan {
  id: number;
  planName: string;
}

interface MemberEnquiry {
  id: number;
  memberEnquiryDate: string;
  memberEnquiryPlan: any;
  memberEnquiryFirstName: string;
  memberEnquiryLastName: string;
  memberEnquiryPhoneNumber: string;
  memberEnquiryEmail: string;
  memberEnquiryMessage: string;
}

@Component({
  selector: 'app-create-members',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    FormSelectDirective, ButtonDirective
  ],
  templateUrl: './create-members.component.html',
  styleUrl: './create-members.component.scss'
})
export class CreateMemberComponent implements OnInit {
  readonly CLUB_PREFIX = 'MGC';
  memberForm!: FormGroup;
  loading = false;
  submitted = false;
  selectedProfileFile: File | null = null;
  selectedIdProofFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  genders: Gender[] = [];
  countries: Country[] = [];
  paymentStatuses: PaymentStatus[] = [];
  paymentMethods: PaymentMethod[] = [];
  plans: Plan[] = [];

  enquiryId: string | null = null;
  isFromEnquiry = false;
  pageTitle = 'New Member Profile';

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private memberEnquiryService: MemberEnquiryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    const currentDate = new Date().toISOString().split('T')[0];

    this.memberForm = this.fb.group({
      // ONLY Required fields with validators
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      plan: ['', [Validators.required]],

      // ALL Optional fields - NO validators
      password: [''],
      alternatePhoneNumber: [''],
      dateOfBirth: [''],
      gender: [''],
      nationality: [''],
      address: [''],
      membershipStartDate: [currentDate],
      membershipEndDate: [''],
      emergencyContactName: [''],
      emergencyContactPhone: [''],
      emergencyContactRelation: [''],
      paymentStatus: [''],
      paymentMethod: [''],
      referredBy: [''],
      profilePhoto: [''],
      idProof: [''],
      handicap: [false],
      golfClubId: [''],
      enquiryId: [''],
      enquiryMessage: ['']
    });
  }

  private generatePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    let password = '';
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(special);

    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private getRandomChar(charset: string): string {
    return charset[Math.floor(Math.random() * charset.length)];
  }

  async ngOnInit(): Promise<void> {
    try {
      this.route.queryParams.subscribe(params => {
        if (params['enquiryId']) {
          this.enquiryId = params['enquiryId'];
          this.isFromEnquiry = true;
          this.pageTitle = 'Convert Enquiry to Member';
        }
      });

      await this.loadDropdownData();

      if (this.isFromEnquiry && this.enquiryId) {
        await this.loadEnquiryData();
      }
    } catch (error) {
      await this.showError('Failed to load form data');
    }
  }

  private async loadEnquiryData(): Promise<void> {
  try {
    const response = await this.memberEnquiryService.listMemberEnquiry(this.enquiryId!);

    if (response?.data?.code === 1 && response.data.data && response.data.data.length > 0) {
      const enquiryData: MemberEnquiry = response.data.data[0];

      let planId = '';
      if (enquiryData.memberEnquiryPlan) {
        console.log('Original plan data:', enquiryData.memberEnquiryPlan); // Debug log

        if (typeof enquiryData.memberEnquiryPlan === 'object' && enquiryData.memberEnquiryPlan.id) {
          planId = enquiryData.memberEnquiryPlan.id.toString();
        } else if (typeof enquiryData.memberEnquiryPlan === 'number') {
          planId = enquiryData.memberEnquiryPlan.toString();
        } else if (typeof enquiryData.memberEnquiryPlan === 'string') {
          // First try to parse as number (if it's already an ID)
          const parsedId = parseInt(enquiryData.memberEnquiryPlan);
          if (!isNaN(parsedId)) {
            // Check if this ID exists in plans
            const planExists = this.plans.find(plan => plan.id === parsedId);
            if (planExists) {
              planId = parsedId.toString();
            }
          }

          // If not found by ID, try to match by name
          if (!planId) {
            const matchingPlan = this.plans.find(plan =>
              plan.planName.toLowerCase().trim() === enquiryData.memberEnquiryPlan.toLowerCase().trim()
            );
            if (matchingPlan) {
              planId = matchingPlan.id.toString();
            }
          }
        }
      }

      console.log('Resolved plan ID:', planId); // Debug log
      console.log('Available plans:', this.plans); // Debug log

      // Patch the form values
      this.memberForm.patchValue({
        firstName: enquiryData.memberEnquiryFirstName || '',
        lastName: enquiryData.memberEnquiryLastName || '',
        email: enquiryData.memberEnquiryEmail || '',
        phoneNumber: enquiryData.memberEnquiryPhoneNumber || '',
        plan: planId,
        enquiryId: this.enquiryId,
        enquiryMessage: enquiryData.memberEnquiryMessage || ''
      });

      // Disable the fields that were populated from enquiry
      this.disableEnquiryFields(enquiryData, planId);

    } else {
      await this.showError('Failed to load enquiry data');
    }
  } catch (error) {
    console.error('Error loading enquiry data:', error); // Debug log
    await this.showError('Failed to load enquiry data');
  }
}

  private disableEnquiryFields(enquiryData: MemberEnquiry, planId: string): void {
    // Disable fields that have data from enquiry
    if (enquiryData.memberEnquiryFirstName) {
      this.memberForm.get('firstName')?.disable();
    }

    if (enquiryData.memberEnquiryLastName) {
      this.memberForm.get('lastName')?.disable();
    }

    if (enquiryData.memberEnquiryEmail) {
      this.memberForm.get('email')?.disable();
    }

    if (enquiryData.memberEnquiryPhoneNumber) {
      this.memberForm.get('phoneNumber')?.disable();
    }

    if (planId) {
      this.memberForm.get('plan')?.disable();
    }

    // Always disable enquiry message as it's just for reference
    this.memberForm.get('enquiryMessage')?.disable();
  }

  get f() { return this.memberForm.controls; }

  private async loadDropdownData(): Promise<void> {
    try {
      const [genderRes, countryRes, planRes, statusRes, methodRes] = await Promise.all([
        this.memberService.getGender(),
        this.memberService.getNationality(),
        this.memberService.getPlan(),
        this.memberService.getPaymentStatus(),
        this.memberService.getPaymentMethod()
      ]);

      if (genderRes?.data) {
        this.genders = Array.isArray(genderRes.data) ? genderRes.data :
                      genderRes.data.data ? genderRes.data.data : [];
      }

      if (countryRes?.data) {
        this.countries = Array.isArray(countryRes.data) ? countryRes.data :
                        countryRes.data.data ? countryRes.data.data : [];
      }

      if (planRes?.data) {
        this.plans = Array.isArray(planRes.data) ? planRes.data :
                     planRes.data.data ? planRes.data.data : [];
      }

      if (statusRes?.data) {
        this.paymentStatuses = Array.isArray(statusRes.data) ? statusRes.data :
                              statusRes.data.data ? statusRes.data.data : [];
      }

      if (methodRes?.data) {
        this.paymentMethods = Array.isArray(methodRes.data) ? methodRes.data :
                             methodRes.data.data ? methodRes.data.data : [];
      }
    } catch (error) {
      throw error;
    }
  }

  onFileSelected(event: any, type: 'profile' | 'idProof'): void {
    const file = event.target.files[0];
    if (file) {
      if (type === 'profile') {
        this.selectedProfileFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.previewUrl = e.target?.result || null;
        };
        reader.readAsDataURL(file);
      } else {
        this.selectedIdProofFile = file;
      }
    }
  }

  removePhoto(type: 'profile' | 'idProof'): void {
    if (type === 'profile') {
      this.selectedProfileFile = null;
      this.previewUrl = null;
      const fileInput = document.getElementById('profilePhoto') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      this.selectedIdProofFile = null;
      const fileInput = document.getElementById('idProof') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  async onSubmit(): Promise<void> {
  try {
    this.submitted = true;

    if (this.memberForm.invalid) {
      const firstInvalidField = this.getFirstInvalidField();
      if (firstInvalidField) {
        const element = document.querySelector(`[formcontrolname="${firstInvalidField}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      await this.showError('Please fill in all required fields correctly.');
      return;
    }

    this.loading = true;

    const generatedMemberId = await this.generateMemberId();
    const generatedPassword = this.generatePassword();

    const formData = new FormData();
    const formValues = this.memberForm.getRawValue(); // Use getRawValue to get disabled fields too

    // Validate plan ID before submission
    const planId = formValues.plan;
    console.log('Submitting with plan ID:', planId); // Debug log

    if (!planId || planId === '' || planId === 'null') {
      await this.showError('Please select a valid membership plan.');
      this.loading = false;
      return;
    }

    // Verify plan exists
    const planExists = this.plans.find(plan => plan.id.toString() === planId.toString());
    if (!planExists) {
      await this.showError('Selected plan is invalid. Please select a valid membership plan.');
      this.loading = false;
      return;
    }

    // Add required fields
    formData.append('firstName', (formValues.firstName || '').toString().trim());
    formData.append('lastName', (formValues.lastName || '').toString().trim());
    formData.append('email', (formValues.email || '').toString().trim());
    formData.append('phoneNumber', (formValues.phoneNumber || '').toString().trim());
    formData.append('plan', planId.toString()); // Ensure it's a string

    // Add generated fields
    formData.append('golfClubId', generatedMemberId);
    formData.append('password', generatedPassword);

    // Add optional fields only if they have values (not empty or null)
    if (formValues.alternatePhoneNumber && formValues.alternatePhoneNumber.trim()) {
      formData.append('alternatePhoneNumber', formValues.alternatePhoneNumber.trim());
    }

    if (formValues.dateOfBirth) {
      formData.append('dateOfBirth', new Date(formValues.dateOfBirth).toISOString().split('T')[0]);
    }

    // Only append optional foreign key fields if they have actual values
    if (formValues.gender && formValues.gender !== '' && formValues.gender !== 'null') {
      formData.append('gender', formValues.gender.toString());
    }

    if (formValues.nationality && formValues.nationality !== '' && formValues.nationality !== 'null') {
      formData.append('nationality', formValues.nationality.toString());
    }

    if (formValues.address && formValues.address.trim()) {
      formData.append('address', formValues.address.trim());
    }

    if (formValues.membershipStartDate) {
      formData.append('membershipStartDate', new Date(formValues.membershipStartDate).toISOString().split('T')[0]);
    }

    if (formValues.membershipEndDate) {
      formData.append('membershipEndDate', new Date(formValues.membershipEndDate).toISOString().split('T')[0]);
    }

    if (formValues.emergencyContactName && formValues.emergencyContactName.trim()) {
      formData.append('emergencyContactName', formValues.emergencyContactName.trim());
    }

    if (formValues.emergencyContactPhone && formValues.emergencyContactPhone.trim()) {
      formData.append('emergencyContactPhone', formValues.emergencyContactPhone.trim());
    }

    if (formValues.emergencyContactRelation && formValues.emergencyContactRelation.trim()) {
      formData.append('emergencyContactRelation', formValues.emergencyContactRelation.trim());
    }

    // Only append payment fields if they have actual values
    if (formValues.paymentStatus && formValues.paymentStatus !== '' && formValues.paymentStatus !== 'null') {
      formData.append('paymentStatus', formValues.paymentStatus.toString());
    }

    if (formValues.paymentMethod && formValues.paymentMethod !== '' && formValues.paymentMethod !== 'null') {
      formData.append('paymentMethod', formValues.paymentMethod.toString());
    }

    if (formValues.referredBy && formValues.referredBy.trim()) {
      formData.append('referredBy', formValues.referredBy.trim());
    }

    formData.append('handicap', formValues.handicap ? 'true' : 'false');

    if (formValues.enquiryId) {
      formData.append('enquiryId', formValues.enquiryId.toString());
    }

    if (formValues.enquiryMessage && formValues.enquiryMessage.trim()) {
      formData.append('enquiryMessage', formValues.enquiryMessage.trim());
    }

    if (this.selectedProfileFile) {
      formData.append('profilePhoto', this.selectedProfileFile);
    }

    if (this.selectedIdProofFile) {
      formData.append('idProof', this.selectedIdProofFile);
    }

    // Debug: Log all form data
  console.log('FormData contents:');
  // Use forEach instead of entries() for better TypeScript compatibility
  formData.forEach((value, key) => {
    console.log(`${key}: ${value}`);
  });

    const response = await this.memberService.processMember(formData);

    if (response?.data?.code === 1) {
      let successMessage = `Member has been created successfully with Golf Club ID: ${generatedMemberId}. Login credentials have been sent to their email.`;

      if (this.isFromEnquiry && this.enquiryId) {
        try {
          await this.markEnquiryAsConverted(this.enquiryId, generatedMemberId);
          successMessage = `Enquiry has been successfully converted to member with Golf Club ID: ${generatedMemberId}. Login credentials have been sent to their email.`;
        } catch (error) {
          await Swal.fire({
            title: 'Warning',
            text: `Member created successfully with ID: ${generatedMemberId}, but failed to update enquiry status. Please manually update the enquiry status.`,
            icon: 'warning',
            confirmButtonText: 'Ok'
          });
          this.router.navigate([this.isFromEnquiry ? '/memberEnquiry' : '/members']);
          return;
        }
      }

      await Swal.fire({
        title: 'Success!',
        text: successMessage,
        icon: 'success',
        confirmButtonText: 'Ok'
      });

      if (this.isFromEnquiry) {
        this.router.navigate(['/memberEnquiry']);
      } else {
        this.router.navigate(['/members']);
      }
    } else {
      const errorMessage = response?.data?.message || 'Failed to create member';
      const errors = response?.data?.errors;

      console.error('Server response error:', response?.data); // Debug log

      if (errors) {
        let errorDetails = '';
        for (const [field, fieldErrors] of Object.entries(errors)) {
          if (Array.isArray(fieldErrors)) {
            errorDetails += `${field}: ${fieldErrors.join(', ')}\n`;
          }
        }
        throw new Error(`${errorMessage}\n\nDetails:\n${errorDetails}`);
      } else {
        throw new Error(errorMessage);
      }
    }
  } catch (error) {
    console.error('Submission error:', error); // Debug log
    await this.showError(error instanceof Error ? error.message : 'Failed to create member');
  } finally {
    this.loading = false;
  }
}

  private async markEnquiryAsConverted(enquiryId: string, memberId: string): Promise<void> {
    try {
      const response = await this.memberEnquiryService.markEnquiryConverted(enquiryId, {
        convertedMemberId: memberId
      });

      if (response?.data?.code !== 1) {
        const errorMessage = response?.data?.message || 'Failed to mark enquiry as converted';
        throw new Error(errorMessage);
      }
    } catch (error) {
      throw error;
    }
  }

  private async generateMemberId(): Promise<string> {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

      const lastMemberId = await this.memberService.getLastMemberId(year, month);

      let sequence: number;
      if (!lastMemberId) {
        sequence = 1;
      } else {
        const lastSequence = parseInt(lastMemberId.slice(-4));
        sequence = lastSequence + 1;
      }

      const sequenceStr = sequence.toString().padStart(4, '0');
      return `${this.CLUB_PREFIX}${year}${month}${sequenceStr}`;
    } catch (error) {
      throw new Error('Failed to generate member ID');
    }
  }

  private getFirstInvalidField(): string | null {
    const controls = this.memberForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        return name;
      }
    }
    return null;
  }

  // Only validate the actually required fields
  isFieldInvalid(fieldName: string): boolean {
    const field = this.memberForm.get(fieldName);
    const requiredFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'plan'];

    // Only show validation errors for required fields
    if (!requiredFields.includes(fieldName)) {
      return false;
    }

    return Boolean(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getErrorMessage(fieldName: string): string {
    const control = this.memberForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email address';
    if (control.errors['pattern']) {
      if (fieldName === 'phoneNumber') return 'Please enter a valid phone number';
    }
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength} characters`;

    return 'Invalid input';
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire('Error', message, 'error');
  }
}
