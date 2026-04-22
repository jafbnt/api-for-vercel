import type { IncomingMessage, ServerResponse } from 'node:http';

import { buildApp } from '../src/app.js';

const app = buildApp();
let appReadyPromise: ReturnType<typeof app.ready> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appReadyPromise) {
    appReadyPromise = app.ready();
  }

  await appReadyPromise;
  app.server.emit('request', req, res);
}
