import { TestBed } from '@angular/core/testing';

import { MemberMessageService } from './member-message.service';

describe('MemberMessageService', () => {
  let service: MemberMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemberMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
