import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth');
vi.mock('@/lib/database');
vi.mock('@/lib/auth/auth-options', () => ({
  authOptions: {},
}));

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getInstanceById, updateInstanceStatus } from '@/lib/database';
import { mockSession, mockInstance, mockStoppedInstance } from '@/__tests__/helpers/mock-data';
import { POST } from './route';

const createParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe('POST /api/instances/[id]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 without session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123/start', {
      method: 'POST',
    });
    const response = await POST(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when instance not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/instances/nonexistent/start', {
      method: 'POST',
    });
    const response = await POST(request, createParams('nonexistent'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Instance not found');
  });

  it('returns 403 when instance belongs to different user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockStoppedInstance,
      userId: 'different-user-id',
      user: null,
    } as Awaited<ReturnType<typeof getInstanceById>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-stopped/start', {
      method: 'POST',
    });
    const response = await POST(request, createParams('inst-stopped'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 400 when instance is not STOPPED', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockInstance,
      status: 'RUNNING',
      userId: mockSession.user.id,
      user: { id: mockSession.user.id, email: mockSession.user.email, name: mockSession.user.name },
    } as Awaited<ReturnType<typeof getInstanceById>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-abc123/start', {
      method: 'POST',
    });
    const response = await POST(request, createParams('inst-abc123'));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Instance must be stopped to start');
  });

  it('returns 200 with STARTING status on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(getInstanceById).mockResolvedValue({
      ...mockStoppedInstance,
      userId: mockSession.user.id,
      user: { id: mockSession.user.id, email: mockSession.user.email, name: mockSession.user.name },
    } as Awaited<ReturnType<typeof getInstanceById>>);
    vi.mocked(updateInstanceStatus).mockResolvedValue({
      ...mockStoppedInstance,
      status: 'STARTING',
    } as Awaited<ReturnType<typeof updateInstanceStatus>>);

    const request = new NextRequest('http://localhost:3000/api/instances/inst-stopped/start', {
      method: 'POST',
    });
    const response = await POST(request, createParams('inst-stopped'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Instance is starting');
    expect(data.status).toBe('STARTING');
    expect(updateInstanceStatus).toHaveBeenCalledWith('inst-stopped', 'STARTING');
  });
});
