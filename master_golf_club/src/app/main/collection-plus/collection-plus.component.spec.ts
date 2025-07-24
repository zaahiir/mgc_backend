import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionPlusComponent } from './collection-plus.component';

describe('CollectionPlusComponent', () => {
  let component: CollectionPlusComponent;
  let fixture: ComponentFixture<CollectionPlusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionPlusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionPlusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
