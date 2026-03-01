import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock('next-auth');
vi.mock('@/lib/database', () => ({
  prisma: {
    instance: {
      findMany: mockFindMany,
    },
  },
}));
vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { mockSession, mockInstance } from '@/__tests__/helpers/mock-data';
import { GET } from './route';

describe('GET /api/instances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns instances for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const userInstances = [
      { ...mockInstance, id: 'inst-1', name: 'Instance 1' },
      { ...mockInstance, id: 'inst-2', name: 'Instance 2' },
    ];

    mockFindMany.mockResolvedValue(userInstances);

    const request = new NextRequest('http://localhost:3000/api/instances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.instances).toHaveLength(2);
    expect(data.instances[0].id).toBe('inst-1');
    expect(data.instances[1].id).toBe('inst-2');

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { userId: mockSession.user.id },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns empty array when user has no instances', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/instances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.instances).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/instances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch instances');
  });
});
