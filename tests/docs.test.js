import { describe, expect, test } from '@jest/globals';
import app from '../src/app.js';
import { api } from './helpers.js';

// Recorre los routers de Express y devuelve cada ruta como "GET /api/products/{id}"
function expressRoutes() {
  const routes = [];
  for (const layer of app._router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) routes.push(`${method.toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === 'router') {
      // El prefijo del router solo está en su regexp, p. ej. /^\/api\/products\/?(?=\/|$)/i
      const prefix = layer.regexp.source.replace('^\\', '').replace('\\/?(?=\\/|$)', '').replaceAll('\\/', '/');
      for (const sub of layer.handle.stack.filter((l) => l.route)) {
        for (const method of Object.keys(sub.route.methods)) {
          const path = (prefix + sub.route.path).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
          routes.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }
  }
  return routes.filter((r) => !r.includes('/docs'));
}

describe('documentación OpenAPI', () => {
  test('/docs.json devuelve una especificación OpenAPI 3', async () => {
    const res = await api().get('/docs.json').expect(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('Inventario API');
  });

  test('/docs sirve la interfaz de Swagger UI sin token', async () => {
    const res = await api().get('/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  test('cada endpoint de Express está documentado y no se documentan rutas inexistentes', async () => {
    const { body: spec } = await api().get('/docs.json');
    const documented = Object.entries(spec.paths).flatMap(([path, ops]) =>
      Object.keys(ops)
        .filter((k) => k !== 'parameters')
        .map((method) => `${method.toUpperCase()} ${path}`)
    );

    const routes = expressRoutes();
    expect(routes).toHaveLength(17);
    expect(documented.sort()).toEqual(routes.sort());
  });

  test('todas las referencias $ref apuntan a componentes que existen', async () => {
    const { body: spec } = await api().get('/docs.json');
    const refs = [...JSON.stringify(spec).matchAll(/"\$ref":"#\/components\/(\w+)\/(\w+)"/g)];
    expect(refs.length).toBeGreaterThan(0);
    for (const [, kind, name] of refs) expect(spec.components[kind]).toHaveProperty(name);
  });
});
