import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

// Verifica el header "Authorization: Bearer <token>" y deja el usuario en req.user
export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Token requerido'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o expirado'));
  }
}

// Permite el paso solo a los roles indicados; se usa después de authenticate
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'No tienes permiso para esta acción'));
  next();
};
