import { redirect } from 'next/navigation';
import { getAuthUser, getAdminUser } from '@/lib/auth';
import { getAdminOverviewAction } from '@/app/admin-actions';
import { AdminClientView } from './AdminClientView';

export const revalidate = 0;

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user || user.role !== 'OWNER') {
    redirect('/login');
  }

  const overviewRes = await getAdminOverviewAction();
  const overviewData = overviewRes.success && overviewRes.data
    ? overviewRes.data
    : {
        totalCount: 0,
        activeCount: 0,
        suspendedCount: 0,
        paidCount: 0,
        pendingCount: 0,
        totalSales: 0,
        tenants: [],
      };

  return <AdminClientView overview={overviewData} ownerUsername={getAdminUser()} />;
}
