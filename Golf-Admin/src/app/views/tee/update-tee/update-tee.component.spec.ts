import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateTeeComponent } from './update-tee.component';

describe('UpdateTeeComponent', () => {
  let component: UpdateTeeComponent;
  let fixture: ComponentFixture<UpdateTeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateTeeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateTeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
