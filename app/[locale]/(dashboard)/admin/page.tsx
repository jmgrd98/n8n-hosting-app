import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { AdminPanel } from '@/components/admin/admin-panel';

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <AdminPanel />;
}
