import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth');
vi.mock('@/lib/database');
vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getInstanceById, deleteInstance } from '@/lib/database';
import { mockSession, mockInstance } from '@/__tests__/helpers/mock-data';
import { GET, DELETE } from './route';

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/instances/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123');
    const response = await GET(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when instance not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/nonexistent');
    const response = await GET(request, createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
  });

  it('returns 404 when instance belongs to different user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockInstance,
      userId: 'different-user-id',
      user: null,
    } as Awaited<ReturnType<typeof getInstanceById>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123');
    const response = await GET(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
  });

  it('returns instance for authorized owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockInstance,
      userId: mockSession.user.id,
      user: { id: mockSession.user.id, email: mockSession.user.email, name: mockSession.user.name },
    } as Awaited<ReturnType<typeof getInstanceById>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123');
    const response = await GET(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.instance.id).toBe('inst-abc123');
    expect(data.instance.userId).toBe(mockSession.user.id);
    expect(getInstanceById).toHaveBeenCalledWith('inst-abc123');
  });
});

describe('DELETE /api/instances/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when instance not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/nonexistent', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
  });

  it('returns 404 when instance belongs to different user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockInstance,
      userId: 'different-user-id',
      user: null,
    } as Awaited<ReturnType<typeof getInstanceById>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
  });

  it('deletes and returns success for authorized owner', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockInstance,
      userId: mockSession.user.id,
      user: { id: mockSession.user.id, email: mockSession.user.email, name: mockSession.user.name },
    } as Awaited<ReturnType<typeof getInstanceById>>);
    vi.mocked(deleteInstance).mockResolvedValue(mockInstance as Awaited<ReturnType<typeof deleteInstance>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(deleteInstance).toHaveBeenCalledWith('inst-abc123');
  });
});
