import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { HttpError } from '../middlewares/errors.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const userSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8).max(72), // bcrypt solo usa los primeros 72 bytes
  role: z.enum(['admin', 'seller']).default('seller'),
});

// Hash fijo para comparar cuando el email no existe: así la respuesta tarda lo mismo
// y no se puede averiguar qué correos están registrados midiendo el tiempo
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  const [[user]] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Credenciales inválidas');

  const token = jwt.sign({ sub: String(user.id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function me(req, res) {
  const [[user]] = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [
    req.user.id,
  ]);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  res.json(user);
}

// Solo un admin puede dar de alta usuarios (no hay registro público)
export async function createUser(req, res) {
  const { password, ...data } = userSchema.parse(req.body);
  const password_hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query('INSERT INTO users SET ?', [{ ...data, password_hash }]);
  res.status(201).json({ id: result.insertId, ...data });
}

export async function listUsers(req, res) {
  const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
  res.json(rows);
}
