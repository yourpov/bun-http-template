import { logger } from '@utils/logger';

import type { BunRequest, Server } from 'bun';

export default async (request: BunRequest, server: Server<BunRequest>): Promise<boolean> => {
  const { method, url } = request;
  const { pathname, search } = new URL(url);
  const ip = server.requestIP(request)?.address || 'unknown';

  logger.info(`${ip} ${method} ${pathname}${search}`);
  return true;
};
