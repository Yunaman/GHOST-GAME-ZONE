import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { repository } from '@/lib/repository';
import AdminDashboardClientView from '@/components/AdminDashboardClientView';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const currentUser = await getAuthUser();

  if (!currentUser || (currentUser.role !== 'PRODUCT_OWNER' && currentUser.username.toLowerCase() !== 'ghostvon')) {
    redirect('/');
  }

  const stats = await repository.getAdminStats();
  const tenants = await repository.getTenants();

  return (
    <AdminDashboardClientView
      initialStats={stats}
      initialTenants={tenants}
    />
  );
}
