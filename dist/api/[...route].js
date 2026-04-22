import { buildApp } from '../src/app.js';
let app = null;
let appReadyPromise = null;
export default async function handler(req, res) {
    try {
        if (!app) {
            app = buildApp();
        }
        if (!appReadyPromise) {
            appReadyPromise = app.ready();
        }
        await appReadyPromise;
        app.server.emit('request', req, res);
    }
    catch (error) {
        console.error('Function bootstrap failed:', error);
        if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ message: 'Function bootstrap failed. Check env vars and logs.' }));
        }
    }
}
