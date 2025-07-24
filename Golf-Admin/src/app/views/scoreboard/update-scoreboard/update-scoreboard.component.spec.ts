import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateScoreboardComponent } from './update-scoreboard.component';

describe('UpdateScoreboardComponent', () => {
  let component: UpdateScoreboardComponent;
  let fixture: ComponentFixture<UpdateScoreboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateScoreboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateScoreboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
