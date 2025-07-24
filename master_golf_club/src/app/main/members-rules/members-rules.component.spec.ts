import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersRulesComponent } from './members-rules.component';

describe('MembersRulesComponent', () => {
  let component: MembersRulesComponent;
  let fixture: ComponentFixture<MembersRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersRulesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembersRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
