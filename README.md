# Inventario API

API REST para gestionar inventario y ventas, construida con **Node.js**, **Express** y **MySQL**.

## Tecnologías

- Node.js 20+ y Express
- MySQL 8 (driver `mysql2` con pool de conexiones)
- Zod para validar datos de entrada

## Instalación

> Si ya tenías la base creada de una versión anterior, vuelve a correr `npm run db:init` para agregar las tablas de órdenes.

```bash
npm install
cp .env.example .env   # edita tus credenciales de MySQL
npm run db:init        # crea la base de datos, las tablas y los datos de ejemplo
npm run dev
```

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/health` | Estado de la API |
| GET | `/api/products?search=&category_id=&page=&limit=` | Lista productos con búsqueda y paginación |
| GET | `/api/products/:id` | Detalle de un producto |
| POST | `/api/products` | Crea un producto |
| PATCH | `/api/products/:id` | Actualiza un producto |
| DELETE | `/api/products/:id` | Elimina un producto |
| GET | `/api/categories` | Lista categorías |
| POST | `/api/categories` | Crea una categoría |
| DELETE | `/api/categories/:id` | Elimina una categoría |
| GET | `/api/orders?page=&limit=` | Lista órdenes de venta |
| GET | `/api/orders/:id` | Detalle de una orden con sus productos |
| POST | `/api/orders` | Registra una venta y descuenta el stock |
| POST | `/api/orders/:id/cancel` | Cancela una venta y devuelve el stock |

## Órdenes de venta y concurrencia

Cada venta se procesa en una **transacción**: se bloquean las filas de los productos con
`SELECT ... FOR UPDATE`, se valida el stock de todos, se descuenta y se guarda la orden.
Si un solo producto no alcanza, se hace rollback y nada cambia.

- Las filas se bloquean siempre en el mismo orden (por id) para evitar deadlocks.
- Cada línea guarda el precio al momento de la venta, así un cambio de precio no altera órdenes pasadas.
- Cancelar una orden devuelve el stock en la misma transacción.
- Prueba: 20 ventas simultáneas de un producto con stock 12 → 12 aceptadas (201), 8 rechazadas (409), stock final 0, nunca negativo.

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"sku":"ELEC-003","name":"Audífonos","price":399.9,"stock":20,"category_id":1}'
```

## Roadmap

- [x] CRUD de productos y categorías
- [x] Órdenes de venta con transacciones (descuento de stock atómico)
- [ ] Historial de movimientos de inventario
- [ ] Autenticación con JWT y roles (admin / vendedor)
- [ ] Reportes: productos más vendidos, stock bajo
- [ ] Pruebas automatizadas (Jest + Supertest)
- [ ] Docker y despliegue
