import { Component, OnInit } from '@angular/core';
import { NgStyle, NgClass, NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import { PlanService } from '../../common-service/plan/plan.service';
import Swal from 'sweetalert2';
import { Router, ActivatedRoute } from '@angular/router';

interface PlanType {
  id: number;
  planTypeName: string;
}

interface PlanDuration {
  id: number;
  planDurationName: string;
}

interface PlanCycle {
  id: number;
  planCycleName: string;
}

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

  planTypes: PlanType[] = [];
  planDurations: PlanDuration[] = [];
  planCycles: PlanCycle[] = [];
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
      planType: ['', [Validators.required]],
      planDuration: ['', [Validators.required]],
      planPrice: ['', [Validators.required, Validators.min(0)]],
      planCycle: ['', [Validators.required]]
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await Promise.all([
        this.loadPlanTypes(),
        this.loadPlanDurations(),
        this.loadPlanCycles()
      ]);

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

  async loadPlanTypes(): Promise<void> {
    try {
      const response = await this.planService.getPlanTypes();
      this.planTypes = response.data;
    } catch (error) {
      console.error('Error loading plan types:', error);
      throw error;
    }
  }

  async loadPlanDurations(): Promise<void> {
    try {
      const response = await this.planService.getPlanDurations();
      this.planDurations = response.data;
    } catch (error) {
      console.error('Error loading plan durations:', error);
      throw error;
    }
  }

  async loadPlanCycles(): Promise<void> {
    try {
      const response = await this.planService.getPlanCycles();
      this.planCycles = response.data;
    } catch (error) {
      console.error('Error loading plan cycles:', error);
      throw error;
    }
  }

  async loadPlanData(planId: string): Promise<void> {
    try {
      const response = await this.planService.listPlan(planId);
      if (response.data.code === 1 && response.data.data.length > 0) {
        const planData = response.data.data[0];

        // Find the matching IDs from the respective arrays
        const planType = this.planTypes.find(type => type.planTypeName === planData.planType)?.id;
        const planDuration = this.planDurations.find(duration => duration.planDurationName === planData.planDuration)?.id;
        const planCycle = this.planCycles.find(cycle => cycle.planCycleName === planData.planCycle)?.id;

        this.planForm.patchValue({
          planName: planData.planName,
          planDescription: planData.planDescription,
          planType: planType,
          planDuration: planDuration,
          planPrice: planData.planPrice,
          planCycle: planCycle
        });
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
      await this.showError('Failed to load plan data.');
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
      const formData = this.planForm.value;
      const response = await this.planService.processPlan(formData, this.planId);

      if (response.data.code === 1) {
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

  private async showError(message: string): Promise<void> {
    await Swal.fire("Failed!", message, "error");
  }
}
