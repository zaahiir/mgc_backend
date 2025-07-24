import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTournamentComponent } from './list-tournament.component';

describe('ListTournamentComponent', () => {
  let component: ListTournamentComponent;
  let fixture: ComponentFixture<ListTournamentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListTournamentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListTournamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
