import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import { PlanService } from '../../common-service/plan/plan.service';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-update-plan',
  standalone: true,
  imports: [
    NgIf, CommonModule, NgForOf, RowComponent, ColComponent,
    TextColorDirective, CardComponent, FormFloatingDirective, CardHeaderComponent,
    CardBodyComponent, ReactiveFormsModule, FormsModule, FormDirective,
    FormLabelDirective, FormControlDirective, FormFeedbackComponent,
    FormSelectDirective, ButtonDirective
  ],
  templateUrl: './update-plan.component.html',
  styleUrl: './update-plan.component.scss'
})
export class UpdatePlanComponent implements OnInit {
  customStylesValidated = false;
  planForm!: FormGroup;
  loading = false;
  submitted = false;
  planId: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private planService: PlanService
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
    try {
      this.route.params.subscribe(params => {
        this.planId = params['id'];
        this.loadPlanData(this.planId);
      });
    } catch (error) {
      console.error('Error during initialization:', error);
      await this.showError('An error occurred during initialization.');
    }
  }

  get f() { return this.planForm.controls; }
  
  get featuresArray() {
    return this.planForm.get('features') as FormArray;
  }

  async loadPlanData(planId: string): Promise<void> {
    try {
      const response = await this.planService.listPlan(planId);
      if (response.data.code === 1 && response.data.data.length > 0) {
        const planData = response.data.data[0];

        this.planForm.patchValue({
          planName: planData.planName,
          planDescription: planData.planDescription,
          planDuration: planData.planDuration,
          planPrice: planData.planPrice
        });

        // Load plan features
        await this.loadPlanFeatures(planId);
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
      await this.showError('Failed to load plan data.');
    }
  }

  async loadPlanFeatures(planId: string): Promise<void> {
    try {
      const response = await this.planService.getPlanFeatures(planId);
      if (response.data.code === 1) {
        this.featuresArray.clear();
        response.data.data.forEach((feature: any) => {
          const featureGroup = this.fb.group({
            id: [feature.id],
            featureName: [feature.featureName, [Validators.required]],
            isIncluded: [feature.isIncluded],
            order: [feature.order || 0]
          });
          this.featuresArray.push(featureGroup);
        });
      }
    } catch (error) {
      console.error('Error loading plan features:', error);
    }
  }

  async onSubmit(): Promise<void> {
    this.customStylesValidated = true;
    this.submitted = true;

    if (this.planForm.invalid) {
      Object.values(this.planForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.loading = true;

    try {
      const formData = {
        ...this.planForm.value,
        planDuration: Number(this.planForm.value.planDuration),
        planPrice: Number(this.planForm.value.planPrice)
      };
      const response = await this.planService.processPlan(formData, this.planId);

      if (response.data.code === 1) {
        // Update plan features
        await this.updatePlanFeatures();
        
        await Swal.fire("Updated!", response.data.message, "success");
        this.router.navigate(['/plan']);
      } else {
        await this.showError(response.data.message);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
      await this.showError("An error occurred while updating the plan.");
    } finally {
      this.loading = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/plan']);
  }

  async updatePlanFeatures(): Promise<void> {
    try {
      for (const feature of this.featuresArray.value) {
        if (feature.id) {
          // Update existing feature
          await this.planService.updatePlanFeature(feature.id, {
            plan: parseInt(this.planId),
            featureName: feature.featureName,
            isIncluded: feature.isIncluded,
            order: feature.order || 0
          });
        } else {
          // Create new feature
          await this.planService.createPlanFeature({
            plan: parseInt(this.planId),
            featureName: feature.featureName,
            isIncluded: feature.isIncluded,
            order: feature.order || 0
          });
        }
      }
    } catch (error) {
      console.error('Error updating plan features:', error);
      throw error;
    }
  }

  addFeature(): void {
    const featureGroup = this.fb.group({
      id: [null],
      featureName: ['', [Validators.required]],
      isIncluded: [true],
      order: [this.featuresArray.length]
    });
    this.featuresArray.push(featureGroup);
  }

  removeFeature(index: number): void {
    const feature = this.featuresArray.at(index).value;
    if (feature.id) {
      // Delete existing feature from backend
      this.planService.deletePlanFeature(feature.id).catch(console.error);
    }
    this.featuresArray.removeAt(index);
    // Update order for remaining features
    for (let i = 0; i < this.featuresArray.length; i++) {
      this.featuresArray.at(i).patchValue({ order: i });
    }
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire("Failed!", message, "error");
  }
}
