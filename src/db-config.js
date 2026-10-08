// Datos de conexión a MySQL compartidos por la app (pool) y db/setup.js.
// Si DB_SSL_CA tiene un certificado (PEM), la conexión va cifrada y verifica al servidor,
// como lo exigen los MySQL administrados (p. ej. Aiven). Acepta saltos de línea reales o "\n".
export function connectionConfig() {
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ...(ca && { ssl: { ca, rejectUnauthorized: true } }),
  };
}
