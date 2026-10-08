// Se ejecuta antes de cada archivo de pruebas, antes de importar la app.
// Toma las credenciales de MySQL de .env (o del entorno en CI) pero usa una base propia,
// así las pruebas nunca tocan los datos de desarrollo.
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

Object.assign(process.env, {
  DB_NAME: 'inventario_test',
  JWT_SECRET: 'secreto-solo-para-pruebas',
  JWT_EXPIRES_IN: '1h',
  ADMIN_NAME: 'Admin Pruebas',
  ADMIN_EMAIL: 'admin@test.local',
  ADMIN_PASSWORD: 'admin-pass-123',
});
