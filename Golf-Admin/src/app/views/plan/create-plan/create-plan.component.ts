import { Component, OnInit } from '@angular/core';
import { NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { PlanService } from '../../common-service/plan/plan.service';

@Component({
  selector: 'app-create-plan',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgForOf, RowComponent, ColComponent, TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective, FormLabelDirective, FormControlDirective,
    FormFeedbackComponent, FormSelectDirective, ButtonDirective ],
  templateUrl: './create-plan.component.html',
  styleUrl: './create-plan.component.scss'
})
export class CreatePlanComponent implements OnInit {
  planForm!: FormGroup;
  loading = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private planService: PlanService,
    private router: Router
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.planForm = this.fb.group({
      planName: ['', [Validators.required]],
      planDescription: ['', [Validators.required]],
      planDuration: ['', [Validators.required, Validators.min(1)]],
      planPrice: ['', [Validators.required, Validators.min(0)]],
      features: this.fb.array([])
    });
  }

  async ngOnInit(): Promise<void> {
    // No need to load dropdown data since we're using simple text inputs
  }

  get f() { return this.planForm.controls; }
  
  get featuresArray() {
    return this.planForm.get('features') as FormArray;
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.planForm.invalid) {
      Object.keys(this.planForm.controls).forEach(key => {
        const control = this.planForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    try {
      this.loading = true;
      const formData = {
        ...this.planForm.value,
        planDuration: Number(this.planForm.value.planDuration),
        planPrice: Number(this.planForm.value.planPrice)
      };

      const response = await this.planService.processPlan(formData, '0');

      if (response.data?.code === 1) {
        // Get the created plan ID from the response
        const planId = response.data?.data?.id;
        
        if (planId) {
          // Create features for the plan
          if (this.featuresArray.length > 0) {
            try {
              for (const feature of this.featuresArray.value) {
                await this.planService.createPlanFeature({
                  plan: parseInt(planId),
                  featureName: feature.featureName,
                  isIncluded: feature.isIncluded,
                  order: feature.order || 0
                });
              }
            } catch (error) {
              console.error('Error creating features:', error);
              // Still show success for plan creation, but log feature creation error
            }
          }
        } else {
          console.error('No plan ID received from response');
        }

        await Swal.fire({
          title: 'Success!',
          text: 'Plan has been created successfully',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
        this.router.navigate(['/plan']);
      } else {
        throw new Error(response.data?.message || 'Failed to create plan');
      }
    } catch (error) {
      await this.showError(error instanceof Error ? error.message : 'Failed to create plan');
    } finally {
      this.loading = false;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.planForm.reset();
    this.featuresArray.clear();
    Object.keys(this.planForm.controls).forEach(key => {
      const control = this.planForm.get(key);
      control?.setErrors(null);
    });
  }

  addFeature(): void {
    const featureGroup = this.fb.group({
      featureName: ['', [Validators.required]],
      isIncluded: [true],
      order: [this.featuresArray.length]
    });
    this.featuresArray.push(featureGroup);
  }

  removeFeature(index: number): void {
    this.featuresArray.removeAt(index);
    // Update order for remaining features
    for (let i = 0; i < this.featuresArray.length; i++) {
      this.featuresArray.at(i).patchValue({ order: i });
    }
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire('Error', message, 'error');
  }
}
