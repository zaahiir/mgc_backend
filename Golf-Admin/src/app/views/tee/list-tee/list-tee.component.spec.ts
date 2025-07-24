import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListTeeComponent } from './list-tee.component';

describe('ListTeeComponent', () => {
  let component: ListTeeComponent;
  let fixture: ComponentFixture<ListTeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListTeeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListTeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
