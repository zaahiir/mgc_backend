import { TestBed } from '@angular/core/testing';

import { MemberTeamService } from './member-team.service';

describe('MemberTeamService', () => {
  let service: MemberTeamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MemberTeamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
