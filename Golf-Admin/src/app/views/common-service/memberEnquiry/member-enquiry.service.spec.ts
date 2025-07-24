import { TestBed } from '@angular/core/testing';

import { MemberEnquiryService } from './member-enquiry.service';

describe('MemberEnquiryService', () => {
  let service: MemberEnquiryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemberEnquiryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
