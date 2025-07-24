import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListAmenitiesComponent } from './list-amenities.component';

describe('ListAmenitiesComponent', () => {
  let component: ListAmenitiesComponent;
  let fixture: ComponentFixture<ListAmenitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListAmenitiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListAmenitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
