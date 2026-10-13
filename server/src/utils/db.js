// Re-export từ server/src/config/database.js để đảm bảo tính đồng bộ kiến trúc
export {
  pool,
  default,
  dbConfig,
  initDb,
  getPool,
  isDbConnected,
  query,
  execute,
  getConnection,
} from '../config/database.js';
