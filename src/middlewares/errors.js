import { ZodError } from 'zod';

// Error con código HTTP para lanzarlo desde los controladores
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// Express 4 no captura errores de funciones async; este wrapper los pasa a next()
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos inválidos', details: err.flatten().fieldErrors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'La categoría no existe' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: tiene ventas registradas' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
