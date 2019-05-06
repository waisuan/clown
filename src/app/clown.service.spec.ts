import { TestBed } from '@angular/core/testing';

import { ClownService } from './clown.service';

describe('ClownService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ClownService = TestBed.get(ClownService);
    expect(service).toBeTruthy();
  });
});
