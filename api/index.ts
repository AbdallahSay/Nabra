/**
 * Vercel serverless entry: all /api/* requests are rewritten here (see vercel.json)
 * and handled by the shared Express app.
 */
import app from '../server/app.js';

export default app;
