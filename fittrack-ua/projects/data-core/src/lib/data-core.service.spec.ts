import { DataCoreService } from './data-core.service';

describe('DataCoreService', () => {
  let service: DataCoreService;

  beforeEach(() => {
    service = new DataCoreService();
  });

  it('should upsert and read data immutably', () => {
    const input = { session: 1 };
    service.upsert('entry', input);
    const result = service.read('entry');

    expect(result).toEqual({ session: 1 });
    expect(result).not.toBe(input);
  });

  it('should clear values selectively', () => {
    service.upsert('a', 1);
    service.upsert('b', 2);
    service.clear('a');

    expect(service.has('a')).toBeFalse();
    expect(service.has('b')).toBeTrue();

    service.clear();
    expect(service.has('b')).toBeFalse();
  });
});
