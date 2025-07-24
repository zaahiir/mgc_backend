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

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  plan: string;
  golfClubId: string;
  membershipStartDate?: string;
  membershipEndDate?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  referredBy?: string;
  profilePhoto?: string;
  idProof?: string;
  handicap: boolean;
  enquiryId?: string;
  enquiryMessage?: string;
}

@Component({
  selector: 'app-update-members',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    FormSelectDirective, ButtonDirective
  ],
  templateUrl: './update-members.component.html',
  styleUrl: './update-members.component.scss'
})
export class UpdateMembersComponent implements OnInit {
  memberForm!: FormGroup;
  loading = false;
  submitted = false;
  selectedProfileFile: File | null = null;
  selectedIdProofFile: File | null = null;
  profilePhotoPreview: string | ArrayBuffer | null = null;
  idProofPreview: string | ArrayBuffer | null = null;

  genders: Gender[] = [];
  nationalities: Country[] = [];
  paymentStatuses: PaymentStatus[] = [];
  paymentMethods: PaymentMethod[] = [];
  plans: Plan[] = [];

  memberId: string | null = null;
  memberData: Member | null = null;
  pageTitle = 'Update Member Profile';

  // Define the required fields for validation
  private readonly requiredFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'plan'];

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
    this.memberForm = this.fb.group({
      // ONLY Required fields with validators
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      plan: ['', [Validators.required]],

      // ALL Optional fields - NO validators
      alternatePhoneNumber: [''],
      dateOfBirth: [''],
      gender: [''],
      nationality: [''],
      address: [''],
      golfClubId: [''],
      membershipStartDate: [''],
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
      enquiryId: [''],
      enquiryMessage: ['']
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      // Get member ID from route
      this.memberId = this.route.snapshot.paramMap.get('id');

      if (!this.memberId) {
        await this.showError('Member ID not found');
        this.router.navigate(['/members']);
        return;
      }

      await this.loadDropdownData();
      await this.loadMemberData();
    } catch (error) {
      await this.showError('Failed to load member data');
    }
  }

  private async loadMemberData(): Promise<void> {
    try {
      const response = await this.memberService.listMember(this.memberId!);

      if (response?.data?.code === 1 && response.data.data && response.data.data.length > 0) {
        this.memberData = response.data.data[0];
        this.populateForm();
      } else {
        await this.showError('Failed to load member data');
        this.router.navigate(['/members']);
      }
    } catch (error) {
      console.error('Error loading member data:', error);
      await this.showError('Failed to load member data');
      this.router.navigate(['/members']);
    }
  }

  private populateForm(): void {
    if (!this.memberData) return;

    // Handle plan ID - convert plan name to ID if needed
    let planId = '';
    if (this.memberData.plan) {
      // First try to find by plan name
      const planByName = this.plans.find(plan =>
        plan.planName.toLowerCase().trim() === this.memberData!.plan.toLowerCase().trim()
      );

      if (planByName) {
        planId = planByName.id.toString();
      } else {
        // If not found by name, try by ID
        const planById = this.plans.find(plan => plan.id.toString() === this.memberData!.plan);
        if (planById) {
          planId = planById.id.toString();
        }
      }
    }

    // Handle gender ID - convert gender name to ID if needed
    let genderId = '';
    if (this.memberData.gender) {
      const genderByName = this.genders.find(gender =>
        gender.genderName.toLowerCase().trim() === this.memberData!.gender!.toLowerCase().trim()
      );

      if (genderByName) {
        genderId = genderByName.id.toString();
      } else {
        const genderById = this.genders.find(gender => gender.id.toString() === this.memberData!.gender);
        if (genderById) {
          genderId = genderById.id.toString();
        }
      }
    }

    // Handle nationality ID - convert nationality name to ID if needed
    let nationalityId = '';
    if (this.memberData.nationality) {
      const nationalityByName = this.nationalities.find(nationality =>
        nationality.countryName.toLowerCase().trim() === this.memberData!.nationality!.toLowerCase().trim()
      );

      if (nationalityByName) {
        nationalityId = nationalityByName.id.toString();
      } else {
        const nationalityById = this.nationalities.find(nationality => nationality.id.toString() === this.memberData!.nationality);
        if (nationalityById) {
          nationalityId = nationalityById.id.toString();
        }
      }
    }

    // Handle payment status ID
    let paymentStatusId = '';
    if (this.memberData.paymentStatus) {
      const statusByName = this.paymentStatuses.find(status =>
        status.statusName.toLowerCase().trim() === this.memberData!.paymentStatus!.toLowerCase().trim()
      );

      if (statusByName) {
        paymentStatusId = statusByName.id.toString();
      } else {
        const statusById = this.paymentStatuses.find(status => status.id.toString() === this.memberData!.paymentStatus);
        if (statusById) {
          paymentStatusId = statusById.id.toString();
        }
      }
    }

    // Handle payment method ID
    let paymentMethodId = '';
    if (this.memberData.paymentMethod) {
      const methodByName = this.paymentMethods.find(method =>
        method.methodName.toLowerCase().trim() === this.memberData!.paymentMethod!.toLowerCase().trim()
      );

      if (methodByName) {
        paymentMethodId = methodByName.id.toString();
      } else {
        const methodById = this.paymentMethods.find(method => method.id.toString() === this.memberData!.paymentMethod);
        if (methodById) {
          paymentMethodId = methodById.id.toString();
        }
      }
    }

    // Patch the form with member data
    this.memberForm.patchValue({
      firstName: this.memberData.firstName || '',
      lastName: this.memberData.lastName || '',
      email: this.memberData.email || '',
      phoneNumber: this.memberData.phoneNumber || '',
      alternatePhoneNumber: this.memberData.alternatePhoneNumber || '',
      dateOfBirth: this.memberData.dateOfBirth || '',
      gender: genderId,
      nationality: nationalityId,
      address: this.memberData.address || '',
      plan: planId,
      golfClubId: this.memberData.golfClubId || '',
      membershipStartDate: this.memberData.membershipStartDate || '',
      membershipEndDate: this.memberData.membershipEndDate || '',
      emergencyContactName: this.memberData.emergencyContactName || '',
      emergencyContactPhone: this.memberData.emergencyContactPhone || '',
      emergencyContactRelation: this.memberData.emergencyContactRelation || '',
      paymentStatus: paymentStatusId,
      paymentMethod: paymentMethodId,
      referredBy: this.memberData.referredBy || '',
      handicap: this.memberData.handicap || false,
      enquiryId: this.memberData.enquiryId || '',
      enquiryMessage: this.memberData.enquiryMessage || ''
    });

    // Set existing file previews
    if (this.memberData.profilePhoto) {
      this.profilePhotoPreview = this.memberData.profilePhoto;
    }

    if (this.memberData.idProof) {
      this.idProofPreview = this.memberData.idProof;
    }
  }

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
        this.nationalities = Array.isArray(countryRes.data) ? countryRes.data :
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
          this.profilePhotoPreview = e.target?.result || null;
        };
        reader.readAsDataURL(file);
      } else {
        this.selectedIdProofFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.idProofPreview = e.target?.result || null;
        };
        reader.readAsDataURL(file);
      }
    }
  }

  removeFile(type: 'profile' | 'idProof'): void {
    if (type === 'profile') {
      this.selectedProfileFile = null;
      this.profilePhotoPreview = null;
      const fileInput = document.getElementById('profilePhoto') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } else {
      this.selectedIdProofFile = null;
      this.idProofPreview = null;
      const fileInput = document.getElementById('idProof') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  async onSubmit(): Promise<void> {
    try {
      this.submitted = true;

      // Check if form is invalid - this will now only check the 5 required fields
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

      const formData = new FormData();
      const formValues = this.memberForm.getRawValue();

      // Validate plan ID before submission
      const planId = formValues.plan;
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
      formData.append('plan', planId.toString());

      // Add optional fields only if they have values
      if (formValues.alternatePhoneNumber && formValues.alternatePhoneNumber.trim()) {
        formData.append('alternatePhoneNumber', formValues.alternatePhoneNumber.trim());
      }

      if (formValues.dateOfBirth) {
        formData.append('dateOfBirth', new Date(formValues.dateOfBirth).toISOString().split('T')[0]);
      }

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

      // Add files if selected
      if (this.selectedProfileFile) {
        formData.append('profilePhoto', this.selectedProfileFile);
      }

      if (this.selectedIdProofFile) {
        formData.append('idProof', this.selectedIdProofFile);
      }

      const response = await this.memberService.processMember(formData, this.memberId!);

      if (response?.data?.code === 1) {
        await Swal.fire({
          title: 'Success!',
          text: 'Member profile has been updated successfully.',
          icon: 'success',
          confirmButtonText: 'Ok'
        });

        this.router.navigate(['/members']);
      } else {
        const errorMessage = response?.data?.message || 'Failed to update member';
        const errors = response?.data?.errors;

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
      console.error('Update error:', error);
      await this.showError(error instanceof Error ? error.message : 'Failed to update member');
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/members']);
  }

  get f() { return this.memberForm.controls; }

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
