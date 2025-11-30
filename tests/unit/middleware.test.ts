import { describe, expect, it } from 'bun:test';

describe('Logging Middleware', () => {
  it('imports correctly', async () => {
    const { 'default': loggingMiddleware } = await import('../../src/middleware/logging');

    expect(loggingMiddleware).toBeDefined();
    expect(typeof loggingMiddleware).toBe('function');
  });

  it('accepts request and server params', async () => {
    const { 'default': loggingMiddleware } = await import('../../src/middleware/logging');

    const mockRequest = new Request('http://localhost/test') as any;
    const mockServer = {} as any;

    expect(() => {
      loggingMiddleware(mockRequest, mockServer);
    }).not.toThrow();
  });
});
