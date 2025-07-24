import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateConceptComponent } from './create-concept.component';

describe('CreateConceptComponent', () => {
  let component: CreateConceptComponent;
  let fixture: ComponentFixture<CreateConceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateConceptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateConceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
