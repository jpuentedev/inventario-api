// Especificación OpenAPI 3 de la API; se sirve en /docs (interfaz) y /docs.json (JSON)

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, example) => ({ 'application/json': { schema, ...(example && { example }) } });
const idParam = (what) => ({ name: 'id', in: 'path', required: true, description: `Id ${what}`, schema: { type: 'integer', minimum: 1 } });
const pageParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];
const paginated = (item) => ({
  type: 'object',
  properties: { data: { type: 'array', items: ref(item) }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } },
});

// Respuestas de error reutilizables
const errors = {
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
};
const pick = (...codes) => Object.fromEntries(codes.map((c) => [c, errors[c]]));
const productFields = {
  sku: { type: 'string', maxLength: 50 },
  name: { type: 'string', maxLength: 150 },
  description: { type: 'string', nullable: true, maxLength: 2000 },
  price: { type: 'number', minimum: 0 },
  stock: { type: 'integer', minimum: 0, default: 0 },
  category_id: { type: 'integer', nullable: true },
};
const conflict = (message) => ({ description: 'Conflicto con el estado actual', content: json(ref('Error'), { error: message }) });

export default {
  openapi: '3.0.3',
  info: {
    title: 'Inventario API',
    version: '0.1.0',
    license: { name: 'MIT' },
    description: [
      'API REST de inventario y ventas con Node.js, Express y MySQL.',
      '',
      '**Cómo probarla:** ejecuta `POST /api/auth/login`, copia el `token` de la respuesta,',
      'pulsa **Authorize** (arriba a la derecha) y pégalo. A partir de ahí todas las peticiones lo envían.',
      '',
      'Roles: **admin** gestiona todo; **seller** consulta productos y registra ventas, y solo ve sus propias órdenes.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Este servidor' }],
  tags: [
    { name: 'Auth', description: 'Inicio de sesión y usuarios' },
    { name: 'Productos', description: 'Catálogo; solo admin puede modificarlo' },
    { name: 'Categorías', description: 'Agrupación de productos' },
    { name: 'Órdenes', description: 'Ventas con descuento de stock transaccional' },
    { name: 'Sistema', description: 'Estado del servicio' },
  ],
  security: [{ bearerAuth: [] }],

  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        operationId: 'health',
        summary: 'Estado de la API',
        security: [],
        responses: { 200: { description: 'La API está en línea', content: json({ type: 'object', properties: { status: { type: 'string' } } }, { status: 'ok' }) } },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        operationId: 'login',
        summary: 'Iniciar sesión',
        description: 'Devuelve un JWT válido por 8 horas. Responde igual si el correo no existe o si la contraseña es incorrecta.',
        security: [],
        requestBody: { required: true, content: json(ref('LoginInput'), { email: 'admin@inventario.local', password: 'tu-contraseña' }) },
        responses: {
          200: { description: 'Sesión iniciada', content: json(ref('LoginResponse')) },
          400: errors[400],
          401: { description: 'Credenciales inválidas', content: json(ref('Error'), { error: 'Credenciales inválidas' }) },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        operationId: 'getMe',
        summary: 'Usuario autenticado',
        responses: { 200: { description: 'Datos del usuario del token', content: json(ref('User')) }, ...pick(401, 404) },
      },
    },
    '/api/auth/users': {
      get: {
        tags: ['Auth'],
        operationId: 'listUsers',
        summary: 'Listar usuarios',
        description: 'Solo **admin**.',
        responses: { 200: { description: 'Usuarios', content: json({ type: 'array', items: ref('User') }) }, ...pick(401, 403) },
      },
      post: {
        tags: ['Auth'],
        operationId: 'createUser',
        summary: 'Crear usuario',
        description: 'Solo **admin**. No hay registro público.',
        requestBody: { required: true, content: json(ref('UserInput'), { name: 'Carlos Vendedor', email: 'carlos@inventario.local', password: 'vendedor123', role: 'seller' }) },
        responses: { 201: { description: 'Usuario creado', content: json(ref('User')) }, ...pick(400, 401, 403), 409: conflict('El registro ya existe') },
      },
    },

    '/api/products': {
      get: {
        tags: ['Productos'],
        operationId: 'listProducts',
        summary: 'Listar productos',
        parameters: [
          { name: 'search', in: 'query', description: 'Busca en nombre y SKU', schema: { type: 'string' } },
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          ...pageParams,
        ],
        responses: { 200: { description: 'Página de productos', content: json(paginated('Product')) }, ...pick(401) },
      },
      post: {
        tags: ['Productos'],
        operationId: 'createProduct',
        summary: 'Crear producto',
        description: 'Solo **admin**.',
        requestBody: { required: true, content: json(ref('ProductInput'), { sku: 'ELEC-003', name: 'Audífonos', price: 399.9, stock: 20, category_id: 1 }) },
        responses: { 201: { description: 'Producto creado', content: json(ref('ProductInput')) }, ...pick(400, 401, 403), 409: conflict('El registro ya existe') },
      },
    },
    '/api/products/{id}': {
      parameters: [idParam('del producto')],
      get: {
        tags: ['Productos'],
        operationId: 'getProduct',
        summary: 'Detalle de un producto',
        responses: { 200: { description: 'Producto', content: json(ref('Product')) }, ...pick(400, 401, 404) },
      },
      patch: {
        tags: ['Productos'],
        operationId: 'updateProduct',
        summary: 'Actualizar producto',
        description: 'Solo **admin**. Cambia únicamente los campos enviados.',
        requestBody: { required: true, content: json(ref('ProductPatch'), { stock: 15 }) },
        responses: { 200: { description: 'Campos actualizados' }, ...pick(400, 401, 403, 404) },
      },
      delete: {
        tags: ['Productos'],
        operationId: 'deleteProduct',
        summary: 'Eliminar producto',
        description: 'Solo **admin**. No se puede eliminar un producto con ventas registradas.',
        responses: { 204: { description: 'Eliminado' }, ...pick(401, 403, 404), 409: conflict('No se puede eliminar: tiene ventas registradas') },
      },
    },

    '/api/categories': {
      get: {
        tags: ['Categorías'],
        operationId: 'listCategories',
        summary: 'Listar categorías',
        responses: { 200: { description: 'Categorías', content: json({ type: 'array', items: ref('Category') }) }, ...pick(401) },
      },
      post: {
        tags: ['Categorías'],
        operationId: 'createCategory',
        summary: 'Crear categoría',
        description: 'Solo **admin**.',
        requestBody: { required: true, content: json({ type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 100 } } }, { name: 'Hogar' }) },
        responses: { 201: { description: 'Categoría creada', content: json(ref('Category')) }, ...pick(400, 401, 403), 409: conflict('El registro ya existe') },
      },
    },
    '/api/categories/{id}': {
      parameters: [idParam('de la categoría')],
      delete: {
        tags: ['Categorías'],
        operationId: 'deleteCategory',
        summary: 'Eliminar categoría',
        description: 'Solo **admin**. Sus productos quedan sin categoría.',
        responses: { 204: { description: 'Eliminada' }, ...pick(401, 403, 404) },
      },
    },

    '/api/orders': {
      get: {
        tags: ['Órdenes'],
        operationId: 'listOrders',
        summary: 'Listar órdenes',
        description: 'El **admin** ve todas; el **seller**, solo las suyas. Más recientes primero.',
        parameters: pageParams,
        responses: { 200: { description: 'Página de órdenes', content: json(paginated('OrderSummary')) }, ...pick(401) },
      },
      post: {
        tags: ['Órdenes'],
        operationId: 'createOrder',
        summary: 'Registrar venta',
        description: [
          'Valida y descuenta el stock de todos los productos en **una sola transacción** con `SELECT … FOR UPDATE`.',
          'Si algún producto no existe o no tiene stock suficiente, no se modifica nada.',
          'Si un producto aparece repetido, sus cantidades se suman.',
        ].join(' '),
        requestBody: {
          required: true,
          content: json(ref('OrderInput'), { customer_name: 'Ana López', items: [{ product_id: 1, quantity: 2 }, { product_id: 3, quantity: 5 }] }),
        },
        responses: {
          201: { description: 'Venta registrada', content: json(ref('Order')) },
          ...pick(400, 401),
          404: { description: 'Algún producto no existe', content: json(ref('Error'), { error: 'Productos no encontrados: 999' }) },
          409: conflict('Stock insuficiente: Teclado mecánico (disponible: 12, solicitado: 50)'),
        },
      },
    },
    '/api/orders/{id}': {
      parameters: [idParam('de la orden')],
      get: {
        tags: ['Órdenes'],
        operationId: 'getOrder',
        summary: 'Detalle de una orden',
        description: 'Un **seller** recibe 404 si la orden es de otro vendedor.',
        responses: { 200: { description: 'Orden con sus productos', content: json(ref('Order')) }, ...pick(400, 401, 404) },
      },
    },
    '/api/orders/{id}/cancel': {
      parameters: [idParam('de la orden')],
      post: {
        tags: ['Órdenes'],
        operationId: 'cancelOrder',
        summary: 'Cancelar venta',
        description: 'Solo **admin**. Devuelve el stock de cada producto en la misma transacción.',
        responses: { 200: { description: 'Orden cancelada', content: json(ref('Order')) }, ...pick(401, 403, 404), 409: conflict('La orden ya está cancelada') },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token de POST /api/auth/login' },
    },
    responses: {
      ValidationError: {
        description: 'Datos inválidos',
        content: json(ref('ValidationError'), { error: 'Datos inválidos', details: { price: ['Number must be greater than or equal to 0'] } }),
      },
      Unauthorized: { description: 'Falta el token o no es válido', content: json(ref('Error'), { error: 'Token requerido' }) },
      Forbidden: { description: 'El rol no tiene permiso', content: json(ref('Error'), { error: 'No tienes permiso para esta acción' }) },
      NotFound: { description: 'No encontrado', content: json(ref('Error'), { error: 'Producto no encontrado' }) },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      ValidationError: {
        type: 'object',
        properties: { error: { type: 'string' }, details: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } } },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } },
      },
      LoginResponse: { type: 'object', properties: { token: { type: 'string' }, user: ref('User') } },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 2 },
          name: { type: 'string', example: 'Carlos Vendedor' },
          email: { type: 'string', format: 'email', example: 'carlos@inventario.local' },
          role: { type: 'string', enum: ['admin', 'seller'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      UserInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', maxLength: 150 },
          email: { type: 'string', format: 'email', maxLength: 150 },
          password: { type: 'string', format: 'password', minLength: 8, maxLength: 72 },
          role: { type: 'string', enum: ['admin', 'seller'], default: 'seller' },
        },
      },
      Category: {
        type: 'object',
        properties: { id: { type: 'integer', example: 1 }, name: { type: 'string', example: 'Electrónica' }, created_at: { type: 'string', format: 'date-time' } },
      },
      ProductInput: { type: 'object', required: ['sku', 'name', 'price'], properties: productFields },
      ProductPatch: { type: 'object', minProperties: 1, description: 'Al menos un campo', properties: productFields },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          sku: { type: 'string', example: 'ELEC-001' },
          name: { type: 'string', example: 'Mouse inalámbrico' },
          description: { type: 'string', nullable: true },
          price: { type: 'number', example: 249.9 },
          stock: { type: 'integer', example: 30 },
          category_id: { type: 'integer', nullable: true, example: 1 },
          category: { type: 'string', nullable: true, example: 'Electrónica' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      OrderInput: {
        type: 'object',
        required: ['items'],
        properties: {
          customer_name: { type: 'string', nullable: true, maxLength: 150 },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['product_id', 'quantity'],
              properties: { product_id: { type: 'integer', minimum: 1 }, quantity: { type: 'integer', minimum: 1 } },
            },
          },
        },
      },
      OrderSummary: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          user_id: { type: 'integer', example: 2 },
          seller: { type: 'string', example: 'Carlos Vendedor' },
          customer_name: { type: 'string', nullable: true, example: 'Ana López' },
          total: { type: 'number', example: 727.3 },
          status: { type: 'string', enum: ['completed', 'cancelled'] },
          created_at: { type: 'string', format: 'date-time' },
          cancelled_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Order: {
        allOf: [
          ref('OrderSummary'),
          {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    product_id: { type: 'integer', example: 1 },
                    sku: { type: 'string', example: 'ELEC-001' },
                    name: { type: 'string', example: 'Mouse inalámbrico' },
                    quantity: { type: 'integer', example: 2 },
                    unit_price: { type: 'number', description: 'Precio al momento de la venta', example: 249.9 },
                    subtotal: { type: 'number', example: 499.8 },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
};
