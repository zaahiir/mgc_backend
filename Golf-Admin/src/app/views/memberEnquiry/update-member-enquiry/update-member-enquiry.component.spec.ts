import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateMemberEnquiryComponent } from './update-member-enquiry.component';

describe('UpdateMemberEnquiryComponent', () => {
  let component: UpdateMemberEnquiryComponent;
  let fixture: ComponentFixture<UpdateMemberEnquiryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateMemberEnquiryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateMemberEnquiryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
