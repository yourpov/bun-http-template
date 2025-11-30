import type { BunRequest, Server } from 'bun';
import type { z } from 'zod';

// zod schemas for request validation
export interface Schemas {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

// request with validated data attached
export type ValidatedRequest<S extends Schemas> = BunRequest & ValidatedData<S>;

// handler type changes based on schema
export type TypedRouteHandler<S extends Schemas | undefined> = S extends Schemas
  ? (request: ValidatedRequest<S>, server: Server<BunRequest>) => any
  : (request: BunRequest, server: Server<BunRequest>) => any;

// inference helpers
type InferValidation<S> = S extends z.ZodTypeAny ? z.infer<S> : never;

type ValidatedData<S extends Schemas> = {
  body: InferValidation<S['body']>;
  query: InferValidation<S['query']>;
  headers: InferValidation<S['headers']>;
  params: InferValidation<S['params']>;
};
