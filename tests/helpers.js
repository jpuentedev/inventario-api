import request from 'supertest';
import app from '../src/app.js';
import { setupDatabase } from '../db/setup.js';

export const api = () => request(app);

// Deja la base de pruebas como recién creada: tablas, datos de ejemplo y admin
export const resetDatabase = () => setupDatabase({ reset: true, log: () => {} });

export async function login(email, password) {
  const res = await api().post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Login falló para ${email}: ${res.status}`);
  return res.body.token;
}

export const loginAdmin = () => login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);

// Crea un vendedor con el token de un admin y devuelve su token
export async function createSeller(adminToken, email = 'vendedor@test.local') {
  const password = 'vendedor-123';
  await api()
    .post('/api/auth/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Vendedor Pruebas', email, password })
    .expect(201);
  return login(email, password);
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
