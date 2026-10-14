// =====================================================================
// CONVERGENCE CLIENT STATE & SHARED UTILITIES
// =====================================================================
let ws = null;
let cleanMerges = 0;
let lastSeenSource = "";
const completedLevels = new Set();
let activeLevelView = 0;
let isDeepDiveOpen = true; // Open by default per user specification

// ---------------------------------------------------------------------
// SESSION PERSISTENCE: tutorial progress + platform unlock.
// Once the 5-stage quest is completed, the Convergence Platform stays
// unlocked for the rest of the browser session (sessionStorage survives
// reloads in the same tab, and clears when the session ends).
// ---------------------------------------------------------------------
const QUEST_STORE_LEVELS = 'conv_quest_levels_v1';
const QUEST_STORE_UNLOCK = 'conv_platform_unlocked_v1';

function questStoreAvailable() {
  try {
    return typeof sessionStorage !== 'undefined';
  } catch (e) {
    return false;
  }
}

function isPlatformUnlocked() {
  if (completedLevels.size >= 5) return true;
  try {
    return questStoreAvailable() && sessionStorage.getItem(QUEST_STORE_UNLOCK) === '1';
  } catch (e) {
    return false;
  }
}

function persistQuestProgress() {
  try {
    if (!questStoreAvailable()) return;
    sessionStorage.setItem(QUEST_STORE_LEVELS, JSON.stringify(Array.from(completedLevels)));
    if (completedLevels.size >= 5) sessionStorage.setItem(QUEST_STORE_UNLOCK, '1');
  } catch (e) {}
}

let questProgressRestored = false;
function restoreQuestProgressOnce() {
  if (questProgressRestored) return;
  questProgressRestored = true;
  try {
    if (!questStoreAvailable()) return;
    const raw = sessionStorage.getItem(QUEST_STORE_LEVELS);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      arr.forEach((l) => {
        const n = Number(l);
        if (n >= 1 && n <= 5) completedLevels.add(n);
      });
    }
  } catch (e) {}
}

function syncQuestProgressUI() {
  try {
    const count = completedLevels.size;
    const cc = document.getElementById('quest-completed-count');
    if (cc) cc.innerText = count;
    const pbar = document.getElementById('quest-progress-bar');
    if (pbar) pbar.style.width = `${(count / 5) * 100}%`;
    for (let l = 1; l <= 5; l++) {
      const seg = document.getElementById(`quest-seg-${l}`);
      if (seg && completedLevels.has(l)) seg.className = 'h-1.5 rounded-xs bg-[#F6821F] transition-all';
    }
    if (count >= 5) {
      const badge = document.getElementById('quest-badge');
      if (badge) badge.className = 'px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold';
      const hint = document.getElementById('quest-next-hint');
      if (hint) hint.innerHTML = '<strong class="text-emerald-400">ALL 5/5 VERIFIED · PLATFORM READY</strong>';
    }
  } catch (e) {}
}
let currentChapterKey = "welcome";
let currentChapterStep = 0;
let isShowingPayoff = false;
let payoffLevel = null;
let isGuideMinimized = false;
let openPFiles = ["README.md", "index.ts", "docs/ARCHITECTURE.md"];
let selectedPFile = "README.md";
let lastPSig = "";
let isEditingCode = false;
let novaSpeakTimer = null;

const DEMO_SAFE = new URLSearchParams(window.location.search).has("safe");
window.__e2e = new URLSearchParams(window.location.search).has("e2e");
if (!window.__e2e) document.body.classList.add("nova-mode");
else document.body.classList.add("e2e-mode");

