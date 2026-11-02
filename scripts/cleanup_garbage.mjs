import { cleanupGarbageData } from '../server/src/utils/cleanupGarbageData.js';

async function main() {
  const report = await cleanupGarbageData();
  console.log('[CleanupGarbageData] Hoàn tất dọn dẹp:', report);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

