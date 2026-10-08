import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../middlewares/errors.js';

const orderSchema = z.object({
  customer_name: z.string().trim().max(150).nullable().optional(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

const idSchema = z.coerce.number().int().positive();

// Ejecuta fn dentro de una transacción: commit si todo sale bien, rollback si algo falla
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function findOrder(conn, id) {
  const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;
  const [items] = await conn.query(
    `SELECT oi.product_id, p.sku, p.name, oi.quantity, oi.unit_price, oi.subtotal
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?`,
    [id]
  );
  return { ...order, items };
}

export async function createOrder(req, res) {
  const { customer_name, items } = orderSchema.parse(req.body);

  // Junta cantidades si el mismo producto viene repetido en la orden
  const quantities = new Map();
  for (const { product_id, quantity } of items) {
    quantities.set(product_id, (quantities.get(product_id) || 0) + quantity);
  }
  // Orden fijo de ids para que dos ventas simultáneas bloqueen filas en el mismo orden (evita deadlocks)
  const ids = [...quantities.keys()].sort((a, b) => a - b);

  const orderId = await withTransaction(async (conn) => {
    // FOR UPDATE bloquea las filas hasta el commit: nadie más puede vender ese stock a la vez
    const [products] = await conn.query(
      'SELECT id, name, price, stock FROM products WHERE id IN (?) ORDER BY id FOR UPDATE',
      [ids]
    );

    const missing = ids.filter((id) => !products.some((p) => p.id === id));
    if (missing.length) throw new HttpError(404, `Productos no encontrados: ${missing.join(', ')}`);

    const insufficient = products.filter((p) => p.stock < quantities.get(p.id));
    if (insufficient.length) {
      const detail = insufficient
        .map((p) => `${p.name} (disponible: ${p.stock}, solicitado: ${quantities.get(p.id)})`)
        .join('; ');
      throw new HttpError(409, `Stock insuficiente: ${detail}`);
    }

    const lines = products.map((p) => {
      const quantity = quantities.get(p.id);
      return { product_id: p.id, quantity, unit_price: p.price, subtotal: Math.round(p.price * quantity * 100) / 100 };
    });
    const total = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;

    const [result] = await conn.query('INSERT INTO orders (customer_name, total) VALUES (?, ?)', [
      customer_name ?? null,
      total,
    ]);
    await conn.query(
      'INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES ?',
      [lines.map((l) => [result.insertId, l.product_id, l.quantity, l.unit_price, l.subtotal])]
    );
    for (const l of lines) {
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [l.quantity, l.product_id]);
    }
    return result.insertId;
  });

  res.status(201).json(await findOrder(pool, orderId));
}

export async function listOrders(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?', [
    limit,
    (page - 1) * limit,
  ]);
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM orders');
  res.json({ data: rows, page, limit, total });
}

export async function getOrder(req, res) {
  const id = idSchema.parse(req.params.id);
  const order = await findOrder(pool, id);
  if (!order) throw new HttpError(404, 'Orden no encontrada');
  res.json(order);
}

// Cancela la orden y devuelve el stock de cada producto, todo en una sola transacción
export async function cancelOrder(req, res) {
  const id = idSchema.parse(req.params.id);

  await withTransaction(async (conn) => {
    const [[order]] = await conn.query('SELECT status FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!order) throw new HttpError(404, 'Orden no encontrada');
    if (order.status === 'cancelled') throw new HttpError(409, 'La orden ya está cancelada');

    const [items] = await conn.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = ? ORDER BY product_id',
      [id]
    );
    for (const item of items) {
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await conn.query("UPDATE orders SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?", [id]);
  });

  res.json(await findOrder(pool, id));
}
