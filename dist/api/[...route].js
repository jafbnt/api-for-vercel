import { buildApp } from '../src/app.js';
const app = buildApp();
let appReadyPromise = null;
export default async function handler(req, res) {
    if (!appReadyPromise) {
        appReadyPromise = app.ready();
    }
    await appReadyPromise;
    app.server.emit('request', req, res);
}
