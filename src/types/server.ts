import type { Result } from '@typings/routing';
import type { BunRequest, Server } from 'bun';

export type RouteHandler = (request: BunRequest, server: Server<BunRequest>) => Result;

export type MethodHandlers = Record<string, RouteHandler>;

export type Route = RouteHandler | MethodHandlers;
export type RoutesMap = Record<string, Route>;
