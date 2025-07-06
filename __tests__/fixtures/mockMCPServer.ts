import { vi } from "vitest";

export function createMockMCPServer() {
  return {
    tool: vi.fn(),
    setRequestContext: vi.fn(),
    removeRequestContext: vi.fn(),
    resource: vi.fn(),
    prompt: vi.fn(),
    completion: vi.fn(),
    roots: vi.fn(),
  };
}
