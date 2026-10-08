import { repository } from '@/lib/repository';
import { HistoryClientView } from '@/components/HistoryClientView';

export const revalidate = 0;

export default async function HistoryPage() {
  const sessions = await repository.getSessionsHistory(100);
  const settings = await repository.getSettings();

  return <HistoryClientView initialSessions={sessions} initialSettings={settings} />;
}
