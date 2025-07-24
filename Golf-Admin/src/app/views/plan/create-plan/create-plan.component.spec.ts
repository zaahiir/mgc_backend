import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreatePlanComponent } from './create-plan.component';

describe('CreatePlanComponent', () => {
  let component: CreatePlanComponent;
  let fixture: ComponentFixture<CreatePlanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreatePlanComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreatePlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
