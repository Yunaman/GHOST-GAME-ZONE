import { getConsolesWithActiveSessionsAction } from '@/app/actions';
import { DashboardClientView } from '@/components/DashboardClientView';

export const revalidate = 0;

export default async function DashboardPage() {
  try {
    const result = await getConsolesWithActiveSessionsAction();
    if (result.success && result.data) {
      return (
        <DashboardClientView
          initialConsolesWithSessions={result.data}
          initialSettings={result.settings}
        />
      );
    }
  } catch (err) {
    // If offline or fetch error on server, render ClientView which loads from IndexedDB
  }

  return <DashboardClientView initialConsolesWithSessions={null} initialSettings={null} />;
}
