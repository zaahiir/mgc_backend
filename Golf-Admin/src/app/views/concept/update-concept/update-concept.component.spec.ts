import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateConceptComponent } from './update-concept.component';

describe('UpdateConceptComponent', () => {
  let component: UpdateConceptComponent;
  let fixture: ComponentFixture<UpdateConceptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateConceptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateConceptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
