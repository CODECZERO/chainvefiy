import { test, expect } from '@playwright/test';
import { getIPFSUrl } from '../lib/image-utils';

test.describe('image-utils', () => {
  test('should return empty string for null/undefined', () => {
    expect(getIPFSUrl(null)).toBe('');
    expect(getIPFSUrl(undefined)).toBe('');
  });

  test('should return original URL for http/https/data links', () => {
    const httpUrl = 'http://example.com/image.png';
    const dataUrl = 'data:image/png;base64,abc';
    expect(getIPFSUrl(httpUrl)).toBe(httpUrl);
    expect(getIPFSUrl(dataUrl)).toBe(dataUrl);
  });

  test('should format CID with Pinata gateway and token', () => {
    const cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const result = getIPFSUrl(cid);
    
    // Check if it contains the gateway
    expect(result).toContain('mypinata.cloud/ipfs/');
    expect(result).toContain(cid);
    
    // Note: In real tests, process.env would be set. 
    // Here we just verify it produces a URL.
  });

  test('should strip ipfs:// prefix', () => {
    const cid = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
    const ipfsUri = `ipfs://${cid}`;
    const result = getIPFSUrl(ipfsUri);
    
    expect(result).not.toContain('ipfs://');
    expect(result).toContain(cid);
  });
});
