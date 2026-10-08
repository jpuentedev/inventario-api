import { beforeEach, describe, expect, test } from '@jest/globals';
import { api, bearer, createSeller, loginAdmin, resetDatabase } from './helpers.js';

let admin;
let seller;

// Cada prueba empieza con el stock de ejemplo: Mouse 30, Teclado 12, Cuaderno 100
beforeEach(async () => {
  await resetDatabase();
  const adminToken = await loginAdmin();
  admin = bearer(adminToken);
  seller = bearer(await createSeller(adminToken));
});

const stockOf = async (id) => (await api().get(`/api/products/${id}`).set(admin)).body.stock;

const sell = (auth, items, customer_name) =>
  api().post('/api/orders').set(auth).send({ customer_name, items });

describe('POST /api/orders', () => {
  test('registra la venta, calcula el total y descuenta el stock', async () => {
    const res = await sell(seller, [
      { product_id: 1, quantity: 2 },
      { product_id: 3, quantity: 5 },
    ], 'Ana López').expect(201);

    expect(res.body).toMatchObject({
      customer_name: 'Ana López',
      seller: 'Vendedor Pruebas',
      status: 'completed',
      total: 727.3,
    });
    expect(res.body.items).toHaveLength(2);
    expect(await stockOf(1)).toBe(28);
    expect(await stockOf(3)).toBe(95);
  });

  test('suma las cantidades de un producto repetido en una sola línea', async () => {
    const res = await sell(seller, [
      { product_id: 1, quantity: 2 },
      { product_id: 1, quantity: 1 },
    ]).expect(201);

    expect(res.body.items).toEqual([expect.objectContaining({ product_id: 1, quantity: 3 })]);
    expect(await stockOf(1)).toBe(27);
  });

  test('guarda el precio del momento aunque el producto cambie después', async () => {
    const order = await sell(seller, [{ product_id: 1, quantity: 1 }]).expect(201);
    await api().patch('/api/products/1').set(admin).send({ price: 999 }).expect(200);

    const res = await api().get(`/api/orders/${order.body.id}`).set(admin).expect(200);
    expect(res.body.items[0].unit_price).toBe(249.9);
  });

  test('si un producto no alcanza, rechaza la venta completa y no toca ningún stock', async () => {
    const res = await sell(seller, [
      { product_id: 1, quantity: 1 },
      { product_id: 2, quantity: 50 },
    ]).expect(409);

    expect(res.body.error).toBe('Stock insuficiente: Teclado mecánico (disponible: 12, solicitado: 50)');
    expect(await stockOf(1)).toBe(30);
    expect(await stockOf(2)).toBe(12);
  });

  test('404 si algún producto no existe, sin tocar el stock', async () => {
    const res = await sell(seller, [
      { product_id: 1, quantity: 1 },
      { product_id: 999, quantity: 1 },
    ]).expect(404);

    expect(res.body.error).toBe('Productos no encontrados: 999');
    expect(await stockOf(1)).toBe(30);
  });

  test.each([
    ['sin productos', []],
    ['con cantidad cero', [{ product_id: 1, quantity: 0 }]],
    ['con cantidad decimal', [{ product_id: 1, quantity: 1.5 }]],
  ])('400 para una orden %s', async (_, items) => {
    await sell(seller, items).expect(400);
  });

  test('no se puede borrar un producto que ya tiene ventas', async () => {
    await sell(seller, [{ product_id: 1, quantity: 1 }]).expect(201);
    const res = await api().delete('/api/products/1').set(admin).expect(409);
    expect(res.body.error).toBe('No se puede eliminar: tiene ventas registradas');
  });
});

describe('concurrencia', () => {
  test('20 ventas simultáneas sobre 12 unidades: se aceptan 12 y el stock nunca queda negativo', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => sell(seller, [{ product_id: 2, quantity: 1 }]))
    );
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(12);
    expect(statuses.filter((s) => s === 409)).toHaveLength(8);
    expect(await stockOf(2)).toBe(0);
  });

  test('ventas cruzadas de los mismos productos en orden inverso no producen deadlock', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        sell(
          seller,
          i % 2 === 0
            ? [{ product_id: 1, quantity: 1 }, { product_id: 3, quantity: 1 }]
            : [{ product_id: 3, quantity: 1 }, { product_id: 1, quantity: 1 }]
        )
      )
    );

    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(await stockOf(1)).toBe(20);
    expect(await stockOf(3)).toBe(90);
  });
});

describe('consulta de órdenes por rol', () => {
  test('el vendedor solo ve sus órdenes; el admin ve todas', async () => {
    await sell(seller, [{ product_id: 3, quantity: 1 }]).expect(201);
    const adminOrder = await sell(admin, [{ product_id: 1, quantity: 1 }]).expect(201);

    const sellerList = await api().get('/api/orders').set(seller).expect(200);
    expect(sellerList.body.total).toBe(1);
    expect(sellerList.body.data[0].seller).toBe('Vendedor Pruebas');

    const adminList = await api().get('/api/orders').set(admin).expect(200);
    expect(adminList.body.total).toBe(2);

    // Una orden ajena responde 404 para no revelar que existe
    await api().get(`/api/orders/${adminOrder.body.id}`).set(seller).expect(404);
  });
});

describe('POST /api/orders/:id/cancel', () => {
  test('el admin cancela y el stock se devuelve', async () => {
    const order = await sell(seller, [{ product_id: 1, quantity: 3 }]).expect(201);
    expect(await stockOf(1)).toBe(27);

    const res = await api().post(`/api/orders/${order.body.id}/cancel`).set(admin).expect(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.cancelled_at).not.toBeNull();
    expect(await stockOf(1)).toBe(30);
  });

  test('no se puede cancelar dos veces', async () => {
    const order = await sell(seller, [{ product_id: 1, quantity: 1 }]).expect(201);
    await api().post(`/api/orders/${order.body.id}/cancel`).set(admin).expect(200);

    const res = await api().post(`/api/orders/${order.body.id}/cancel`).set(admin).expect(409);
    expect(res.body.error).toBe('La orden ya está cancelada');
    expect(await stockOf(1)).toBe(30);
  });

  test('el vendedor no puede cancelar', async () => {
    const order = await sell(seller, [{ product_id: 1, quantity: 1 }]).expect(201);
    await api().post(`/api/orders/${order.body.id}/cancel`).set(seller).expect(403);
  });

  test('404 si la orden no existe', async () => {
    await api().post('/api/orders/999/cancel').set(admin).expect(404);
  });
});
