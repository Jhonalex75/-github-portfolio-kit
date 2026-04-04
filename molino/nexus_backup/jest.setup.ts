import '@testing-library/jest-dom';

/**
 * Jest setup file
 * Runs before all tests
 */

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock firebase
jest.mock('@/firebase/config', () => ({
  firebaseConfig: {
    projectId: 'test-project',
    apiKey: 'test-key',
    authDomain: 'test.firebaseapp.com',
  },
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('configureStore got an unexpected'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
