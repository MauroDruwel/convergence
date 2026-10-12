import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function isServerRunning(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/state`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function main() {
  console.log('Capturing real screenshots from headless Chromium...');
  const port = 3000;
  let serverProcess: any = null;

  // Check if server is already running, else start it
  const alreadyRunning = await isServerRunning(port);
  if (!alreadyRunning) {
    console.log(`Starting background server on port ${port}...`);
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      env: { ...process.env, PORT: String(port) },
      stdio: 'pipe',
    });
    // Wait for server to boot
    for (let i = 0; i < 20; i++) {
      await wait(500);
      if (await isServerRunning(port)) break;
    }
  }

  // Pre-seed some swarm activity and benchmark data so the UI is rich
  try {
    console.log('Pre-seeding live swarm wave & benchmark data...');
    await fetch(`http://localhost:${port}/api/swarm`, { method: 'POST' });
    await fetch(`http://localhost:${port}/api/benchmark`, { method: 'POST' });
    await fetch(`http://localhost:${port}/api/leases/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbolId: 'func:processOrder',
        agentId: 'agent_payment',
        leaseType: 'exclusive_write',
        ttlMs: 20000,
        intent: 'Add idempotency key validation',
      }),
    });
    await wait(1000);
  } catch (e) {
    console.warn('Notice during pre-seed:', e);
  }

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    defaultViewport: {
      width: 1600,
      height: 1080,
      deviceScaleFactor: 2, // 2x Retina resolution
    },
  });

  const page = await browser.newPage();
  console.log(`Navigating to http://localhost:${port}...`);
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2' });

  // Wait a couple seconds for canvas and tables to populate
  await wait(2500);

  const assetsDir = path.resolve(process.cwd(), 'assets');

  // 1. Capture Full Dashboard Console
  const fullScreenshotPath = path.join(assetsDir, 'dashboard-console.png');
  await page.screenshot({ path: fullScreenshotPath, fullPage: false });
  console.log(`✓ Real high-res screenshot saved: ${fullScreenshotPath}`);

  await browser.close();

  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('Screenshots successfully generated!');
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
