import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterTournamentsComponent } from './master-tournaments.component';

describe('MasterTournamentsComponent', () => {
  let component: MasterTournamentsComponent;
  let fixture: ComponentFixture<MasterTournamentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterTournamentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterTournamentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
