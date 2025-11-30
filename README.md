# bun http template

http server with file-based routing. got tired of setting up the same boilerplate so i made this.

## what's included

- file → route mapping (`routes/users.ts` becomes `/users`)
- zod validation with type inference
- middleware per route or method
- typescript
- logging with pino
- hot reload in dev
- docker setup
- tests

## install

needs [bun](https://bun.sh/) 1.0+

```bash
git clone https://github.com/yourpov/bun-http-template.git
cd bun-http-template
bun install
bun run dev
```

runs on :3000

## example route

```ts
// src/routes/example.ts
import RouteBuilder from '@structures/RouteBuilder';

export default new RouteBuilder()
  .schema('post', (z) => ({
    body: z.object({
      message: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high']).default('medium')
    })
  }))
  .on('post', async (req) => {
    return Response.json({ received: req.body.message, priority: req.body.priority });
  });
```

that's it. file exists = route works.

## commands

```bash
bun run dev        # dev mode
bun run build      # build
bun run start      # prod
bun test           # tests
bun run lint:fix   # fix lint stuff
```

docker:

```bash
bun run docker:build
bun run docker:run
```

## routing

drop a file in `src/routes/` → becomes an endpoint

- `routes/users.ts` → `/users`  
- `routes/posts/_id.ts` → `/posts/:id`

### simple route

```typescript
// routes/users.ts
import RouteBuilder from '@structures/RouteBuilder';

export default new RouteBuilder()
  .on('get', async () => {
    return Response.json({ users: [] });
  });
```

### with validation

```typescript
// routes/users.ts
import RouteBuilder from '@structures/RouteBuilder';

export default new RouteBuilder()
  .schema('post', (z) => ({
    body: z.object({
      name: z.string(),
      email: z.string().email()
    })
  }))
  .on('post', async (req) => {
    // req.body is typed based on schema
    return Response.json({ created: req.body });
  });
```

auto returns 400 if validation fails.

### route params

use underscores for params:

- `users/_id.ts` → `/users/:id`
- `posts/_slug/comments.ts` → `/posts/:slug/comments`

### middleware

```typescript
import RouteBuilder from '@structures/RouteBuilder';

const authCheck = async (req) => {
  // return false = 403
  // return Response = custom response
  // return nothing = continue
  if (!req.headers.get('authorization')) return false;
};

export default new RouteBuilder({ '*': authCheck })
  .on('get', async (req) => {
    return Response.json({ data: 'protected' });
  });
```

## other stuff

### environment

```bash
PORT=3000
LOG_LEVEL=info
```

### tests

```bash
bun test
bun test --watch
```

### before committing

```bash
bun run lint:fix && bun test
```

---

MIT license
