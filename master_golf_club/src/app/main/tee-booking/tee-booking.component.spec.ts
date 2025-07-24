import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeeBookingComponent } from './tee-booking.component';

describe('TeeBookingComponent', () => {
  let component: TeeBookingComponent;
  let fixture: ComponentFixture<TeeBookingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeeBookingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeeBookingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
