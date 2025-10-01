// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      stripeCustomerId?: string;
    } & DefaultSession['user'];
  }
  
  interface User {
    role?: string;
    stripeCustomerId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    stripeCustomerId?: string;
  }
}