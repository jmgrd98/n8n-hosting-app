// lib/auth/session-provider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: ProvidersProps) {
  return <SessionProvider>{children}</SessionProvider>;
}