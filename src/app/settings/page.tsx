import { repository } from '@/lib/repository';
import { SettingsClientView } from '@/components/SettingsClientView';

export const revalidate = 0;

export default async function SettingsPage() {
  try {
    const settings = await repository.getSettings();
    const consoles = await repository.getConsoles();
    return <SettingsClientView initialSettings={settings} initialConsoles={consoles} />;
  } catch (err) {
    // Offline or server fetch failure fallback
  }

  return <SettingsClientView initialSettings={null} initialConsoles={null} />;
}
