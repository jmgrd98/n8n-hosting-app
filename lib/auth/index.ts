// lib/auth/index.ts
import { getServerSession as getNextAuthSession } from 'next-auth';
import { authOptions } from './auth-options';
import { redirect } from 'next/navigation';

export async function getServerSession() {
  return await getNextAuthSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getServerSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  return session.user;
}

export async function requireAdmin() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/login');
  }
  
  if (session.user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }
  
  return session.user;
}