import { Component, OnInit } from '@angular/core';
import { NgForOf, NgIf, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RowComponent, ColComponent, TextColorDirective, CardComponent, CardHeaderComponent, CardBodyComponent, FormFloatingDirective, FormDirective, FormLabelDirective, FormControlDirective, FormFeedbackComponent, InputGroupComponent, InputGroupTextDirective, FormSelectDirective, ButtonDirective } from '@coreui/angular';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { PlanService } from '../../common-service/plan/plan.service';

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

  planTypes: PlanType[] = [];
  planDurations: PlanDuration[] = [];
  planCycles: PlanCycle[] = [];

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
      planType: ['', [Validators.required]],
      planDuration: ['', [Validators.required]],
      planPrice: ['', [Validators.required, Validators.min(0)]],
      planCycle: ['', [Validators.required]]
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.loadDropdownData();
    } catch (error) {
      await this.showError('Failed to load form data');
    }
  }

  get f() { return this.planForm.controls; }

  private async loadDropdownData(): Promise<void> {
    try {
      const [typesRes, durationsRes, cyclesRes] = await Promise.all([
        this.planService.getPlanTypes(),
        this.planService.getPlanDurations(),
        this.planService.getPlanCycles()
      ]);

      if (typesRes?.data) {
        this.planTypes = Array.isArray(typesRes.data) ? typesRes.data :
                        typesRes.data.data ? typesRes.data.data :
                        [];
      }

      if (durationsRes?.data) {
        this.planDurations = Array.isArray(durationsRes.data) ? durationsRes.data :
                            durationsRes.data.data ? durationsRes.data.data :
                            [];
      }

      if (cyclesRes?.data) {
        this.planCycles = Array.isArray(cyclesRes.data) ? cyclesRes.data :
                         cyclesRes.data.data ? cyclesRes.data.data :
                         [];
      }
    } catch (error) {
      throw error;
    }
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
        planType: Number(this.planForm.value.planType),
        planDuration: Number(this.planForm.value.planDuration),
        planCycle: Number(this.planForm.value.planCycle),
        planPrice: Number(this.planForm.value.planPrice)
      };

      const response = await this.planService.processPlan(formData, '0');

      if (response.data?.code === 1) {
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
    Object.keys(this.planForm.controls).forEach(key => {
      const control = this.planForm.get(key);
      control?.setErrors(null);
    });
  }

  private async showError(message: string): Promise<void> {
    await Swal.fire('Error', message, 'error');
  }
}
