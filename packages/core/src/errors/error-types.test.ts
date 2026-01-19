import { describe, it, expect } from 'vitest';

import {
  QueryScapeError,
  ConnectorError,
  AuthError,
  RateLimitError,
  QueryNotSupportedError,
  SessionLimitError,
  ValidationError,
  AcceleratorError,
} from './error-types';

describe('Error Types', () => {
  describe('QueryScapeError', () => {
    it('should create error with message and code', () => {
      const error = new QueryScapeError('Test error', 'TEST_CODE');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('QueryScapeError');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const error = new QueryScapeError('Test', 'CODE');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include context', () => {
      const error = new QueryScapeError('Test', 'CODE', { key: 'value' });
      expect(error.context).toEqual({ key: 'value' });
    });

    it('should serialize to JSON', () => {
      const error = new QueryScapeError('Test', 'CODE', { data: 123 });
      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'QueryScapeError',
        message: 'Test',
        code: 'CODE',
        context: { data: 123 },
      });
      expect(json.timestamp).toBeDefined();
    });

    it('should be instance of Error', () => {
      const error = new QueryScapeError('Test', 'CODE');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ConnectorError', () => {
    it('should include connector type', () => {
      const error = new ConnectorError('Connection failed', 'neo4j');

      expect(error.connectorType).toBe('neo4j');
      expect(error.code).toBe('CONNECTOR_ERROR');
      expect(error.name).toBe('ConnectorError');
    });

    it('should include connector type in context', () => {
      const error = new ConnectorError('Failed', 'neptune', { extra: 'data' });

      expect(error.context).toMatchObject({
        connectorType: 'neptune',
        extra: 'data',
      });
    });
  });

  describe('AuthError', () => {
    it('should create auth error', () => {
      const error = new AuthError('Invalid credentials');

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.name).toBe('AuthError');
    });
  });

  describe('RateLimitError', () => {
    it('should include retry after', () => {
      const error = new RateLimitError('Too many requests', 5000);

      expect(error.retryAfterMs).toBe(5000);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should work without retry after', () => {
      const error = new RateLimitError('Too many requests');
      expect(error.retryAfterMs).toBeUndefined();
    });
  });

  describe('QueryNotSupportedError', () => {
    it('should include query type and connector', () => {
      const error = new QueryNotSupportedError('path', 'mock');

      expect(error.queryType).toBe('path');
      expect(error.code).toBe('QUERY_NOT_SUPPORTED');
      expect(error.message).toContain('path');
      expect(error.message).toContain('mock');
    });
  });

  describe('SessionLimitError', () => {
    it('should include limit details', () => {
      const error = new SessionLimitError('maxNodes', 1000, 1500);

      expect(error.limitType).toBe('maxNodes');
      expect(error.limit).toBe(1000);
      expect(error.attempted).toBe(1500);
      expect(error.code).toBe('SESSION_LIMIT_ERROR');
      expect(error.message).toContain('1000');
      expect(error.message).toContain('1500');
    });
  });

  describe('ValidationError', () => {
    it('should include field name', () => {
      const error = new ValidationError('Invalid email format', 'email');

      expect(error.field).toBe('email');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AcceleratorError', () => {
    it('should include operation name', () => {
      const error = new AcceleratorError('Timeout', 'randomWalk');

      expect(error.operation).toBe('randomWalk');
      expect(error.code).toBe('ACCELERATOR_ERROR');
    });
  });

  describe('Error hierarchy', () => {
    it('all errors should extend QueryScapeError', () => {
      expect(new ConnectorError('', '')).toBeInstanceOf(QueryScapeError);
      expect(new AuthError('')).toBeInstanceOf(QueryScapeError);
      expect(new RateLimitError('')).toBeInstanceOf(QueryScapeError);
      expect(new QueryNotSupportedError('', '')).toBeInstanceOf(QueryScapeError);
      expect(new SessionLimitError('', 0, 0)).toBeInstanceOf(QueryScapeError);
      expect(new ValidationError('', '')).toBeInstanceOf(QueryScapeError);
      expect(new AcceleratorError('', '')).toBeInstanceOf(QueryScapeError);
    });

    it('all errors should be catchable as Error', () => {
      const errors = [
        new ConnectorError('', ''),
        new AuthError(''),
        new RateLimitError(''),
        new QueryNotSupportedError('', ''),
        new SessionLimitError('', 0, 0),
        new ValidationError('', ''),
        new AcceleratorError('', ''),
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
      });
    });
  });
});