const CANNED_BENCH = { gitSuccessRate: 4, gitConflicts: 24, totalAgentCommits: 25, gitBlockedAgents: 24, gitAvgMergeLatencyMs: 1, convergenceSuccessRate: 100, convergenceCleanMerges: 25, convergenceArbitratedMerges: 0, convergenceConflicts: 0, convergenceBlockedAgents: 0, convergenceAvgMergeLatencyMs: 10, conflictReduction: "100% eliminated", concurrencyThroughputGain: "25x higher success" };

    const SEED_SNAPSHOT = `// Core Commerce API // Edge-native payment processing (Convergence mainline)
import { createId, createHmac } from 'crypto';

export interface PaymentConfig {
  currency: string;
  merchantId: string;
  sandbox: boolean;
}

export type TransactionStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface Transaction {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  idempotencyKey?: string;
}

export const CONFIG: PaymentConfig = {
  currency: 'USD',
  merchantId: 'merch_cf_2026',
  sandbox: true,
};

export const LEDGER: Record<string, Transaction> = {};

export function validateAmount(amount: number): { valid: boolean; reason: string } {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return { valid: false, reason: 'not-a-finite-number' };
  if (amount <= 0) return { valid: false, reason: 'must-be-positive' };
  if (amount > 1000000) return { valid: false, reason: 'exceeds-maximum' };
  return { valid: true, reason: 'ok' };
}

export function authorizePayment(orderId: string, amount: number, idempotencyKey?: string): Transaction | null {
  const check = validateAmount(amount);
  if (!check.valid) return null;
  const tx: Transaction = { id: createId(), orderId, amount, currency: CONFIG.currency, status: 'authorized' };
  if (idempotencyKey) tx.idempotencyKey = idempotencyKey;
  LEDGER[tx.id] = tx;
  return tx;
}

export function capturePayment(txId: string): boolean {
  const tx = LEDGER[txId];
  if (!tx || tx.status !== 'authorized') return false;
  tx.status = 'captured';
  return true;
}

export function refundPayment(txId: string, amount?: number): boolean {
  const tx = LEDGER[txId];
  if (!tx || (tx.status !== 'captured' && tx.status !== 'authorized')) return false;
  const value = amount ?? tx.amount;
  if (value <= 0 || value > tx.amount) return false;
  tx.status = 'refunded';
  return true;
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

export function processOrder(orderId: string, amount: number): boolean {
  console.log(\`Processing order \${orderId} for $\${amount}\`);
  return amount > 0;
}
`;


function escapeHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
window.escapeHtml = escapeHtml;

function pulseNovaSpeaking() {
  const eq = document.getElementById("nova-voice-eq");
  const mainBox = document.getElementById("guide-main");
  if (eq) eq.classList.add("nova-eq-active");
  if (mainBox) {
    mainBox.classList.remove("border-[#F6821F]/40");
    void mainBox.offsetWidth;
    mainBox.classList.add("border-[#F6821F]/40");
  }
  if (novaSpeakTimer) clearTimeout(novaSpeakTimer);
  novaSpeakTimer = setTimeout(() => {
    if (eq) eq.classList.remove("nova-eq-active");
    if (mainBox) mainBox.classList.remove("border-[#F6821F]/40");
  }, 1200);
}
window.pulseNovaSpeaking = pulseNovaSpeaking;

async function ensureSeedSnapshot() {
  try { if (lastSeenSource) return; } catch (e) {}
  let src = "";
  try {
    const r = await _origFetch("/api/state");
    if (r.ok) { const d = await r.json(); if (d.files && d.files["index.ts"]) src = d.files["index.ts"]; }
  } catch (e) {}
  if (!src) src = SEED_SNAPSHOT;
  try { lastSeenSource = src; } catch (e) {}
  const viewer = document.getElementById("code-viewer");
  if (viewer && (!viewer.innerText || viewer.innerText.startsWith("// Loading"))) viewer.innerText = src;
}

const _origFetch = window.fetch.bind(window);
async function safeFetch(url, opts) {
  const isApi = typeof url === "string" && url.includes("/api/");
  if (!DEMO_SAFE || !isApi) return _origFetch(url, opts);
  await new Promise((r) => setTimeout(r, 320));
  const json = async (v) => v;
  if (url.includes("/api/benchmark")) return { ok: true, json: () => json(CANNED_BENCH) };
  if (url.includes("/api/swarm")) return { ok: true, json: () => json({ success: true, waveId: "demo", resultsCount: 8 }) };
  if (url.includes("/api/leases/request")) return { ok: true, json: () => json({ granted: true, lease: { symbolId: "func:processOrder" } }) };
  if (url.includes("/api/immune-attack")) return { ok: true, json: () => json({ success: true }) };
  if (url.includes("/api/reverse-pr/trigger")) return { ok: true, json: () => json({ success: true, pr: { id: "rpr_demo", agentId: "agent_architect" } }) };
  if (url.includes("/api/reverse-pr/resolve") || url.includes("/api/revert")) return { ok: true, json: () => json({ success: true }) };
  if (url.includes("/api/state")) throw new Error("SAFE mode");
  return _origFetch(url, opts);
}
window.fetch = async (url, opts) => {
  if (DEMO_SAFE && typeof url === "string" && url.includes("/api/")) return safeFetch(url, opts);
  return _origFetch(url, opts);
};

