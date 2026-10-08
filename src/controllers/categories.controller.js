import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../middlewares/errors.js';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

const idSchema = z.coerce.number().int().positive();

export async function listCategories(req, res) {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json(rows);
}

export async function createCategory(req, res) {
  const data = categorySchema.parse(req.body);
  const [result] = await pool.query('INSERT INTO categories SET ?', [data]);
  res.status(201).json({ id: result.insertId, ...data });
}

export async function deleteCategory(req, res) {
  const id = idSchema.parse(req.params.id);
  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Categoría no encontrada');
  res.status(204).end();
}
