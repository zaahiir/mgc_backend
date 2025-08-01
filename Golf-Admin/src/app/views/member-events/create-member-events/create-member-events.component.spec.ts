import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateMemberEventsComponent } from './create-member-events.component';

describe('CreateMemberEventsComponent', () => {
  let component: CreateMemberEventsComponent;
  let fixture: ComponentFixture<CreateMemberEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateMemberEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateMemberEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
