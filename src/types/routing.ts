import type { BunRequest, Server } from 'bun';

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

export type Result = Response | Promise<Response> | Record<string, unknown> | Promise<Record<string, unknown>>;

// route handler function
export type RouteHandler = (req: BunRequest, server: Server<BunRequest>) => Result;

// middleware: return void/true to continue, false for 403, Response for custom reply
export type MiddlewareResult = void | true | false | Response | Promise<void | true | false | Response>;

export type Middleware = (req: BunRequest, server: Server<BunRequest>) => MiddlewareResult;

export type MiddlewareMap = {
  [M in Method]?: Middleware | Middleware[];
};

export type Event = { [M in Method]?: RouteHandler };

// route interface for event emitter
export interface Route {
  middleware: Middleware[];

  on<M extends keyof Event>(event: M, listener: Event[M]): this;

  run<M extends keyof Event>(event: M, req: BunRequest, server: Server<BunRequest>): HandlerReturn;
}
