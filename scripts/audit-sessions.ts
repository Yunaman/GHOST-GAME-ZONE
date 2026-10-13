import { repository } from '../src/lib/repository';

async function main() {
  console.log('--- SUPABASE ACTIVE CONSOLES & SESSIONS ---');
  const consoles = await repository.getConsoles();
  console.log('Consoles count:', consoles.length);
  for (const c of consoles) {
    const active = await repository.getActiveSessionByConsoleId(c.id);
    if (active) {
      console.log(`Console ${c.name} (${c.id}): STATUS=${c.status}, ACTIVE_SESSION_ID=${active.id}, MATCHES_COUNT=${active.matches?.length}, TOTAL=${active.total_amount} ETB`);
    } else {
      console.log(`Console ${c.name} (${c.id}): STATUS=${c.status}, NO_ACTIVE_SESSION`);
    }
  }

  const settings = await repository.getSettings();
  console.log('Settings:', settings);
}

main().catch(console.error);
