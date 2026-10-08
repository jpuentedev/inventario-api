# Inventario API

API REST para gestionar inventario y ventas, construida con **Node.js**, **Express** y **MySQL**.

## Tecnologías

- Node.js 20+ y Express
- MySQL 8 (driver `mysql2` con pool de conexiones)
- Zod para validar datos de entrada

## Instalación

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

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"sku":"ELEC-003","name":"Audífonos","price":399.9,"stock":20,"category_id":1}'
```

## Roadmap

- [x] CRUD de productos y categorías
- [ ] Órdenes de venta con transacciones (descuento de stock atómico)
- [ ] Historial de movimientos de inventario
- [ ] Autenticación con JWT y roles (admin / vendedor)
- [ ] Reportes: productos más vendidos, stock bajo
- [ ] Pruebas automatizadas (Jest + Supertest)
- [ ] Docker y despliegue
