// Crea la base de datos indicada en DB_NAME, sus tablas y el primer admin.
// Se usa desde db/init.js (línea de comandos) y desde las pruebas.
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { connectionConfig } from '../src/db-config.js';

export async function setupDatabase({ reset = false, log = console.log } = {}) {
  const { DB_NAME, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!/^\w+$/.test(DB_NAME || '')) throw new Error('DB_NAME inválido o vacío');

  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const conn = await mysql.createConnection({ ...connectionConfig(), multipleStatements: true });

  try {
    if (reset) {
      await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
      log(`Base de datos ${DB_NAME} borrada`);
    }
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${DB_NAME}\``);
    await conn.query(sql);

    // Crea el primer administrador si no existe ningún usuario
    const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM users');
    if (count === 0 && ADMIN_EMAIL && ADMIN_PASSWORD) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await conn.query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", [
        ADMIN_NAME || 'Administrador',
        ADMIN_EMAIL.toLowerCase(),
        hash,
      ]);
      log(`Administrador creado: ${ADMIN_EMAIL}`);
    }
  } finally {
    await conn.end();
  }
  log(`Base de datos ${DB_NAME} inicializada`);
}
