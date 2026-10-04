/**
 * Local / self-hosted entry point.
 * - `npm run dev`   → Express API + Vite dev middleware (HMR)
 * - `npm start`     → Express API + static files from dist/ (run `npm run build` first)
 *
 * On Vercel, this file is NOT used: the API is served by api/index.ts and the
 * frontend by Vercel's static hosting.
 */
import path from 'path';
import express from 'express';
import app from './server/app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

async function startServer() {
  if (!isProd) {
    // Imported lazily so production never needs Vite at runtime
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
