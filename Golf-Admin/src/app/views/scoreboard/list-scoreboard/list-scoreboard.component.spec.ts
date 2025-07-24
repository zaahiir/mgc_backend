import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListScoreboardComponent } from './list-scoreboard.component';

describe('ListScoreboardComponent', () => {
  let component: ListScoreboardComponent;
  let fixture: ComponentFixture<ListScoreboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListScoreboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListScoreboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
