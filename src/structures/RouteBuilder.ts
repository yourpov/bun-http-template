import EventEmitter from '@3xpo/events';
import { z } from 'zod';

import type { Method, Middleware, MiddlewareMap, RouteHandler } from '@typings/routing';
import type { Schemas, TypedRouteHandler } from '@typings/schema';
import type { BunRequest, Server } from 'bun';

// event map for type-safe handlers
type Events<S extends Partial<Record<Method, Schemas>>> = {
  [M in Method]: TypedRouteHandler<S[M]>;
};

// converts single values or arrays into arrays
const toArray = <T>(value: T | T[] | undefined): readonly T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const parts = [
  {
    key: 'body' as const,
    name: 'body',
    getData: (req: BunRequest) =>
      req.json().catch(() => {
        throw new Error('Invalid JSON in request body');
      }),
  },
  {
    key: 'query' as const,
    name: 'query',
    getData: (req: BunRequest) => Object.fromEntries(new URL(req.url).searchParams),
  },
  {
    key: 'headers' as const,
    name: 'headers',
    getData: (req: BunRequest) => {
      const headers: Record<string, string> = {};
      req.headers.forEach((value: string, key: string) => (headers[key] = value));
      return headers;
    },
  },
  {
    key: 'params' as const,
    name: 'params',
    getData: (req: BunRequest) => req.params,
  },
];

// route builder with type-safe validation
export default class RouteBuilder<
  S extends Partial<Record<Method, Schemas>> = {},
> extends EventEmitter<Events<S>> {
  private readonly handlers = new Map<Method, (...args: any[]) => any>();
  private readonly schemas = new Map<Method, Schemas>();

  private readonly middlewarePerMethod: Record<Method, readonly Middleware[]> = {
    get: [],
    post: [],
    put: [],
    delete: [],
    patch: [],
    head: [],
    options: [],
  };

  constructor(middlewareMap?: MiddlewareMap) {
    super();
    if (middlewareMap === undefined) return;

    (Object.keys(middlewareMap) as Method[]).forEach(method => {
      this.middlewarePerMethod[method] = toArray(middlewareMap[method]);
    });
  }

  // define validation schemas for a method
  public schema<M extends Method, T extends Schemas>(
    method: M,
    schemaCallback: (zod: typeof z) => T,
  ): RouteBuilder<S & { [K in M]: T }> {
    if (this.schemas.has(method)) throw new Error(`Schemas for ${String(method).toUpperCase()} already defined`);

    this.schemas.set(method, schemaCallback(z));

    const currentMiddleware = this.middlewarePerMethod[method as Method];
    this.middlewarePerMethod[method as Method] = [...currentMiddleware, this._validateSchema(method)];

    return this as unknown as RouteBuilder<S & { [K in M]: T }>;
  }

  // register a handler for a method
  public override on<M extends Method>(method: M, listener: TypedRouteHandler<S[M]>): this {
    if (this.handlers.has(method)) throw new Error(`Handler for ${String(method).toUpperCase()} already defined`);

    this.handlers.set(method, listener);
    return this;
  }

  // internal: validates schema and adds data to request
  private _validateSchema(method: Method): Middleware {
    return async (request: BunRequest) => {
      const schemas = this.schemas.get(method);
      if (schemas === undefined) return undefined;

      try {
        for (const part of parts) {
          const schema = schemas[part.key];
          if (schema === undefined) continue;

          const data = await part.getData(request);
          const result = schema.safeParse(data);

          if (!result.success) {
            return Response.json(
              { error: `validation failed: ${part.name}`, issues: result.error.issues },
              { status: 400 },
            );
          }
          (request as any)[part.key] = result.data;
        }
        return undefined;
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid JSON in request body') {
          return Response.json({ error: error.message }, { status: 400 });
        }
        return Response.json({ error: 'Schema validation error' }, { status: 500 });
      }
    };
  }

  // builds the route table for Bun.serve
  public build(): { [K in Uppercase<string & keyof S>]: RouteHandler } {
    const table = {} as { [K in Uppercase<string & keyof S>]: RouteHandler };

    for (const [method, handler] of this.handlers.entries()) {
      const methodKey = (method as string).toUpperCase();
      const middleware = this.middlewarePerMethod[method as Method];

      table[methodKey as Uppercase<string & keyof S>] = async (
        request: BunRequest,
        server: Server<BunRequest>,
      ) => {
        for (const mw of middleware) {
          const result = await mw(request, server);

          if (result instanceof Response) return result;
          if (result === false) return new Response(null, { status: 403 });
        }

        const result = await handler(request, server);
        return result instanceof Response ? result : Response.json(result);
      };
    }
    return table;
  }
}
