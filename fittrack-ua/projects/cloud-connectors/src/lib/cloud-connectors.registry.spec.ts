import { CloudConnectorsRegistry } from './cloud-connectors.registry';

describe('CloudConnectorsRegistry', () => {
  let registry: CloudConnectorsRegistry;

  beforeEach(() => {
    registry = new CloudConnectorsRegistry();
  });

  it('should register and list connectors', () => {
    const connector = {
      id: 'mock',
      displayName: 'Mock Connector',
      connect: async () => true
    };
    registry.register(connector);
    expect(registry.list()).toEqual([connector]);
  });

  it('should connect through registered connector', async () => {
    let executed = false;
    registry.register({
      id: 'mock',
      displayName: 'Mock Connector',
      connect: async () => {
        executed = true;
        return true;
      }
    });

    const result = await registry.connect('mock');
    expect(result).toBeTrue();
    expect(executed).toBeTrue();
  });

  it('should return false for missing connector', async () => {
    const result = await registry.connect('missing');
    expect(result).toBeFalse();
  });
});