function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  const borderColors = {
    success: "border-emerald-500/40 bg-zinc-950 text-zinc-100",
    warning: "border-amber-500/40 bg-zinc-950 text-zinc-100",
    info: "border-zinc-700 bg-zinc-950 text-zinc-100"
  };
  toast.className = `p-3.5 rounded-lg border ${borderColors[type] || borderColors.info} flex items-start space-x-2.5 slide-down-fade pointer-events-auto transition-all shadow-xl`;
  toast.innerHTML = `
    <div class="flex-1 min-w-0">
      <div class="font-mono font-bold text-xs flex items-center space-x-1.5 text-white">
        <span class="${type === "success" ? "text-emerald-400" : type === "warning" ? "text-amber-400" : "text-[#F6821F]"}">●</span>
        <span>${title}</span>
      </div>
      <div class="text-[11px] text-zinc-400 mt-1 leading-snug">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 400);
  }, 4200);
}
window.showToast = showToast;

function scrollToEl(id) {
  try { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
}
window.scrollToEl = scrollToEl;

const GUIDE = {
  mid: {
    1: "Executing live: watch each agent commit evaluate. Agent 1 succeeds in both, then watch what happens to Engine A from Agent 2 onward!",
    2: "8 agents streaming AST symbols into the single-threaded Durable Object. Watch the Lamport clock sequence every landing.",
    3: "T+0ms: agent_security locks func:processOrder. Watch what happens in 600ms when agent_fraud requests the same symbol...",
    4: "Commit pushed into the pre-merge Worker sandbox. Fuzzer is probing transferFunds(-99999) right now...",
    5: "Escalation triggered! Select one of the 3 architectural options in the card above to steer the swarm."
  }
};
const OBJECTIVE = {
  1: "Execute the 25-agent concurrency test (Engine A vs Engine B)",
  2: "Dispatch 8 specialist agents into the Durable Object sequencer",
  3: "Simulate a same-symbol race on func:processOrder",
  4: "Push an unvalidated commit into the pre-merge immune sandbox",
  5: "Trigger & resolve an architectural Reverse PR escalation"
};

let canvas = null;
let ctx = null;

function getSwarmCanvas() {
  if (!canvas) canvas = document.getElementById('swarm-canvas');
  if (canvas && !ctx) ctx = canvas.getContext('2d');
  return canvas;
}

const agents = [
  { name: 'agent_sentinel', angle: 0, speed: 0.015, color: '#F6821F', active: false },
  { name: 'agent_payment', angle: Math.PI / 4, speed: 0.02, color: '#10B981', active: false },
  { name: 'agent_auth', angle: Math.PI / 2, speed: 0.012, color: '#38BDF8', active: false },
  { name: 'agent_fuzzer', angle: (3 * Math.PI) / 4, speed: 0.025, color: '#EC4899', active: false },
  { name: 'agent_optimizer', angle: Math.PI, speed: 0.018, color: '#A855F7', active: false },
  { name: 'agent_auditor', angle: (5 * Math.PI) / 4, speed: 0.014, color: '#F59E0B', active: false },
  { name: 'agent_reconciler', angle: (3 * Math.PI) / 2, speed: 0.022, color: '#06B6D4', active: false },
  { name: 'agent_architect', angle: (7 * Math.PI) / 4, speed: 0.017, color: '#6366F1', active: false },
];

let radarSweepAngle = 0;
const ripples = [];
const particles = [];

function triggerRipple(color = '#F6821F') {
  ripples.push({ r: 14, maxR: 85, alpha: 1, color });
}

function fireBeamToCenter(fromX, fromY, color = '#F6821F') {
  particles.push({ fromX, fromY, progress: 0, speed: 0.09, color });
}

function resizeCanvas() {
  const c = getSwarmCanvas();
  if (c && c.parentElement) {
    const rect = c.parentElement.getBoundingClientRect();
    c.width = rect.width || 800;
    c.height = rect.height || 300;
  }
}
window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
});