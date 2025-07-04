import { vi } from "vitest";

// Define mocks before any imports
const mockRedisClient = {
  isReady: true,
  isOpen: true,
  connect: vi.fn().mockResolvedValue(undefined),
  hSet: vi.fn().mockResolvedValue(undefined),
  hGetAll: vi.fn().mockResolvedValue({}),
  del: vi.fn().mockResolvedValue(undefined),
  expire: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  mGet: vi.fn().mockResolvedValue([]),
  keys: vi.fn().mockResolvedValue([]),
  quit: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
};

// Mock redis module first
vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

// Mock our redis wrapper
vi.mock("@/lib/redis", () => ({
  redis: mockRedisClient,
  ensureConnected: vi.fn().mockResolvedValue(undefined),
  default: mockRedisClient,
}));

const mockPineconeIndex = {
  query: vi.fn().mockResolvedValue({ matches: [] }),
  upsert: vi.fn().mockResolvedValue({}),
};

const mockPineconeClient = {
  index: vi.fn(() => mockPineconeIndex),
};

const mockOpenAIResponse = {
  data: [{ embedding: new Array(1536).fill(0.1) }]
};

vi.mock("@pinecone-database/pinecone", () => ({
  Pinecone: vi.fn(() => mockPineconeClient),
}));

const createFetchResponse = (data: any) => {
  const response = {
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    clone: function() {
      return createFetchResponse(data);
    },
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers(),
    bodyUsed: false,
  };
  return response;
};

global.fetch = vi.fn().mockImplementation((url: string) => {
  // Handle Pinecone API calls
  if (url.includes("pinecone")) {
    return Promise.resolve(createFetchResponse({ 
      indexes: [{ name: "test-index", dimension: 1536 }] 
    }));
  }
  // Default to OpenAI embeddings response
  return Promise.resolve(createFetchResponse(mockOpenAIResponse));
});

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ userId: "test_user", platform: "splint_invest" }),
    TokenExpiredError: class extends Error { constructor(message: string, _expiredAt: Date) { super(message); } },
    JsonWebTokenError: class extends Error { constructor(message: string) { super(message); } }
  },
  sign: vi.fn().mockReturnValue("mock.jwt.token"),
  verify: vi.fn().mockReturnValue({ userId: "test_user", platform: "splint_invest" }),
  TokenExpiredError: class extends Error { constructor(message: string, _expiredAt: Date) { super(message); } },
  JsonWebTokenError: class extends Error { constructor(message: string) { super(message); } }
}));

// Set environment variables before any imports
process.env.JWT_SECRET = "test_secret";
process.env.PINECONE_API_KEY = "test_pinecone_key";
process.env.PINECONE_INDEX_NAME = "test-index";
process.env.OPENAI_API_KEY = "test_openai_key";
process.env.REDIS_URL = "redis://localhost:6379";

export { mockRedisClient, mockPineconeClient, mockPineconeIndex };
