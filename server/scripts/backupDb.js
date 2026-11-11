import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbConfig } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.resolve(__dirname, '../ctump_docugov_backup.sql');
const xamppMysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
const dumpBin = fs.existsSync(xamppMysqldump) ? xamppMysqldump : 'mysqldump';

const args = [
  `-h${dbConfig.host}`,
  `-P${dbConfig.port}`,
  `-u${dbConfig.user}`,
  ...(dbConfig.password ? [`-p${dbConfig.password}`] : []),
  '--databases',
  dbConfig.database,
  '--add-drop-database',
  '--add-drop-table',
  '--default-character-set=utf8mb4',
  `--result-file=${outputPath}`,
];

try {
  execFileSync(dumpBin, args, { stdio: 'inherit' });
  console.log(`[backupDb] Đã sao lưu toàn bộ cơ sở dữ liệu '${dbConfig.database}' ra file: ${outputPath}`);
} catch (err) {
  console.error('[backupDb] Lỗi khi sao lưu database:', err.message);
  process.exit(1);
}

