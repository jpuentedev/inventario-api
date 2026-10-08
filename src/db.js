import mysql from 'mysql2/promise';
import { connectionConfig } from './db-config.js';

// Pool de conexiones: reutiliza conexiones en lugar de abrir una por petición
export const pool = mysql.createPool({
  ...connectionConfig(),
  database: process.env.DB_NAME,
  connectionLimit: 10,
  decimalNumbers: true,
});
