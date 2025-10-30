import { SyncEngine } from './sync-engine.service';

describe('SyncEngine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    engine = new SyncEngine();
  });

  it('should enqueue new jobs', () => {
    engine.schedule({ id: '1', payload: {} });
    expect(engine.peek().length).toBe(1);
  });

  it('should replace existing jobs with same id', () => {
    engine.schedule({ id: '1', payload: { foo: 'bar' } });
    engine.schedule({ id: '1', payload: { foo: 'baz' } });

    expect(engine.peek().length).toBe(1);
    expect(engine.peek()[0].payload).toEqual({ foo: 'baz' });
  });

  it('should drain queue and return jobs', () => {
    engine.schedule({ id: '1', payload: {} });
    engine.schedule({ id: '2', payload: {} });

    const jobs = engine.drain();
    expect(jobs.length).toBe(2);
    expect(engine.peek().length).toBe(0);
  });
});
