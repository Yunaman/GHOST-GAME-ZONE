import { repository } from '@/lib/repository';
import { ReportsClientView } from '@/components/ReportsClientView';

export const revalidate = 0;

export default async function ReportsPage() {
  const summary = await repository.getAnalyticsSummary();
  const settings = await repository.getSettings();

  return <ReportsClientView initialSummary={summary} initialSettings={settings} />;
}
