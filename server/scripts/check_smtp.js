import { verifyWorkflowSmtp } from '../src/utils/mailer.js';
import { pool } from '../src/config/database.js';

try {
  const result = await verifyWorkflowSmtp();
  console.log(JSON.stringify(result, null, 2));
  if (!result.success) process.exitCode = 1;
} catch (error) {
  console.error('Không kiểm tra được SMTP:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
