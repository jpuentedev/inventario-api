import { afterAll } from '@jest/globals';
import { pool } from '../src/db.js';

// Cierra las conexiones al final de cada archivo para que Jest termine limpio
afterAll(() => pool.end());
