import { describe, it, expect } from 'vitest';
import { ApiError } from './apiClient';

describe('ApiError', () => {
  it('captures status, code and body', () => {
    const err = new ApiError('boom', 422, 'validation', { field: 'email' });
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.code).toBe('validation');
    expect(err.body).toEqual({ field: 'email' });
  });

  it('marks 5xx, 429, 408 and network (0) as retryable', () => {
    expect(new ApiError('x', 500).isRetryable).toBe(true);
    expect(new ApiError('x', 503).isRetryable).toBe(true);
    expect(new ApiError('x', 429).isRetryable).toBe(true);
    expect(new ApiError('x', 408).isRetryable).toBe(true);
    expect(new ApiError('x', 0).isRetryable).toBe(true);
  });

  it('marks 4xx (except 408/429) as non-retryable', () => {
    expect(new ApiError('x', 400).isRetryable).toBe(false);
    expect(new ApiError('x', 401).isRetryable).toBe(false);
    expect(new ApiError('x', 404).isRetryable).toBe(false);
  });
});
