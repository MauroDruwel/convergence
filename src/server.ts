import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import app, { getLocalBrain } from './index.js';

const PORT = Number(process.env.PORT) || 3000;

const server = serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log('\n======================================================================');
    console.log('  ⚡ CONVERGENCE: INTERACTIVE CLOUDFLARE INFRASTRUCTURE CONSOLE');
    console.log('  Built for the Cloudflare Challenge by Mauro Druwel');
    console.log('======================================================================');
    console.log(`\n  👉 Open in your browser: http://localhost:${info.port}`);
    console.log('\n  🎮 5-Level Interactive Engineering Quest:');
    console.log('     • Level 1: What happens when 25 agents commit to 1 file? (diff3 benchmark)');
    console.log('     • Level 2: Code as a Live Tree (Real-time edge radar)');
    console.log('     • Level 3: Edit-Time Symbol Leases (Zero token waste)');
    console.log('     • Level 4: Code Immune System (Autonomous antibody synthesis)');
    console.log('     • Level 5: Reverse Pull Requests (Humans provide steering, not line reviews)');
    console.log('\n  Press Ctrl+C to stop.\n');
  }
);

// Attach WebSocket server for real-time telemetry
const wss = new WebSocketServer({ server: server as any, path: '/ws' });
const sharedBrain = getLocalBrain();

wss.on('connection', (ws) => {
  sharedBrain.registerSocket(ws);
  ws.on('close', () => {
    sharedBrain.unregisterSocket(ws);
  });
});
