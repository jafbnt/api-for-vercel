import type { IncomingMessage, ServerResponse } from 'node:http';

import { buildApp } from '../src/app.js';

let app: ReturnType<typeof buildApp> | null = null;
let appReadyPromise: Promise<unknown> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!app) {
      app = buildApp();
    }

    if (!appReadyPromise) {
      appReadyPromise = app.ready();
    }

    await appReadyPromise;
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Function bootstrap failed:', error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ message: 'Function bootstrap failed. Check env vars and logs.' }));
    }
  }
}
