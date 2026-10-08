// Crea la base de datos y las tablas ejecutando schema.sql
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

await conn.query(sql);
await conn.end();
console.log('Base de datos inicializada');
