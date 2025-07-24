import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateMembersComponent } from './update-members.component';

describe('UpdateMembersComponent', () => {
  let component: UpdateMembersComponent;
  let fixture: ComponentFixture<UpdateMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateMembersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateMembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
