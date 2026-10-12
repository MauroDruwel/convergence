import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import app from './index.js';
import { RepoBrain } from './durable-objects/RepoBrain.js';

const PORT = Number(process.env.PORT) || 3000;

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log('===============================================================');
    console.log('  ⚡ CONVERGENCE: CONTINUOUS SEMANTIC CODE FABRIC ACTIVE       ');
    console.log(`  🌐 Dashboard URL: http://localhost:${info.port}               `);
    console.log('  📁 Cloudflare Artifacts Repository: convergence-core         ');
    console.log('===============================================================');
  }
);

// Attach WebSocket server for real-time telemetry
const wss = new WebSocketServer({ server: server as any, path: '/ws' });
const sharedBrain = new RepoBrain();

wss.on('connection', (ws) => {
  sharedBrain.registerSocket(ws);
  ws.on('close', () => {
    sharedBrain.unregisterSocket(ws);
  });
});
