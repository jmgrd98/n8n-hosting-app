// lib/auth/auth-options.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/database';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Return user with consistent ID format
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
    
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('Sign In Callback - User ID:', user.id, 'Email:', user.email, 'Account:', account, 'Profile:', profile);
      
      // For OAuth, ensure the user exists in database
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        try {
          // Check if user exists by email first
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          });
          
          if (existingUser) {
            console.log('Existing user found:', existingUser.id);
            // Update user object with the database ID
            user.id = existingUser.id;
          }
        } catch (error) {
          console.error('Error in signIn callback:', error);
        }
      }
      
      return true;
    },
    
    async session({ session, token }) {
      // Always include the user ID from the token
      if (session.user) {
        // The token.sub contains the user ID
        session.user.id = token.sub as string;
        
        // Fetch fresh user data to ensure we have the latest
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
            }
          });
          
          if (dbUser) {
            session.user = {
              ...session.user,
              id: dbUser.id,
              email: dbUser.email!,
              name: dbUser.name,
              image: dbUser.image,
              role: dbUser.role,
            };
            console.log('Session user ID set to:', dbUser.id);
          }
        } catch (error) {
          console.error('Error fetching user in session callback:', error);
        }
      }
      
      return session;
    },
    
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign in - user object is only available on sign in
      console.log('JWT - Trigger:', trigger);
      console.log('Account', account);
      console.log('Profile', profile);
      
      if (user) {
        console.log('JWT - Initial sign in, user ID:', user.id);
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      
      // For subsequent requests, token.sub should already contain the user ID
      if (token.sub) {
        console.log('JWT - Token sub (user ID):', token.sub);
      }
      
      return token;
    },
  },
  
  events: {
    async createUser({ user }) {
      console.log('✅ New user created:', user.id, user.email);
    },
    async signIn({ user, account, isNewUser }) {
      console.log('✅ User signed in:', {
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser
      });
    },
    async linkAccount({ user, account }) {
      console.log('✅ Account linked:', {
        userId: user.id,
        provider: account.provider,
        providerAccountId: account.providerAccountId
      });
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  debug: process.env.NODE_ENV === 'development',
};