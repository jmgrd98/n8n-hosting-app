import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock functions – available before vi.mock factory functions execute
// ---------------------------------------------------------------------------
const mockGetServerSession = vi.hoisted(() => vi.fn());
const mockInstanceFindFirst = vi.hoisted(() => vi.fn());
const mockApiKeyFindMany = vi.hoisted(() => vi.fn());
const mockApiKeyCreate = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/database', () => ({
  prisma: {
    instance: {
      findFirst: mockInstanceFindFirst,
    },
    apiKey: {
      findMany: mockApiKeyFindMany,
      create: mockApiKeyCreate,
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports under test (must come after vi.mock)
// ---------------------------------------------------------------------------
import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  },
  expires: '2099-01-01T00:00:00.000Z',
};

const mockApiKeys = [
  { id: 'key-1', name: 'Production Key', key: 'n8n_api_prod123', instanceId: 'inst-1', createdAt: '2024-06-01T00:00:00.000Z' },
  { id: 'key-2', name: 'Staging Key', key: 'n8n_api_stag456', instanceId: 'inst-1', createdAt: '2024-05-01T00:00:00.000Z' },
];

// ---------------------------------------------------------------------------
// GET /api/instances/[id]/api-keys
// ---------------------------------------------------------------------------
describe('GET /api/instances/[id]/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys');
    const response = await GET(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when instance not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockInstanceFindFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-missing/api-keys');
    const response = await GET(request, createParams('inst-missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
    expect(mockInstanceFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'inst-missing',
        userId: 'user-1',
      },
    });
  });

  it('returns api keys for a valid instance', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockInstanceFindFirst.mockResolvedValue({ id: 'inst-1', userId: 'user-1' });
    mockApiKeyFindMany.mockResolvedValue(mockApiKeys);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys');
    const response = await GET(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apiKeys).toEqual(mockApiKeys);
    expect(mockApiKeyFindMany).toHaveBeenCalledWith({
      where: { instanceId: 'inst-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

// ---------------------------------------------------------------------------
// POST /api/instances/[id]/api-keys
// ---------------------------------------------------------------------------
describe('POST /api/instances/[id]/api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key', apiKey: 'n8n_api_test123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys', {
      method: 'POST',
      body: JSON.stringify({ apiKey: 'n8n_api_test123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('returns 400 when apiKey is missing', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('returns 404 when instance not found', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockInstanceFindFirst.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-missing/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key', apiKey: 'n8n_api_test123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request, createParams('inst-missing'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found or access denied');
    expect(mockInstanceFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'inst-missing',
        userId: 'user-1',
      },
    });
  });

  it('creates api key and returns success', async () => {
    mockGetServerSession.mockResolvedValue(mockSession);
    mockInstanceFindFirst.mockResolvedValue({ id: 'inst-1', userId: 'user-1' });

    const createdKey = {
      id: 'key-new',
      name: 'My Key',
      key: 'n8n_api_test123',
      instanceId: 'inst-1',
      createdAt: '2024-07-01T00:00:00.000Z',
    };
    mockApiKeyCreate.mockResolvedValue(createdKey);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-1/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key', apiKey: 'n8n_api_test123' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request, createParams('inst-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.apiKey).toEqual(createdKey);
    expect(mockApiKeyCreate).toHaveBeenCalledWith({
      data: {
        instanceId: 'inst-1',
        name: 'My Key',
        key: 'n8n_api_test123',
      },
    });
  });
});
