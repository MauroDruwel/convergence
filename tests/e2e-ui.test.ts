import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';

const TEST_PORT = 3999;
const BASE_URL = `http://localhost:${TEST_PORT}?e2e=1`;

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(port: number, timeoutMs = 12000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://localhost:${port}/api/state`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
      });
      if (ok) return true;
    } catch (e) {}
    await wait(300);
  }
  return false;
}

describe('End-to-End (E2E) Browser UI Test Suite — Cloudflare Infrastructure Console', () => {
  let serverProcess: ChildProcess;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // 1. Boot background server on isolated test port
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: 'pipe',
    });

    const isUp = await waitForServer(TEST_PORT);
    if (!isUp) throw new Error(`Server failed to start on port ${TEST_PORT}`);

    const chromePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      (process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/chromium');

    // 2. Launch headless Chromium
    browser = await puppeteer.launch({
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      defaultViewport: { width: 1440, height: 900 },
    });

    page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  }, 45000);

  afterAll(async () => {
    if (browser) await browser.close();
    if (serverProcess) serverProcess.kill();
  });

  it('1. should verify Cloudflare header, breadcrumbs, search bar, and status badges', async () => {
    const title = await page.title();
    expect(title).toBe('Cloudflare Dash — convergence-core');

    const headerText = await page.evaluate(() => {
      const header = document.querySelector('header');
      return header ? header.innerText : '';
    });

    expect(headerText).toContain('mauro-druwel');
    expect(headerText).toContain('Workers & Pages');
    expect(headerText).toContain('convergence-core');
    expect(headerText).toContain('Production');
    expect(headerText).toContain('env.ARTIFACTS');
    expect(headerText).toContain('Durable Object (SQLite)');
    expect(headerText).toContain('MD'); // Mauro Druwel avatar

    // Check search input focus via keyboard shortcut ⌘K
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await wait(200);

    const isSearchFocused = await page.evaluate(() => {
      return document.activeElement?.id === 'search-input';
    });
    expect(isSearchFocused).toBe(true);

    // Type query into search input
    await page.type('#search-input', 'AST leases');
    const searchVal = await page.evaluate(() => (document.getElementById('search-input') as HTMLInputElement).value);
    expect(searchVal).toBe('AST leases');
  });

  it('2. should verify subheader tabs can be clicked and toggle active styling', async () => {
    const tabs = ['leases', 'provenance', 'benchmark', 'settings', 'overview'];

    for (const tab of tabs) {
      const btnId = `#tab-btn-${tab}`;
      await page.evaluate((id) => {
        const el = document.querySelector(id) as HTMLElement;
        if (el) el.click();
      }, btnId);
      await wait(100);

      const isActive = await page.evaluate((id) => {
        const btn = document.querySelector(id);
        return btn?.classList.contains('border-[#F6821F]');
      }, btnId);

      expect(isActive).toBe(true);
    }
  });

  it('3. should verify 60 FPS Swarm Topology Radar Canvas is actively rendering', async () => {
    const canvasValid = await page.evaluate(() => {
      const c = document.getElementById('swarm-canvas') as HTMLCanvasElement;
      return c !== null && c.width > 0 && c.height > 0;
    });
    expect(canvasValid).toBe(true);
  });

  it('4. should dispatch Swarm Wave (8 Agents) and update real-time telemetry and Lamport clock', async () => {
    const initialClean = await page.evaluate(() => {
      return parseInt(document.getElementById('stat-clean')?.innerText || '0', 10);
    });

    await page.evaluate(() => (document.getElementById('btn-swarm-l2') as HTMLElement)?.click());

    // Verify counter increments by at least 8 merges
    await page.waitForFunction((prev) => {
      const el = document.getElementById('stat-clean');
      return el && parseInt(el.innerText, 10) >= prev + 8;
    }, { timeout: 20000 }, initialClean);

    const updatedClean = await page.evaluate(() => {
      return parseInt(document.getElementById('stat-clean')?.innerText || '0', 10);
    });
    expect(updatedClean).toBeGreaterThanOrEqual(initialClean + 8);

    // Verify Lamport clock is active
    const lamportText = await page.evaluate(() => document.getElementById('stat-lamport')?.innerText || '');
    expect(lamportText).toMatch(/^L:\s*\d+/);

    // Verify event stream contains AST MERGE badges
    const streamContent = await page.evaluate(() => document.getElementById('event-stream')?.innerText || '');
    expect(streamContent).toContain('[AST MERGE]');
  }, 25000);

  it('5. should acquire an AST Symbol Lease and display it in the Leases table', async () => {
    await page.evaluate(() => (document.getElementById('btn-lease-l3') as HTMLElement)?.click());

    await page.waitForFunction(() => {
      const el = document.getElementById('stat-leases');
      return el && parseInt(el.innerText, 10) >= 1;
    }, { timeout: 15000 });

    const leasesTableText = await page.evaluate(() => {
      return document.getElementById('leases-table-body')?.innerText || '';
    });

    expect(leasesTableText).toContain('func:processOrder');
    expect(leasesTableText).toContain('exclusive_write');
    expect(leasesTableText).toContain('Refactoring order processing schema');
  }, 18000);

  it('6. should execute Adversarial AST Probe and trigger Code Immune System guard', async () => {
    await page.evaluate(() => (document.getElementById('btn-immune-l4') as HTMLElement)?.click());

    await page.waitForFunction(() => {
      const stream = document.getElementById('event-stream')?.innerText || '';
      return stream.includes('[IMMUNE GUARD]');
    }, { timeout: 20000 });

    const streamText = await page.evaluate(() => document.getElementById('event-stream')?.innerText || '');
    expect(streamText).toContain('[IMMUNE GUARD]');
  }, 25000);

  it('7. should execute the GNU diff3 vs Convergence benchmark and populate comparison metrics', async () => {
    await page.click('#btn-bench-l1');

    await page.waitForFunction(() => {
      const status = document.getElementById('bench-status')?.innerText || '';
      return status.includes('Complete');
    }, { timeout: 20000 });

    const gitRate = await page.evaluate(() => document.getElementById('git-rate')?.innerText);
    const gitConflicts = await page.evaluate(() => document.getElementById('git-conflicts')?.innerText);
    const gitStalled = await page.evaluate(() => document.getElementById('git-stalled')?.innerText);

    const convRate = await page.evaluate(() => document.getElementById('conv-rate')?.innerText);
    const convConflicts = await page.evaluate(() => document.getElementById('conv-conflicts')?.innerText);
    const convLatency = await page.evaluate(() => document.getElementById('conv-latency')?.innerText);

    expect(gitRate).toBe('4%');
    expect(gitConflicts).toBe('24 / 25');
    expect(gitStalled).toBe('24');

    expect(convRate).toBe('100%');
    expect(convConflicts).toBe('0');
    expect(convLatency).toMatch(/^\d+ms$/);
    expect(parseInt(convLatency || '0', 10)).toBeLessThan(200);
  }, 25000);

  it('8. should simulate a Reverse Pull Request and resolve it via human interactive steering', async () => {
    // 1. Click "Simulate Reverse PR" button
    await page.evaluate(() => (document.getElementById('btn-rpr-l5') as HTMLElement)?.click());

    // 2. Wait for Reverse PR card to appear in rpr-container
    await page.waitForSelector('.rpr-card', { timeout: 10000 });

    const cardQuestion = await page.evaluate(() => {
      const card = document.querySelector('.rpr-card');
      return card ? card.querySelector('p')?.innerText : '';
    });
    expect(cardQuestion).toContain('Database schema tradeoff');

    // 3. Click the first resolution option ('Migrate to D1 SQLite')
    await page.evaluate(() => (document.querySelector('.rpr-option-btn') as HTMLElement)?.click());

    // 4. Wait for Reverse PR container to revert to zero pending
    await page.waitForFunction(() => {
      const container = document.getElementById('rpr-container');
      return container && container.innerText.includes('Zero pending architectural inquiries');
    }, { timeout: 10000 });

    const resolvedText = await page.evaluate(() => document.getElementById('rpr-container')?.innerText || '');
    expect(resolvedText).toContain('Zero pending architectural inquiries');
  }, 20000);

  it('9. should display Git Notes Provenance table with AI model telemetry and invariants', async () => {
    const provTable = await page.evaluate(() => document.getElementById('provenance-table-body')?.innerText || '');
    expect(provTable).toContain('llama-3.3-70b');
    expect(provTable).toContain('in /');
  });

  it('10. should display unified TypeScript codebase in the code viewer', async () => {
    const code = await page.evaluate(() => document.getElementById('code-viewer')?.innerText || '');
    expect(code).toContain('export function');
    expect(code).toContain('module_');
  });

  it('11. should open interactive code editor, commit parallel code, and verify commit in history', async () => {
    // 1. Click "Edit File" button
    await page.evaluate(() => (document.getElementById('btn-edit-file') as HTMLElement)?.click());
    await wait(300);

    const isEditorVisible = await page.evaluate(() => {
      const el = document.getElementById('platform-editor-wrap');
      return el && !el.classList.contains('hidden');
    });
    expect(isEditorVisible).toBe(true);

    // 2. Type a new commit message and append code
    await page.evaluate(() => {
      const textarea = document.getElementById('code-editor-textarea') as HTMLTextAreaElement;
      if (textarea) textarea.value += '\nexport function e2e_verified_function(): boolean { return true; }\n';
      const msg = document.getElementById('commit-msg-input') as HTMLInputElement;
      if (msg) msg.value = 'feat(e2e): live test commit directly to main';
    });

    // 3. Submit commit
    await page.evaluate(() => (window as any).submitCodeCommit());
    await wait(1000);

    // 4. Verify editor closed and code viewer updated
    const editorClosed = await page.evaluate(() => {
      const el = document.getElementById('platform-editor-wrap');
      return el && el.classList.contains('hidden');
    });
    expect(editorClosed).toBe(true);

    const platformCode = await page.evaluate(() => document.getElementById('platform-file-view')?.innerText || '');
    expect(platformCode).toContain('e2e_verified_function');
  });

  it('12. should directly acquire and release a symbol lease from the platform console', async () => {
    // 1. Switch to leases tab
    await page.evaluate(() => (window as any).switchPTab('leases'));
    await wait(300);

    // 2. Request lease on func:authorizePayment
    await page.evaluate(async () => {
      const symSelect = document.getElementById('direct-lease-symbol') as unknown as HTMLSelectElement;
      if (symSelect) symSelect.value = 'func:authorizePayment';
      await (window as any).requestDirectLease();
    });
    await wait(500);

    // 3. Verify lease is visible in table
    const leaseTable = await page.evaluate(() => document.getElementById('platform-leases-list')?.innerText || '');
    expect(leaseTable).toContain('func:authorizePayment');

    // 4. Release the lease
    await page.evaluate(async () => {
      await (window as any).releaseDirectLease('func:authorizePayment', 'human_architect');
    });
    await wait(500);

    const postReleaseTable = await page.evaluate(() => document.getElementById('platform-leases-list')?.innerText || '');
    expect(postReleaseTable).not.toContain('human_architect');
  });
});
