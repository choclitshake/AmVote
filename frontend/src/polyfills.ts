import { Buffer } from 'buffer';

console.log('[Polyfills] Script execution started, defining global Buffer.');

if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).Buffer = Buffer;
  (window as any).process = {
    env: {},
    version: '',
    browser: true,
  };
}
