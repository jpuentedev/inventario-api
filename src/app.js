import express from 'express';
import authRouter from './routes/auth.routes.js';
import productsRouter from './routes/products.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import ordersRouter from './routes/orders.routes.js';
import { authenticate } from './middlewares/auth.js';
import { notFound, errorHandler } from './middlewares/errors.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
// Todas las rutas de aquí en adelante requieren un token válido
app.use('/api/products', authenticate, productsRouter);
app.use('/api/categories', authenticate, categoriesRouter);
app.use('/api/orders', authenticate, ordersRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
