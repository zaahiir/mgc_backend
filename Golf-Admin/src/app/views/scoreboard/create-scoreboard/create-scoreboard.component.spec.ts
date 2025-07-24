import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateScoreboardComponent } from './create-scoreboard.component';

describe('CreateScoreboardComponent', () => {
  let component: CreateScoreboardComponent;
  let fixture: ComponentFixture<CreateScoreboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateScoreboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateScoreboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
