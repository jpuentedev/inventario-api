// Crea la base de datos y las tablas ejecutando schema.sql.
// Con --reset borra la base antes (útil cuando cambia el esquema).
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

if (process.argv.includes('--reset')) {
  await conn.query('DROP DATABASE IF EXISTS inventario');
  console.log('Base de datos borrada');
}

await conn.query(sql);

// Crea el primer administrador si no existe ningún usuario
const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM users');
if (count === 0 && ADMIN_EMAIL && ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await conn.query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", [
    ADMIN_NAME || 'Administrador',
    ADMIN_EMAIL.toLowerCase(),
    hash,
  ]);
  console.log(`Administrador creado: ${ADMIN_EMAIL}`);
}

await conn.end();
console.log('Base de datos inicializada');
