# Inventario API

[![Tests](https://github.com/jpuentedev/inventario-api/actions/workflows/tests.yml/badge.svg)](https://github.com/jpuentedev/inventario-api/actions/workflows/tests.yml)

API REST para gestionar inventario y ventas, construida con **Node.js**, **Express** y **MySQL**.

## Tecnologías

- Node.js 20+ y Express
- MySQL 8 (driver `mysql2` con pool de conexiones)
- JWT (`jsonwebtoken`) y `bcryptjs` para autenticación
- Zod para validar datos de entrada
- Jest + Supertest para pruebas de integración, en CI con GitHub Actions
- OpenAPI 3 + Swagger UI para documentación interactiva

## Instalación

```bash
npm install
cp .env.example .env   # credenciales de MySQL, JWT_SECRET y datos del primer admin
npm run db:init        # crea la base de datos, las tablas, datos de ejemplo y el admin
npm run dev
```

> Si cambia el esquema, `npm run db:reset` borra la base y la vuelve a crear.

## Documentación interactiva (Swagger)

Con el servidor corriendo, abre **http://localhost:3000/docs**.

1. Ejecuta `POST /api/auth/login` con **Try it out** y copia el `token` de la respuesta.
2. Pulsa **Authorize**, pega el token y confirma.
3. Prueba cualquier endpoint desde el navegador; el token se conserva al recargar.

La especificación OpenAPI 3 está en [`src/docs/openapi.js`](src/docs/openapi.js) y en crudo en `/docs.json`
(sirve para importarla en Postman o Insomnia). Una prueba automatizada compara las rutas de Express
con la especificación, así ningún endpoint queda sin documentar.

## Pruebas

```bash
npm test               # 56 pruebas de integración
npm test -- --coverage # con reporte de cobertura
```

Las pruebas levantan la app con Supertest y usan una base MySQL real y separada
(`inventario_test`), que se recrea antes de cada archivo; nunca tocan la base de desarrollo.
Toman las credenciales de MySQL de `.env`.

| Archivo | Qué cubre |
| --- | --- |
| `tests/auth.test.js` | Login, tokens inválidos, expirados o con otro secreto, gestión de usuarios y permisos |
| `tests/products.test.js` | Listado, búsqueda, paginación, CRUD, validaciones, categorías y permisos del vendedor |
| `tests/orders.test.js` | Ventas, rollback por stock insuficiente, precio histórico, cancelación, visibilidad por rol y concurrencia |
| `tests/docs.test.js` | Swagger UI responde, la especificación es OpenAPI 3 y documenta exactamente las rutas de Express |

Las pruebas de concurrencia lanzan 20 ventas simultáneas sobre 12 unidades (se aceptan exactamente 12)
y ventas cruzadas en orden inverso para comprobar que no hay deadlocks.
Cobertura actual: ~99 % de líneas.

En cada push, GitHub Actions levanta un contenedor MySQL 8.4 y corre la suite completa.

## Autenticación y roles

Todas las rutas bajo `/api` (excepto el login) requieren el header `Authorization: Bearer <token>`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@inventario.local","password":"<ADMIN_PASSWORD>"}'
```

| Acción | admin | seller |
| --- | --- | --- |
| Consultar productos y categorías | ✓ | ✓ |
| Crear, editar y borrar productos y categorías | ✓ | — |
| Registrar ventas | ✓ | ✓ |
| Ver órdenes | todas | solo las suyas |
| Cancelar ventas | ✓ | — |
| Dar de alta usuarios | ✓ | — |

- Las contraseñas se guardan con hash bcrypt; no hay registro público: solo un admin crea usuarios.
- El login responde igual (y tarda lo mismo) si el correo no existe o la contraseña es incorrecta, para no revelar qué cuentas existen.
- Un vendedor recibe 404 al pedir una orden ajena, así no puede saber si existe.

## Endpoints

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/health` | público | Estado de la API |
| POST | `/api/auth/login` | público | Inicia sesión y devuelve un JWT |
| GET | `/api/auth/me` | cualquiera | Datos del usuario autenticado |
| GET | `/api/auth/users` | admin | Lista usuarios |
| POST | `/api/auth/users` | admin | Crea un usuario (admin o seller) |
| GET | `/api/products?search=&category_id=&page=&limit=` | cualquiera | Lista productos con búsqueda y paginación |
| GET | `/api/products/:id` | cualquiera | Detalle de un producto |
| POST | `/api/products` | admin | Crea un producto |
| PATCH | `/api/products/:id` | admin | Actualiza un producto |
| DELETE | `/api/products/:id` | admin | Elimina un producto |
| GET | `/api/categories` | cualquiera | Lista categorías |
| POST | `/api/categories` | admin | Crea una categoría |
| DELETE | `/api/categories/:id` | admin | Elimina una categoría |
| GET | `/api/orders?page=&limit=` | cualquiera | Lista órdenes (el vendedor solo ve las suyas) |
| GET | `/api/orders/:id` | cualquiera | Detalle de una orden con sus productos |
| POST | `/api/orders` | cualquiera | Registra una venta y descuenta el stock |
| POST | `/api/orders/:id/cancel` | admin | Cancela una venta y devuelve el stock |

## Órdenes de venta y concurrencia

Cada venta se procesa en una **transacción**: se bloquean las filas de los productos con
`SELECT ... FOR UPDATE`, se valida el stock de todos, se descuenta y se guarda la orden.
Si un solo producto no alcanza, se hace rollback y nada cambia.

- Las filas se bloquean siempre en el mismo orden (por id) para evitar deadlocks.
- Cada línea guarda el precio al momento de la venta, así un cambio de precio no altera órdenes pasadas.
- Cancelar una orden devuelve el stock en la misma transacción.
- Prueba: 20 ventas simultáneas de un producto con stock 12 → 12 aceptadas (201), 8 rechazadas (409), stock final 0, nunca negativo.

## Roadmap

- [x] CRUD de productos y categorías
- [x] Órdenes de venta con transacciones (descuento de stock atómico)
- [x] Autenticación con JWT y roles (admin / vendedor)
- [ ] Historial de movimientos de inventario
- [ ] Reportes: productos más vendidos, stock bajo
- [x] Pruebas automatizadas (Jest + Supertest) con CI en GitHub Actions
- [ ] Docker y despliegue
