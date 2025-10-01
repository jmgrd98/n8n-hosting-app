// app/(auth)/login/page.tsx
import React, { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
