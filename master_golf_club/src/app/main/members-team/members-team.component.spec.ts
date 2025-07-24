import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersTeamComponent } from './members-team.component';

describe('MembersTeamComponent', () => {
  let component: MembersTeamComponent;
  let fixture: ComponentFixture<MembersTeamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersTeamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembersTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
