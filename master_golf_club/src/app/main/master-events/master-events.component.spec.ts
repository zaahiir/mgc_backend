import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterEventsComponent } from './master-events.component';

describe('MasterEventsComponent', () => {
  let component: MasterEventsComponent;
  let fixture: ComponentFixture<MasterEventsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterEventsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterEventsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
