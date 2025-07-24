import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateAmenitiesComponent } from './update-amenities.component';

describe('UpdateAmenitiesComponent', () => {
  let component: UpdateAmenitiesComponent;
  let fixture: ComponentFixture<UpdateAmenitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateAmenitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateAmenitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
