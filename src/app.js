import express from 'express';
import productsRouter from './routes/products.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import ordersRouter from './routes/orders.routes.js';
import { notFound, errorHandler } from './middlewares/errors.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/orders', ordersRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
