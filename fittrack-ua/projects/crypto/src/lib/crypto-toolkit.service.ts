import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoToolkit {
  async digest(message: string, algorithm: AlgorithmIdentifier = 'SHA-256'): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest(algorithm, encoder.encode(message));
    const bytes = Array.from(new Uint8Array(buffer));
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  generateNonce(size = 16): string {
    const array = new Uint8Array(size);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
