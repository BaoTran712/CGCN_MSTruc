import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const projectRoot = path.resolve(serverRoot, '..');
// Process variables take precedence, then server/.env, then the root .env.
dotenv.config({ path: path.join(serverRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });
