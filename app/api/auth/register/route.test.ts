import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/database');
vi.mock('bcryptjs');

import { NextRequest } from 'next/server';
import { getUserByEmail, createUser } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { POST } from './route';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('returns 400 when user already exists', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: 'existing-user',
      email: 'test@example.com',
      name: 'Existing User',
    } as Awaited<ReturnType<typeof getUserByEmail>>);

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('User already exists');
    expect(getUserByEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('returns 200 and creates user on success with hashed password', async () => {
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password_abc' as never);
    vi.mocked(createUser).mockResolvedValue({
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
    } as Awaited<ReturnType<typeof createUser>>);

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('User created successfully');
    expect(data.user).toEqual({
      id: 'new-user-1',
      email: 'new@example.com',
      name: 'New User',
    });

    // Verify password was hashed, not stored in plain text
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(createUser).toHaveBeenCalledWith({
      name: 'New User',
      email: 'new@example.com',
      password: 'hashed_password_abc',
    });
  });

  it('returns 500 on unexpected error', async () => {
    vi.mocked(getUserByEmail).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create user');
  });
});
