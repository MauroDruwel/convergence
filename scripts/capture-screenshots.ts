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

  // Pre-seed some swarm activity, reverse PR, leases, and benchmark data so the UI is rich
  try {
    console.log('Pre-seeding live swarm wave, benchmark, leases & reverse PR...');
    await fetch(`http://localhost:${port}/api/swarm`, { method: 'POST' });
    await fetch(`http://localhost:${port}/api/benchmark`, { method: 'POST' });
    await fetch(`http://localhost:${port}/api/reverse-pr/trigger`, { method: 'POST' });
    await fetch(`http://localhost:${port}/api/leases/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbolId: 'func:processOrder',
        agentId: 'agent_payment',
        leaseType: 'exclusive_write',
        ttlMs: 25000,
        intent: 'Add idempotency key validation',
      }),
    });
    await wait(1000);
  } catch (e) {
    console.warn('Notice during pre-seed:', e);
  }

  const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : '/usr/bin/chromium');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    defaultViewport: {
      width: 1600,
      height: 1100,
      deviceScaleFactor: 2, // 2x Retina resolution
    },
  });

  const page = await browser.newPage();
  console.log(`Navigating to http://localhost:${port}...`);
  await page.goto(`http://localhost:${port}`, { waitUntil: 'networkidle2' });

  // Wait a couple seconds for canvas, tables, and reverse PR to populate
  await wait(2500);

  const assetsDir = path.resolve(process.cwd(), 'assets');

  // 1. Capture Full Dashboard Console (Clean Discoverable State)
  const fullScreenshotPath = path.join(assetsDir, 'dashboard-console.png');
  await page.screenshot({ path: fullScreenshotPath, fullPage: false });
  console.log(`✓ Real high-res screenshot saved: ${fullScreenshotPath}`);

  // 2. Trigger interactive benchmark race in browser so the duel is visualized
  console.log('Running interactive benchmark duel in browser...');
  await page.evaluate(() => (window as any).runBenchmark());
  await wait(2200);

  // 3. Switch to standalone platform view and capture Claude Code swarm multiplexer
  console.log('Switching to standalone platform view...');
  await page.evaluate(() => {
    if (typeof (window as any).setView === 'function') {
      (window as any).setView('platform');
    }
  });
  await wait(1500);

  const platformPath = path.join(assetsDir, 'dashboard-platform.png');
  await page.screenshot({ path: platformPath, fullPage: false });
  console.log(`✓ Real high-res platform screenshot saved: ${platformPath}`);

  // 4. Capture Full Page Document with Duel & Swarm Active
  await page.evaluate(() => {
    if (typeof (window as any).setView === 'function') {
      (window as any).setView('quest');
    }
  });
  await wait(500);
  const fullPagePath = path.join(assetsDir, 'dashboard-full.png');
  await page.screenshot({ path: fullPagePath, fullPage: true });
  console.log(`✓ Full-page document screenshot saved: ${fullPagePath}`);

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
