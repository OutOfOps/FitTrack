import { CryptoToolkit } from './crypto-toolkit.service';

describe('CryptoToolkit', () => {
  let toolkit: CryptoToolkit;

  beforeEach(() => {
    toolkit = new CryptoToolkit();
  });

  it('should generate non-empty nonce with default size', () => {
    const nonce = toolkit.generateNonce();
    expect(nonce.length).toBe(32);
  });

  it('should produce deterministic digest for the same input', async () => {
    const first = await toolkit.digest('fittrack');
    const second = await toolkit.digest('fittrack');
    expect(first).toEqual(second);
  });
});
