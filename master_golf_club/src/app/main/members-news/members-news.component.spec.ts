import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersNewsComponent } from './members-news.component';

describe('MembersNewsComponent', () => {
  let component: MembersNewsComponent;
  let fixture: ComponentFixture<MembersNewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersNewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembersNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
