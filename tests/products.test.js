import { beforeAll, describe, expect, test } from '@jest/globals';
import { api, bearer, createSeller, loginAdmin, resetDatabase } from './helpers.js';

let admin;
let seller;

beforeAll(async () => {
  await resetDatabase();
  const adminToken = await loginAdmin();
  admin = bearer(adminToken);
  seller = bearer(await createSeller(adminToken));
});

describe('GET /api/products', () => {
  test('lista los productos de ejemplo con su categoría', async () => {
    const res = await api().get('/api/products').set(seller).expect(200);

    expect(res.body.total).toBe(3);
    expect(res.body.data[0]).toMatchObject({ sku: 'ELEC-001', category: 'Electrónica' });
  });

  test('pagina con page y limit', async () => {
    const res = await api().get('/api/products?limit=2&page=2').set(seller).expect(200);
    expect(res.body).toMatchObject({ page: 2, limit: 2, total: 3 });
    expect(res.body.data).toHaveLength(1);
  });

  test('busca por nombre o SKU', async () => {
    const byName = await api().get('/api/products?search=teclado').set(seller).expect(200);
    expect(byName.body.data.map((p) => p.sku)).toEqual(['ELEC-002']);

    const bySku = await api().get('/api/products?search=PAP').set(seller).expect(200);
    expect(bySku.body.data.map((p) => p.sku)).toEqual(['PAP-001']);
  });

  test('filtra por categoría', async () => {
    const res = await api().get('/api/products?category_id=1').set(seller).expect(200);
    expect(res.body.total).toBe(2);
  });
});

describe('GET /api/products/:id', () => {
  test('devuelve el detalle', async () => {
    const res = await api().get('/api/products/2').set(seller).expect(200);
    expect(res.body).toMatchObject({ id: 2, name: 'Teclado mecánico', price: 899, stock: 12 });
  });

  test('404 si no existe', async () => {
    await api().get('/api/products/999').set(seller).expect(404);
  });

  test('400 si el id no es numérico', async () => {
    await api().get('/api/products/abc').set(seller).expect(400);
  });
});

describe('alta, cambio y baja de productos (admin)', () => {
  test('crea, actualiza y elimina un producto', async () => {
    const created = await api()
      .post('/api/products')
      .set(admin)
      .send({ sku: 'ELEC-003', name: 'Audífonos', price: 399.9, stock: 20, category_id: 1 })
      .expect(201);
    const { id } = created.body;

    await api().patch(`/api/products/${id}`).set(admin).send({ stock: 15 }).expect(200);
    const updated = await api().get(`/api/products/${id}`).set(admin).expect(200);
    expect(updated.body.stock).toBe(15);

    await api().delete(`/api/products/${id}`).set(admin).expect(204);
    await api().get(`/api/products/${id}`).set(admin).expect(404);
  });

  test('valida los datos con detalle por campo', async () => {
    const res = await api().post('/api/products').set(admin).send({ sku: '', price: -5 }).expect(400);
    expect(Object.keys(res.body.details).sort()).toEqual(['name', 'price', 'sku']);
  });

  test('409 si el SKU ya existe', async () => {
    await api().post('/api/products').set(admin).send({ sku: 'ELEC-001', name: 'Otro', price: 1 }).expect(409);
  });

  test('400 si la categoría no existe', async () => {
    const res = await api()
      .post('/api/products')
      .set(admin)
      .send({ sku: 'X-1', name: 'X', price: 1, category_id: 999 })
      .expect(400);
    expect(res.body.error).toBe('La categoría no existe');
  });

  test('actualizar o borrar un producto inexistente responde 404', async () => {
    await api().patch('/api/products/999').set(admin).send({ stock: 1 }).expect(404);
    await api().delete('/api/products/999').set(admin).expect(404);
  });

  test('PATCH sin campos responde 400', async () => {
    await api().patch('/api/products/1').set(admin).send({}).expect(400);
  });

  test('ignora campos que no son del producto', async () => {
    const res = await api().patch('/api/products/1').set(admin).send({ stock: 30, id: 500 }).expect(200);
    expect(res.body).toEqual({ id: 1, stock: 30 });
  });
});

describe('permisos del vendedor', () => {
  test('no puede crear, editar ni borrar productos', async () => {
    await api().post('/api/products').set(seller).send({ sku: 'Z', name: 'Z', price: 1 }).expect(403);
    await api().patch('/api/products/1').set(seller).send({ stock: 0 }).expect(403);
    await api().delete('/api/products/1').set(seller).expect(403);
  });

  test('no puede crear ni borrar categorías', async () => {
    await api().post('/api/categories').set(seller).send({ name: 'Nueva' }).expect(403);
    await api().delete('/api/categories/1').set(seller).expect(403);
  });
});

describe('categorías', () => {
  test('el admin crea una categoría y se lista', async () => {
    await api().post('/api/categories').set(admin).send({ name: 'Hogar' }).expect(201);
    const res = await api().get('/api/categories').set(seller).expect(200);
    expect(res.body.map((c) => c.name)).toContain('Hogar');
  });

  test('409 si la categoría ya existe y 404 al borrar una inexistente', async () => {
    await api().post('/api/categories').set(admin).send({ name: 'Electrónica' }).expect(409);
    await api().delete('/api/categories/999').set(admin).expect(404);
  });

  test('borrar una categoría deja a sus productos sin categoría', async () => {
    await api().delete('/api/categories/2').set(admin).expect(204);
    const res = await api().get('/api/products/3').set(admin).expect(200);
    expect(res.body.category_id).toBeNull();
  });
});

test('ruta inexistente responde 404', async () => {
  await api().get('/api/nada').expect(404);
});
