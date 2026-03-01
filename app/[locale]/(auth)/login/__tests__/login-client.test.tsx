import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { signIn } from 'next-auth/react';
import LoginClient from '../LoginClient';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn((key: string) => (key === 'callbackUrl' ? '/dashboard' : null)),
  }),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('@/i18n/navigation', async () => {
  const React = await import('react');
  return {
    Link: ({
      children,
      href,
      ...props
    }: {
      children: React.ReactNode;
      href: string;
      [key: string]: unknown;
    }) => React.createElement('a', { href, ...props }, children),
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
      back: vi.fn(),
      refresh: mockRefresh,
    }),
    usePathname: () => '/en/dashboard',
    redirect: vi.fn(),
  };
});

describe('LoginClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    render(<LoginClient />);

    expect(screen.getByLabelText('auth.login.email')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.login.password')).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    render(<LoginClient />);

    expect(
      screen.getByRole('button', { name: /auth\.login\.signInWithEmail/i })
    ).toBeInTheDocument();
  });

  it('renders OAuth buttons for Google and GitHub', () => {
    render(<LoginClient />);

    expect(
      screen.getByRole('button', { name: /auth\.login\.google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /auth\.login\.github/i })
    ).toBeInTheDocument();
  });

  it('renders register link', () => {
    render(<LoginClient />);

    const registerLink = screen.getByRole('link', {
      name: 'common.signUp',
    });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('calls signIn with credentials on form submit', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      error: null as unknown as string,
      status: 200,
      ok: true,
      url: '/dashboard',
    });

    render(<LoginClient />);

    await user.type(screen.getByLabelText('auth.login.email'), 'user@test.com');
    await user.type(screen.getByLabelText('auth.login.password'), 'secret123');
    await user.click(
      screen.getByRole('button', { name: /auth\.login\.signInWithEmail/i })
    );

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'user@test.com',
        password: 'secret123',
        redirect: false,
        callbackUrl: '/dashboard',
      });
    });
  });

  it('shows error message when signIn returns error', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      error: 'CredentialsSignin',
      status: 401,
      ok: false,
      url: null as unknown as string,
    });

    render(<LoginClient />);

    await user.type(screen.getByLabelText('auth.login.email'), 'bad@test.com');
    await user.type(screen.getByLabelText('auth.login.password'), 'wrong');
    await user.click(
      screen.getByRole('button', { name: /auth\.login\.signInWithEmail/i })
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('auth.login.invalidCredentials')
      ).toBeInTheDocument();
    });
  });

  it('redirects on successful sign in', async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      error: null as unknown as string,
      status: 200,
      ok: true,
      url: '/dashboard',
    });

    render(<LoginClient />);

    await user.type(screen.getByLabelText('auth.login.email'), 'user@test.com');
    await user.type(screen.getByLabelText('auth.login.password'), 'secret123');
    await user.click(
      screen.getByRole('button', { name: /auth\.login\.signInWithEmail/i })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
