import 'dotenv/config';
import app from './app.js';
import { pool } from './db.js';

if (!process.env.JWT_SECRET) {
  console.error('Falta la variable de entorno JWT_SECRET');
  process.exit(1);
}

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
});

// Docker y las plataformas de despliegue envían SIGTERM antes de detener el contenedor:
// se dejan de aceptar conexiones, se terminan las peticiones en curso y se cierra el pool
function shutdown(signal) {
  console.log(`${signal} recibido, cerrando...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
