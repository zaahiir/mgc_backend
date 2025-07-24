import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTeeComponent } from './create-tee.component';

describe('CreateTeeComponent', () => {
  let component: CreateTeeComponent;
  let fixture: ComponentFixture<CreateTeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTeeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
