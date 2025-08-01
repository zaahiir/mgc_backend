import { TestBed } from '@angular/core/testing';

import { MemberEventsService } from './member-events.service';

describe('MemberEventsService', () => {
  let service: MemberEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemberEventsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
