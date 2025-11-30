import RouteBuilder from '@structures/RouteBuilder';
import { logger } from '@utils/logger';
import walkDirectory from '@utils/walkDirectory';

import type { MethodHandlers, Route, RoutesMap } from '@typings/server';
import type { BunRequest, Server } from 'bun';

const routesDir = `${import.meta.dirname}/routes`;

const fixPath = (path: string): string => path.replace(/\\/g, '/');

const getEndpoint = (filePath: string): string => {
  const relative = fixPath(filePath)
    .replace(fixPath(routesDir), '')
    .replace(/\.(ts|js)$/i, '')
    .replace(/_/g, ':') // convert _id to :id for params
    .replace(/^\/?/, '/');

  const cleaned = relative.replace(/\/?(index|root)$/i, '') || '/';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
};

// load routes from files
const loadRoutes = async (): Promise<RoutesMap> => {
  // built-in health checks
  const routes: RoutesMap = {
    '/health': () => Response.json({ status: 'ok', ts: Date.now(), uptime: process.uptime() }),
    '/health/ready': () => Response.json({ status: 'ready', ts: Date.now() }),
  };

  const routeFiles = await walkDirectory(routesDir);

  await Promise.all(
    routeFiles.map(async filePath => {
      try {
        const { 'default': builder } = (await import(filePath)) as {
          default: RouteBuilder;
        };

        const endpoint = getEndpoint(filePath);
        routes[endpoint] = builder.build();

        const verbs =
          typeof routes[endpoint] === 'function' ? 'FN' : Object.keys(routes[endpoint] as MethodHandlers).join(', ');

        logger.info(`[${verbs}] ${endpoint}`);
      } catch (error) {
        logger.error(`Failed to load ${filePath}: ${error}`);
      }
    }),
  );

  routes['*'] = () => Response.json({ error: 'Not found' }, { status: 404 });

  return routes;
};

// normalize handler response
const wrapHandler = (handler: Route) => {
  return async (request: BunRequest, server: Server<BunRequest>): Promise<Response> => {
    if (typeof handler === 'function') {
      const result = await handler(request, server);
      return result as Response;
    }

    const methodHandler = handler[request.method.toUpperCase()];
    if (!methodHandler) {
      return Response.json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    const result = await methodHandler(request, server);
    return result as Response;
  };
};

// start the server
export default async (): Promise<void> => {
  const routes = await loadRoutes();
  const bunRoutes: Record<string, (req: BunRequest, server: Server<BunRequest>) => Promise<Response>> = {};

  for (const [path, handler] of Object.entries(routes)) {
    if (path === '*') continue;

    bunRoutes[path] = wrapHandler(handler as Route);
  }

  const server = Bun.serve({
    port: Number(process.env.PORT) || 3000,
    hostname: process.env.HOST || 'localhost',
    routes: bunRoutes,
    fetch: async (request: Request): Promise<Response> => {
      const catchAll = routes['*'] as Route;
      if (typeof catchAll === 'function') {
        const result = await catchAll(request as BunRequest, server);

        return result instanceof Response ? result : Response.json(result);
      }

      return Response.json({ error: 'Not found' }, { status: 404 });
    },

    error(error: Error): Response {
      logger.error(error, 'server error');
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    },
  });

  logger.info(`server listening on http://${server.hostname}:${server.port}`);

  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down`);
    server.stop();
    process.exit(0);
  };

  ['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
};
