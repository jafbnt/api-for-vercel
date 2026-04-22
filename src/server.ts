import { buildApp } from './app.js';
import { env } from './env.js';

const app = buildApp();

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`HTTP server running on port ${env.PORT}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
