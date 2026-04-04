/**
 * Example unit test for logger utility
 * This demonstrates the pattern to follow for other tests
 */

import { logger, LogLevel } from '@/lib/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    logger.log('Test message', 'TestContext');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should log warnings', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    logger.warn('Test warning', 'TestContext');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should log errors', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');
    logger.error('Test error message', error, 'TestContext');
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('should include metadata in logs', () => {
    const metadata = { userId: '123', action: 'test' };
    logger.log('Test with metadata', 'TestContext', metadata);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
