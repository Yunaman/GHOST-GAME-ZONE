import { repository } from '../src/lib/repository';

async function testAllTvs() {
  console.log('--- TESTING INDEPENDENT OPERATION OF TV 1, TV 2, AND TV 3 ---');

  const consoles = await repository.getConsoles();
  const tv1 = consoles.find((c) => c.name === 'TV 1')!;
  const tv2 = consoles.find((c) => c.name === 'TV 2')!;
  const tv3 = consoles.find((c) => c.name === 'TV 3')!;

  console.log('TV Stations identified:', tv1.name, tv2.name, tv3.name);

  // Clean active sessions if any
  for (const tv of [tv1, tv2, tv3]) {
    const active = await repository.getActiveSessionByConsoleId(tv.id);
    if (active) {
      await repository.finishSession(active.id, 'CASH');
    }
  }

  // Start TV 1 with 1 match
  const s1 = await repository.startSession(tv1.id, 'Staff');
  await repository.addMatch(s1.id);

  // Start TV 2 with 2 matches
  const s2 = await repository.startSession(tv2.id, 'Staff');
  await repository.addMatch(s2.id);
  await repository.addMatch(s2.id);

  // Start TV 3 with 3 matches
  const s3 = await repository.startSession(tv3.id, 'Staff');
  await repository.addMatch(s3.id);
  await repository.addMatch(s3.id);
  await repository.addMatch(s3.id);

  // Re-query all three TVs
  const q1 = await repository.getActiveSessionByConsoleId(tv1.id);
  const q2 = await repository.getActiveSessionByConsoleId(tv2.id);
  const q3 = await repository.getActiveSessionByConsoleId(tv3.id);

  console.log(`TV 1 Session Matches: ${q1?.matches?.length} Total: ${q1?.total_amount} ETB`);
  console.log(`TV 2 Session Matches: ${q2?.matches?.length} Total: ${q2?.total_amount} ETB`);
  console.log(`TV 3 Session Matches: ${q3?.matches?.length} Total: ${q3?.total_amount} ETB`);

  if (q1?.matches?.length !== 1 || q2?.matches?.length !== 2 || q3?.matches?.length !== 3) {
    throw new Error('TV Station independent state test failed!');
  }

  // Clean up test sessions
  await repository.finishSession(s1.id, 'CASH');
  await repository.finishSession(s2.id, 'CASH');
  await repository.finishSession(s3.id, 'CASH');

  console.log('----------------------------------------------------');
  console.log('ALL THREE TV STATIONS OPERATE INDEPENDENTLY & PERFECTLY!');
  console.log('----------------------------------------------------');
}

testAllTvs().catch((err) => {
  console.error('TV Test Error:', err);
  process.exit(1);
});
