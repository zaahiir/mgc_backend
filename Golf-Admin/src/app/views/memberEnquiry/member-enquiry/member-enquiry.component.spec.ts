import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MemberEnquiryComponent } from './member-enquiry.component';

describe('MemberEnquiryComponent', () => {
  let component: MemberEnquiryComponent;
  let fixture: ComponentFixture<MemberEnquiryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemberEnquiryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MemberEnquiryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
