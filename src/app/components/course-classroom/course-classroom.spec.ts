import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseClassroom } from './course-classroom';

describe('CourseClassroom.component', () => {
  let component: CourseClassroom;
  let fixture: ComponentFixture<CourseClassroom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseClassroom]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseClassroom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
