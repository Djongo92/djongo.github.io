import "@testing-library/jest-dom";

// Tests that opt into the node environment (live server-to-server smoke
// checks blocked by happy-dom's browser-CORS fetch emulation) have no
// window — only patch matchMedia when a DOM exists.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
  });
}
