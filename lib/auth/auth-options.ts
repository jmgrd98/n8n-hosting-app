// lib/auth/auth-options.ts
import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/database';
import { Adapter } from 'next-auth/adapters';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('🔐 Authorize called with email:', credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials');
            throw new Error('Please enter an email and password');
          }

          console.log('🔍 Looking up user...');
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              password: true,
              role: true,
            }
          });

          console.log('👤 User found:', user ? 'YES' : 'NO');
          console.log('🔑 User has password:', user?.password ? 'YES' : 'NO');

          if (!user || !user.password) {
            console.log('❌ No user or no password');
            throw new Error('No user found with this email');
          }

          console.log('🔐 Comparing passwords...');
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          console.log('✅ Password valid:', isPasswordValid);

          if (!isPasswordValid) {
            console.log('❌ Invalid password');
            throw new Error('Incorrect password');
          }

          console.log('✅ Authorization successful for user:', user.id);
          
          // Return user object matching our extended User type
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          };
        } catch (error) {
          console.error('💥 Error in authorize:', error);
          // Return null to indicate authentication failure
          return null;
        }
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
    async signIn({ user, account }) {
      console.log('📝 signIn callback - Provider:', account?.provider);
      
      // For credentials provider, always allow sign in
      if (account?.provider === 'credentials') {
        console.log('✅ Credentials sign in allowed');
        return true;
      }
      
      // For OAuth providers, ensure user has a role
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true }
          });
          
          if (existingUser) {
            console.log('OAuth sign in - existing user:', existingUser.id);
            user.role = existingUser.role;
          } else {
            user.role = UserRole.USER;
          }
        } catch (error) {
          console.error('Error in signIn callback:', error);
        }
      }
      
      return true;
    },
    
    async jwt({ token, user, trigger }) {
      console.log('🎫 JWT callback - Trigger:', trigger);
      
      if (user) {
        console.log('JWT - User signed in:', user.id);
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role;
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
        session.user.role = token.role;
        
        console.log('📋 Session created for user:', session.user.id);
      }
      
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  
  debug: process.env.NODE_ENV === 'development',
};