import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../middlewares/errors.js';

const productSchema = z.object({
  sku: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  category_id: z.number().int().positive().nullable().optional(),
});

const idSchema = z.coerce.number().int().positive();

export async function listProducts(req, res) {
  const { search, category_id } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where = [];
  const params = [];
  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category_id) {
    where.push('p.category_id = ?');
    params.push(Number(category_id));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${whereSql}
       ORDER BY p.id
       LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM products p ${whereSql}`,
    params
  );

  res.json({ data: rows, page, limit, total });
}

export async function getProduct(req, res) {
  const id = idSchema.parse(req.params.id);
  const [rows] = await pool.query(
    `SELECT p.*, c.name AS category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?`,
    [id]
  );
  if (!rows.length) throw new HttpError(404, 'Producto no encontrado');
  res.json(rows[0]);
}

export async function createProduct(req, res) {
  const data = productSchema.parse(req.body);
  const [result] = await pool.query('INSERT INTO products SET ?', [data]);
  res.status(201).json({ id: result.insertId, ...data });
}

export async function updateProduct(req, res) {
  const id = idSchema.parse(req.params.id);
  const data = productSchema.partial().parse(req.body);
  if (!Object.keys(data).length) throw new HttpError(400, 'No hay campos para actualizar');

  const [result] = await pool.query('UPDATE products SET ? WHERE id = ?', [data, id]);
  if (!result.affectedRows) throw new HttpError(404, 'Producto no encontrado');
  res.json({ id, ...data });
}

export async function deleteProduct(req, res) {
  const id = idSchema.parse(req.params.id);
  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Producto no encontrado');
  res.status(204).end();
}
