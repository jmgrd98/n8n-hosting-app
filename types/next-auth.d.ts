// types/next-auth.d.ts
import { UserRole } from '@prisma/client';
import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: UserRole; // Strongly typed enum instead of string
      stripeCustomerId?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole; // Required, not optional
    stripeCustomerId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    // Don't add 'id' - use 'sub' which is the standard JWT user ID claim
    role: UserRole; // Strongly typed enum
    stripeCustomerId?: string;
  }
}