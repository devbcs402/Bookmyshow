import '@testing-library/jest-dom';

// Mock matchMedia for components relying on responsive media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {}
  })
});

// Mock ResizeObserver for Recharts responsive containers
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

