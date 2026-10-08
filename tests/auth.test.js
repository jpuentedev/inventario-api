import { beforeAll, describe, expect, test } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { api, bearer, createSeller, loginAdmin, resetDatabase } from './helpers.js';

let adminToken;
let sellerToken;

beforeAll(async () => {
  await resetDatabase();
  adminToken = await loginAdmin();
  sellerToken = await createSeller(adminToken);
});

describe('POST /api/auth/login', () => {
  test('devuelve un token y los datos públicos del usuario', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
      .expect(200);

    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: process.env.ADMIN_EMAIL, role: 'admin' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('acepta el correo en mayúsculas', async () => {
    await api()
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL.toUpperCase(), password: process.env.ADMIN_PASSWORD })
      .expect(200);
  });

  test('responde igual con contraseña incorrecta y con correo inexistente', async () => {
    const wrongPassword = await api()
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL, password: 'incorrecta' });
    const unknownEmail = await api().post('/api/auth/login').send({ email: 'nadie@test.local', password: 'x' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  test('rechaza un correo con formato inválido', async () => {
    await api().post('/api/auth/login').send({ email: 'no-es-correo', password: 'x' }).expect(400);
  });
});

describe('protección de rutas', () => {
  test('/health es público', async () => {
    await api().get('/health').expect(200, { status: 'ok' });
  });

  test('sin token responde 401', async () => {
    const res = await api().get('/api/products').expect(401);
    expect(res.body.error).toBe('Token requerido');
  });

  test.each([
    ['un token mal formado', 'abc.def.ghi'],
    ['un token firmado con otro secreto', jwt.sign({ sub: '1', role: 'admin' }, 'otro-secreto')],
    ['un token expirado', () => jwt.sign({ sub: '1', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -10 })],
  ])('rechaza %s', async (_, token) => {
    const value = typeof token === 'function' ? token() : token;
    await api().get('/api/products').set(bearer(value)).expect(401);
  });

  test('el esquema de autorización debe ser Bearer', async () => {
    await api().get('/api/products').set('Authorization', `Basic ${adminToken}`).expect(401);
  });
});

describe('GET /api/auth/me', () => {
  test('devuelve el usuario del token', async () => {
    const res = await api().get('/api/auth/me').set(bearer(sellerToken)).expect(200);
    expect(res.body).toMatchObject({ email: 'vendedor@test.local', role: 'seller' });
  });
});

describe('gestión de usuarios', () => {
  test('el admin crea usuarios sin exponer la contraseña', async () => {
    const res = await api()
      .post('/api/auth/users')
      .set(bearer(adminToken))
      .send({ name: 'Nuevo', email: 'nuevo@test.local', password: 'password-123' })
      .expect(201);

    expect(res.body).toMatchObject({ email: 'nuevo@test.local', role: 'seller' });
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  test('el admin lista usuarios sin hashes de contraseña', async () => {
    const res = await api().get('/api/auth/users').set(bearer(adminToken)).expect(200);
    expect(res.body.map((u) => u.email)).toEqual(expect.arrayContaining(['admin@test.local', 'vendedor@test.local']));
    res.body.forEach((u) => expect(u).not.toHaveProperty('password_hash'));
  });

  test('exige contraseña de al menos 8 caracteres', async () => {
    const res = await api()
      .post('/api/auth/users')
      .set(bearer(adminToken))
      .send({ name: 'X', email: 'corta@test.local', password: '123' })
      .expect(400);
    expect(res.body.details).toHaveProperty('password');
  });

  test('rechaza correos duplicados con 409', async () => {
    await api()
      .post('/api/auth/users')
      .set(bearer(adminToken))
      .send({ name: 'Dup', email: 'vendedor@test.local', password: 'password-123' })
      .expect(409);
  });

  test('un vendedor no puede crear usuarios ni listarlos', async () => {
    await api()
      .post('/api/auth/users')
      .set(bearer(sellerToken))
      .send({ name: 'Hack', email: 'hack@test.local', password: 'password-123', role: 'admin' })
      .expect(403);
    await api().get('/api/auth/users').set(bearer(sellerToken)).expect(403);
  });
});
