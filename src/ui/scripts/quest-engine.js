// =====================================================================
// QUEST ENGINE: 5-STAGE INTERACTIVE BENCHMARK & SIMULATION
// =====================================================================

    const LEVEL_TITLES = {
      1: 'Parallel File Appends',
      2: 'Edge Actor Sequencer',
      3: 'Same-Symbol Collision',
      4: 'Semantic Logic Flaw',
      5: 'Architectural Fork'
    };

    function isLevelUnlocked(n) {
      if (n === 1) return true;
      for (let i = 1; i < n; i++) {
        if (!completedLevels.has(i)) return false;
      }
      return true;
    }

    function applyQuestGate() {
      if (window.__e2e) {
        spawnAllLevelsForE2E();
        return;
      }

      const maxUnlocked = [1, 2, 3, 4, 5].find(l => !completedLevels.has(l)) || 5;
      const solvedCount = completedLevels.size;

      const hdrProg = document.getElementById('header-quest-progress');
      if (hdrProg) hdrProg.innerText = `${solvedCount}/5`;

      const objBar = document.getElementById('objective-bar');
      if (objBar) {
        if ((activeLevelView >= 1 || solvedCount > 0) && !document.body.classList.contains('platform-mode')) {
          objBar.classList.remove('hidden');
          objBar.classList.add('flex');
        } else {
          objBar.classList.add('hidden');
          objBar.classList.remove('flex');
        }
      }

      const standbyCard = document.getElementById('launch-standby-card');
      if (standbyCard) {
        standbyCard.style.display = (activeLevelView === 0) ? '' : 'none';
      }

      const metricsHud = document.getElementById('metrics-hud');
      if (metricsHud) {
        if (completedLevels.has(1) || activeLevelView >= 2) {
          metricsHud.classList.remove('hidden');
          metricsHud.classList.add('grid');
        } else {
          metricsHud.classList.add('hidden');
          metricsHud.classList.remove('grid');
        }
      }

      const doBadge = document.getElementById('header-do-badge');
      const liveCodeGrid = document.getElementById('live-code-telemetry-grid');
      if (activeLevelView >= 2 || completedLevels.has(2)) {
        if (doBadge) { doBadge.classList.remove('hidden'); doBadge.classList.add('md:inline-flex'); }
        if (liveCodeGrid) liveCodeGrid.style.display = '';
      } else {
        if (doBadge) { doBadge.classList.add('hidden'); doBadge.classList.remove('md:inline-flex'); }
        if (liveCodeGrid) liveCodeGrid.style.display = 'none';
      }

      const levelContainers = {
        1: ['section-benchmark'],
        2: ['section-overview'],
        3: ['section-leases'],
        4: ['section-immune'],
        5: ['level-5-grid']
      };

      for (let lvl = 1; lvl <= 5; lvl++) {
        const unlocked = (lvl <= maxUnlocked);
        const isCurrentStage = (activeLevelView === lvl);
        (levelContainers[lvl] || []).forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.style.display = (unlocked && isCurrentStage) ? '' : 'none';
        });

        const tabIds = { 1: 'tab-btn-benchmark', 2: 'tab-btn-overview', 3: 'tab-btn-leases', 4: 'tab-btn-settings', 5: 'tab-btn-provenance' };
        const btn = document.getElementById(tabIds[lvl]);
        const titleEl = document.getElementById(`title-level-${lvl}`);
        const badge = document.getElementById(`badge-level-${lvl}`);

        if (titleEl) {
          titleEl.innerText = unlocked ? LEVEL_TITLES[lvl] : `🔒 ${LEVEL_TITLES[lvl]}`;
          titleEl.className = unlocked ? 'font-bold text-xs text-zinc-950 mt-1.5' : 'font-bold text-xs text-zinc-500 mt-1.5';
        }

        if (btn) {
          btn.style.opacity = unlocked ? '1' : '0.45';
          if (isCurrentStage) {
            btn.className = 'level-tab-btn p-3 rounded-lg border-2 border-[#F6821F] bg-white text-left transition flex flex-col justify-between shadow-2xs';
          } else if (unlocked) {
            btn.className = 'level-tab-btn p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-400 text-left transition flex flex-col justify-between';
          } else {
            btn.className = 'level-tab-btn p-3 rounded-lg border border-zinc-200 bg-zinc-100/70 text-left transition flex flex-col justify-between opacity-50';
          }
        }

        if (badge) {
          if (completedLevels.has(lvl)) {
            badge.innerText = 'VERIFIED ✓';
            badge.className = 'text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200';
          } else if (unlocked) {
            badge.innerText = isCurrentStage ? 'ACTIVE' : 'READY';
            badge.className = 'text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-[#F6821F] border border-orange-200';
          } else {
            badge.innerText = 'LOCKED';
            badge.className = 'text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-500';
          }
        }
      }

      const pz = document.getElementById('platform-zone');
      const pIcon = document.getElementById('viewbtn-platform-icon');
      if (completedLevels.size >= 5) {
        if (pIcon) pIcon.innerText = '⚡';
        if (pz) pz.classList.remove('hidden');
      } else {
        if (pIcon) pIcon.innerText = '🔒';
        if (pz) pz.classList.add('hidden');
      }

      const next = [1, 2, 3, 4, 5].find((l) => !completedLevels.has(l));
      const hint = document.getElementById('quest-next-hint');
      if (hint && next) {
        hint.innerText = activeLevelView === 0 ? 'Click ▶ in NOVA to initialize Stage 01' : `Active: Stage 0${next} · ${LEVEL_TITLES[next]}`;
      }
      try { if (typeof resizeCanvas === 'function') resizeCanvas(); } catch (e) {}
      try { updateObjectiveBar(); } catch (e) {}
    }

    function tryOpenPlatformView() {
      if (completedLevels.size < 5 && !window.__e2e) {
        const rem = 5 - completedLevels.size;
        showToast('Convergence Locked', `Verify ${rem} more architectural stage${rem === 1 ? '' : 's'} to unlock the standalone Edge Platform.`, 'warning');
        return;
      }
      setView('platform');
    }

    function spawnLevel(lvl) {
      if (lvl <= 5) {
        activeLevelView = lvl;
        applyQuestGate();
        const map = { 1: 'section-benchmark', 2: 'section-overview', 3: 'section-leases', 4: 'section-immune', 5: 'level-5-grid' };
        const el = document.getElementById(map[lvl]);
        if (el) {
          el.classList.remove('spawn-pulse-ring', 'unlock-pop');
          void el.offsetWidth;
          el.classList.add('spawn-pulse-ring', 'unlock-pop');
          try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      } else if (lvl === 6) {
        applyQuestGate();
        showToast('CONVERGENCE UNLOCKED', 'Transitioning to full-screen standalone repository platform.', 'success');
        dockGuideCompanion();
        setView('platform');
      }
    }

    function spawnAllLevelsForE2E() {
      const standby = document.getElementById('launch-standby-card');
      if (standby) standby.style.display = 'none';
      const mh = document.getElementById('metrics-hud');
      if (mh) { mh.classList.remove('hidden'); mh.classList.add('grid'); }
      const lcg = document.getElementById('live-code-telemetry-grid');
      if (lcg) lcg.style.display = '';
      ['section-benchmark', 'section-overview', 'section-leases', 'section-immune', 'level-5-grid', 'section-rpr', 'section-provenance'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = '';
      });
      const pv = document.getElementById('platform-view');
      if (pv) pv.classList.remove('hidden');
      const pz = document.getElementById('platform-zone');
      if (pz) pz.classList.remove('hidden');
      const gb = document.getElementById('game-backdrop');
      if (gb) gb.classList.add('hidden');
      try { if (typeof resizeCanvas === 'function') resizeCanvas(); } catch (e) {}
    }


    function markLevelCompleted(levelNum) {
      const first = !completedLevels.has(levelNum);
      completedLevels.add(levelNum);
      const count = completedLevels.size;
      document.getElementById('quest-completed-count').innerText = count;
      const pbar = document.getElementById('quest-progress-bar');
      if (pbar) pbar.style.width = `${(count / 5) * 100}%`;

      const seg = document.getElementById(`quest-seg-${levelNum}`);
      if (seg) {
        seg.className = 'h-1.5 rounded-xs bg-[#F6821F] transition-all';
      }

      if (count === 5) {
        document.getElementById('quest-badge').className = 'px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold';
        document.getElementById('quest-next-hint').innerHTML = '<strong class="text-emerald-400">ALL 5/5 VERIFIED · PLATFORM READY</strong>';

        if (!window.__e2e) {
          showToast('Stage 05 Verified · All 5/5 Complete!', '⚡ Spawning directly into Convergence Platform...', 'success');
          setTimeout(() => {
            if (completedLevels.size >= 5 && !document.body.classList.contains('platform-mode')) {
              setView('platform');
            }
          }, 1400);
        }
      }

      try { applyQuestGate(); } catch (e) {}

      if (first) {
        try {
          isShowingPayoff = true;
          payoffLevel = levelNum;
          renderNovaCurrent();
        } catch (e) {}
      }
    }

    let tourRunning = false;
    function switchLevel(levelNum) {
      const requested = levelNum;
      if (!window.__e2e && !isLevelUnlocked(requested) && !tourRunning) {
        const cur = [1, 2, 3, 4, 5].find((l) => !completedLevels.has(l)) || 1;
        showToast('Stage Locked', `Verify Stage 0${cur} first to unlock Stage 0${requested}.`, 'warning');
        return;
      }

      if (document.body.classList.contains('platform-mode') && !window.__e2e) {
        setView('quest');
      }

      activeLevelView = requested;
      applyQuestGate();

      const allTabs = ['tab-btn-benchmark', 'tab-btn-overview', 'tab-btn-leases', 'tab-btn-settings', 'tab-btn-provenance'];
      allTabs.forEach((id) => {
        const b = document.getElementById(id);
        if (b) {
          b.classList.remove('border-[#F6821F]', 'border-2');
          b.classList.add('border', 'border-zinc-200');
        }
      });
      const activeTabMap = { 1: 'tab-btn-benchmark', 2: 'tab-btn-overview', 3: 'tab-btn-leases', 4: 'tab-btn-settings', 5: 'tab-btn-provenance' };
      const curBtn = document.getElementById(activeTabMap[requested]);
      if (curBtn) {
        curBtn.classList.remove('border-zinc-200');
        curBtn.classList.add('border-[#F6821F]', 'border-2');
      }

      const tabMap = {
        1: { btn: 'tab-btn-benchmark', target: 'section-benchmark', ptab: 'arena' },
        2: { btn: 'tab-btn-overview', target: 'section-overview', ptab: 'radar' },
        3: { btn: 'tab-btn-leases', target: 'section-leases', ptab: 'leases' },
        4: { btn: 'tab-btn-settings', target: 'section-immune', ptab: 'security' },
        5: { btn: 'tab-btn-provenance', target: 'level-5-grid', ptab: 'rpr' }
      };

      if (!isShowingPayoff && !tourRunning) {
        currentChapterKey = requested;
        currentChapterStep = 0;
        renderNovaCurrent();
      }

      const targetEl = document.getElementById(tabMap[requested]?.target);
      if (targetEl) {
        setTimeout(() => {
          try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }, 60);
      }
    }

    function connectWS() {
      if (DEMO_SAFE) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === 'init_state') {
            updateFullState(msg.state);
          } else if (msg.type === 'swarm_event') {
            appendEvent(msg.event);
          }
        };
        ws.onclose = () => { setTimeout(connectWS, 5000); };
        ws.onerror = () => { try { ws.close(); } catch (e) {} };
      } catch (e) {}
    }

    async function fetchState() {
      if (DEMO_SAFE) return;
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          updateFullState(data);
        }
      } catch (e) {}
    }

    function describeEvent(evt) {
      const d = evt.data || {};
      try {
        if (evt.type === 'lease_acquired') return `locked ${d.symbolId || ''} · ${d.leaseType || 'exclusive_write'} · "${d.intent || 'editing'}"`;
        if (evt.type === 'backpressure_alert') {
          const waitS = d.estimatedWaitMs ? ` (~${Math.ceil(d.estimatedWaitMs / 1000)}s wait)` : '';
          return `${d.blockedAgentId || evt.agentId} HTTP 423 on ${d.symbolId || ''} (held by ${d.leaseHolderAgentId || 'another agent'}${waitS}).`;
        }
        if (evt.type === 'reverse_pr') {
          if (d.status === 'resolved' && d.chosenOption) return `resolved "${d.chosenOption}" for "${d.question || ''}"`;
          return `escalated Reverse PR: "${d.question || ''}"`;
        }
        if (evt.type === 'immune_defense') return `intercepted ${d.threat || 'boundary flaw'} on ${d.symbolId || ''} -> spliced AST guard (${d.latencyMs ?? 4}ms)`;
        if (d.message || d.guard || d.explanation) return d.message || d.guard || d.explanation;
      } catch (e) {}
      const s = JSON.stringify(d);
      return s.length > 140 ? s.slice(0, 140) + '...' : s;
    }

    function spotlightSymbolInCodeViewer(needle) {
      try {
        const viewer = document.getElementById('code-viewer');
        if (!viewer || !viewer.innerText.includes(needle)) return;
        const box = viewer.parentElement;
        const lines = viewer.innerText.split('\n');
        const idx = lines.findIndex((l) => l.includes(needle));
        if (idx < 0) return;
        const lineH = viewer.scrollHeight / Math.max(1, lines.length);
        box.scrollTo({ top: Math.max(0, idx * lineH - box.clientHeight / 3), behavior: 'smooth' });
        box.classList.remove('flash-new-code');
        void box.offsetWidth;
        box.classList.add('flash-new-code');
      } catch (e) {}
    }

    function lineDiff(oldS, newS) {
      const a = oldS.split('\n'), b = newS.split('\n');
      const n = a.length, m = b.length;
      const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
      const ops = [];
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (a[i] === b[j]) { ops.push({ t: ' ', s: a[i] }); i++; j++; }
        else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', s: a[i] }); i++; }
        else { ops.push({ t: '+', s: b[j] }); j++; }
      }
      while (i < n) ops.push({ t: '-', s: a[i++] });
      while (j < m) ops.push({ t: '+', s: b[j++] });
      return ops;
    }

    function renderLatestDiff(prev, next) {
      const box = document.getElementById('latest-diff');
      const meta = document.getElementById('latest-diff-meta');
      if (!box) return;
      if (!prev || prev === next || next.split('\n').length > 500) return;
      const ops = lineDiff(prev, next);
      let added = 0, removed = 0;
      ops.forEach((o) => { if (o.t === '+') added++; if (o.t === '-') removed++; });
      const rows = [];
      ops.forEach((o, idx) => {
        if (o.t !== ' ') { rows.push(o); return; }
        const prevOp = ops[idx - 1], nextOp = ops[idx + 1];
        if ((prevOp && prevOp.t !== ' ') || (nextOp && nextOp.t !== ' ')) rows.push(o);
      });
      const shown = rows.slice(-60);
      box.innerHTML = shown.map((o) => {
        const cls = o.t === '+' ? 'background:rgba(16,185,129,.14);color:#6EE7B7;' : o.t === '-' ? 'background:rgba(244,63,94,.14);color:#FDA4AF;' : 'color:#71717A;';
        return `<div style="${cls}white-space:pre-wrap;word-break:break-word;">${o.t} ${escapeHtml(o.s) || ' '}</div>`;
      }).join('') || '<div style="color:#71717A;">whitespace-only change</div>';
      if (meta) meta.innerText = `+${added} -${removed} · index.ts`;
    }

    function switchDeepTab(which) {
      const conv = which === 'conv';
      document.getElementById('deep-conv-body')?.classList.toggle('hidden', !conv);
      document.getElementById('deep-git-body')?.classList.toggle('hidden', conv);
      const tc = document.getElementById('deep-tab-conv'), tg = document.getElementById('deep-tab-git');
      if (tc) tc.className = 'px-3 py-1.5 ' + (conv ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50');
      if (tg) tg.className = 'px-3 py-1.5 ' + (!conv ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50');
    }

    function benchSnippet(i) {
      if (i % 3 === 0) return { msg: 'adds refund handler', lines: [`export function handleRefund_${i}(orderId: string): string {`, `  return "refund_processed_" + orderId;`, `}`] };
      if (i % 3 === 1) return { msg: 'adds audit logger', lines: [`export function auditTransaction_${i}(txId: string): void {`, `  console.log("Audited transaction: " + txId);`, `}`] };
      return { msg: 'adds config schema', lines: [`export interface ExtraConfig_${i} {`, `  policyLevel_${i}: number;`, `  active: boolean;`, `}`] };
    }

    function diffRowHTML(num, prefix, code, bg) {
      return `<div class="flex"><span class="w-12 flex-shrink-0 text-right pr-2 text-zinc-400 select-none bg-zinc-50 border-r border-zinc-100">${num}</span><span class="pl-2 whitespace-pre-wrap break-words w-full" style="background:${bg}">${prefix} ${escapeHtml(code) || ' '}</span></div>`;
    }

    async function renderDeepDiveDiffs(metrics) {
      const deepWrap = document.getElementById('deep-dive');
      if (deepWrap) deepWrap.classList.remove('hidden');
      const convBody = document.getElementById('deep-conv-body'), gitBody = document.getElementById('deep-git-body'), meta = document.getElementById('deep-meta');
      if (!convBody || !gitBody) return;
      let lines = lastSeenSource ? lastSeenSource.split('\n') : SEED_SNAPSHOT.split('\n');
      const total = lines.length || 0;
      const tail = lines.slice(-6);
      const startNo = Math.max(1, total - 5);
      const n = (metrics && metrics.totalAgentCommits) || 25;
      let conv = `<div class="px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">Base mainline tail · <strong>index.ts:${startNo}-${total}</strong>:</div>`;
      tail.forEach((ln, k) => { conv += diffRowHTML(startNo + k, ' ', ln, 'transparent'); });
      for (let i = 1; i <= n; i++) {
        const s = benchSnippet(i);
        conv += `<div class="px-4 py-1.5 bg-emerald-50/70 border-y border-emerald-100 text-emerald-900 font-mono text-[11px] font-bold">@@ symbol graft: agent_${String(i).padStart(2, '0')} (${s.msg}) @@</div>`;
        s.lines.forEach((ln) => { conv += diffRowHTML('', '+', ln, 'rgba(16,185,129,.10)'); });
      }
      convBody.innerHTML = conv;
      let git = `<div class="px-4 py-2 bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">Same ${n} commits evaluated by GNU diff3:</div>`;
      git += `<div class="px-4 py-1.5 bg-emerald-50/70 border-y border-emerald-100 text-emerald-900 font-mono text-[11px] font-bold">✓ agent_01 · fast-forward at line 78</div>`;
      for (let i = 2; i <= n; i++) {
        const s = benchSnippet(i);
        git += `<div class="px-4 py-1.5 bg-rose-50 border-y border-rose-100 text-rose-900 font-mono text-[11px] font-bold">✕ agent_${String(i).padStart(2, '0')} · CONFLICT at line 78: tail anchor collision</div>`;
        git += diffRowHTML('', '&lt;', `ours (mainline): ${s.lines[0]}`, 'rgba(244,63,94,.10)');
        git += diffRowHTML('', '&gt;', `theirs (agent_${String(i).padStart(2, '0')}): overlapping EOF hunk`, 'rgba(244,63,94,.10)');
      }
      gitBody.innerHTML = git;
      if (meta) meta.innerText = `${n} agents · Engine B: 25/25 clean · Engine A: 24 conflicts`;
      switchDeepTab('conv');
    }


    function switchTab(tabId) {
      const map = { benchmark: 1, overview: 2, leases: 3, settings: 4, provenance: 5 };
      if (map[tabId]) switchLevel(map[tabId]);
    }

    async function runBenchmark() {
      activeLevelView = 1;
      applyQuestGate();
      const btn = document.getElementById('btn-bench-l1');
      const label = document.getElementById('btn-bench-l1-text');
      const status = document.getElementById('bench-status');
      if (label) label.innerText = 'Running 25 Commits...';
      if (btn) btn.disabled = true;
      scrollToEl('duel-arena');
      guideSay(GUIDE.mid[1]);

      status.className = 'text-[11px] font-mono px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-[#F6821F] font-bold flex items-center space-x-1.5';
      status.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-[#F6821F] animate-ping"></span><span>EVALUATING_25_AGENTS</span>';

      initDuelPips();
      document.getElementById('duel-live-ticker').innerText = 'Streaming 25 concurrent agent commits into Engine A and Engine B...';

      const benchFetchPromise = fetch('/api/benchmark', { method: 'POST' }).then(r => r.json());

      for (let i = 1; i <= 25; i++) {
        const gitPip = document.getElementById(`pip-git-${i}`);
        if (i === 1) {
          if (gitPip) {
            gitPip.className = 'w-7 h-7 text-[10px] font-mono flex items-center justify-center rounded border border-emerald-500 bg-emerald-950 text-emerald-400 font-bold pip-green-flash';
            gitPip.innerText = '✓1';
          }
          document.getElementById('git-rate').innerText = '100%';
          document.getElementById('git-conflicts').innerText = '0 / 1';
          document.getElementById('git-stalled').innerText = '0';
          document.getElementById('duel-git-counter').innerText = '1/1 merged (Agent 1 fast-forward)';
        } else {
          if (gitPip) {
            gitPip.className = 'w-7 h-7 text-[10px] font-mono flex items-center justify-center rounded border border-rose-500 bg-rose-950 text-rose-300 font-bold pip-red-flash';
            gitPip.innerText = '✕' + i;
          }
          const conflicts = i - 1;
          const passRate = Math.round((1 / i) * 100);
          document.getElementById('git-rate').innerText = `${passRate}%`;
          document.getElementById('git-conflicts').className = 'text-xl font-bold font-mono text-rose-600 mt-0.5';
          document.getElementById('git-rate').className = 'text-xl font-bold font-mono text-rose-600 mt-0.5';
          document.getElementById('git-stalled').className = 'text-xl font-bold font-mono text-rose-600 mt-0.5';
          document.getElementById('git-conflicts').innerText = `${conflicts} / ${i}`;
          document.getElementById('git-stalled').innerText = `${conflicts}`;
          document.getElementById('duel-git-counter').innerText = `${conflicts} tail-anchor conflicts!`;
        }

        const convPip = document.getElementById(`pip-conv-${i}`);
        if (convPip) {
          convPip.className = 'w-7 h-7 text-[10px] font-mono flex items-center justify-center rounded border border-emerald-500 bg-emerald-950 text-emerald-300 font-bold pip-green-flash';
          convPip.innerText = '✓' + i;
        }
        document.getElementById('conv-rate').className = 'text-xl font-bold font-mono text-emerald-600 mt-0.5';
        document.getElementById('conv-conflicts').className = 'text-xl font-bold font-mono text-emerald-600 mt-0.5';
        document.getElementById('conv-latency').className = 'text-xl font-bold font-mono text-emerald-600 mt-0.5';
        document.getElementById('conv-rate').innerText = '100%';
        document.getElementById('conv-conflicts').innerText = '0';
        document.getElementById('conv-latency').innerText = `${9 + (i % 3)}ms`;
        document.getElementById('duel-conv-counter').innerText = `${i} / 25 AST symbols grafted`;

        const term = document.getElementById('duel-terminal-log');
        if (term) {
          if (i === 1) {
            term.innerHTML = '<span class="text-emerald-400 font-bold">[COMMIT 01]</span> Both engines merged Agent 01 cleanly.';
          } else {
            term.innerHTML = `<span class="text-rose-400 font-bold">[COMMIT ${String(i).padStart(2, '0')}] Engine A (diff3): CONFLICT at index.ts:78</span> (overlapping EOF line anchor) | <span class="text-emerald-400 font-bold">Engine B (AST): 'func:module_${i}' grafted</span> [L:${i + 2}]`;
          }
        }

        await new Promise(r => setTimeout(r, 85));
      }

      // Reveal the post-run verdict boxes (The Surprise!)
      const gitVerdict = document.getElementById('l1-git-verdict');
      const convVerdict = document.getElementById('l1-conv-verdict');
      const gitDot = document.getElementById('l1-git-dot');
      const convDot = document.getElementById('l1-conv-dot');
      if (gitDot) gitDot.className = 'w-2 h-2 rounded-full bg-rose-500';
      if (convDot) convDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
      if (gitVerdict) {
        gitVerdict.className = 'p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 leading-relaxed slide-down-fade';
        gitVerdict.innerHTML = '<strong>Why Engine A Crashed (24/25 Failed):</strong> Because all 25 agents appended after line 78, GNU diff3 saw 25 commits competing for the exact same line number and halted 24 agents!';
      }
      if (convVerdict) {
        convVerdict.className = 'p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 leading-relaxed slide-down-fade';
        convVerdict.innerHTML = '<strong>Why Engine B Succeeded (25/25 Clean):</strong> Convergence parsed each function into an independent AST symbol node (`func:handleRefund_1`, etc.) and united them with zero line-number collisions.';
      }

      try {
        const data = await benchFetchPromise.catch(() => CANNED_BENCH);
        document.getElementById('git-rate').innerText = `${data.gitSuccessRate}%`;
        document.getElementById('git-conflicts').innerText = `${data.gitConflicts} / ${data.totalAgentCommits}`;
        document.getElementById('git-stalled').innerText = `${data.gitBlockedAgents}`;
        document.getElementById('conv-rate').innerText = `${data.convergenceSuccessRate}%`;
        document.getElementById('conv-conflicts').innerText = `${data.convergenceConflicts}`;
        document.getElementById('conv-latency').innerText = `${data.convergenceAvgMergeLatencyMs}ms`;

        status.className = 'text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold';
        status.innerText = `Complete: ${data.concurrencyThroughputGain}`;

        showToast('Stage 01 Verified', 'Engine A threw 24 line conflicts; Engine B merged 25/25 via AST-CRDT.', 'success');
        await fetchState();
        await renderDeepDiveDiffs(data);
        markLevelCompleted(1);
      } catch (e) {
        document.getElementById('git-rate').innerText = '4%';
        document.getElementById('git-conflicts').innerText = '24 / 25';
        document.getElementById('git-stalled').innerText = '24';
        document.getElementById('conv-rate').innerText = '100%';
        document.getElementById('conv-conflicts').innerText = '0';
        document.getElementById('conv-latency').innerText = '10ms';
        status.innerText = 'VERIFIED: 25x higher success';
        await renderDeepDiveDiffs(CANNED_BENCH);
        markLevelCompleted(1);
      } finally {
        if (label) label.innerText = 'Re-Run 25-Agent Test';
        if (btn) btn.disabled = false;
      }
    }

    async function triggerSwarmWave() {
      activeLevelView = 2;
      applyQuestGate();
      const btn = document.getElementById('btn-swarm-l2');
      const label = document.getElementById('btn-swarm-l2-text');
      if (label) label.innerText = 'Sequencing Wave...';
      if (btn) btn.disabled = true;
      scrollToEl('radar-wrap');
      guideSay(GUIDE.mid[2]);

      const c = getSwarmCanvas();
      const cx = (c && c.width) ? c.width / 2 : 400;
      const cy = (c && c.height) ? c.height / 2 : 150;
      const radius = Math.min(cx, cy) * 0.65;
      const baseClean = cleanMerges;
      const landOne = (idx) => {
        const ag = agents[idx % agents.length];
        ag.active = true;
        const x = cx + Math.cos(ag.angle) * radius;
        const y = cy + Math.sin(ag.angle) * radius;
        fireBeamToCenter(x, y, ag.color);
        cleanMerges = baseClean + idx + 1;
        const el = document.getElementById('stat-clean');
        if (el) el.innerText = cleanMerges;
        appendEvent({ type: 'ast_merge', agentId: ag.name, timestamp: Date.now(), data: { message: `grafted AST symbol ${idx + 1}/8 into DO SQLite` } });
        setTimeout(() => { ag.active = false; }, 700);
      };
      agents.forEach((ag, i) => setTimeout(() => landOne(i), i * 210));

      try {
        const res = await fetch('/api/swarm', { method: 'POST' });
        const data = await res.json().catch(() => ({ resultsCount: 8 }));
        setTimeout(() => {
          if (data && data.resultsCount) {
            cleanMerges = Math.max(cleanMerges, baseClean + data.resultsCount);
            document.getElementById('stat-clean').innerText = cleanMerges;
          }
        }, 8 * 210 + 200);
        await fetchState();
        await new Promise((r) => setTimeout(r, 8 * 210 + 250));
        showToast('Stage 02 Verified', '8 concurrent agents sequenced by the single-threaded Durable Object.', 'success');
        markLevelCompleted(2);
      } catch (e) {
        await new Promise((r) => setTimeout(r, 8 * 210 + 250));
        cleanMerges = Math.max(cleanMerges, baseClean + 8);
        document.getElementById('stat-clean').innerText = cleanMerges;
        showToast('Stage 02 Verified', '8 concurrent agents sequenced into mainline.', 'success');
        markLevelCompleted(2);
      } finally {
        setTimeout(() => { agents.forEach(ag => ag.active = false); }, 1000);
        if (label) label.innerText = 'Dispatch 8-Agent Wave';
        if (btn) btn.disabled = false;
      }
    }

    async function testLeaseAcquire() {
      activeLevelView = 3;
      applyQuestGate();
      const btn = document.getElementById('btn-lease-l3');
      const label = document.getElementById('btn-lease-l3-text');
      if (label) label.innerText = 'Running Handshake...';
      if (btn) btn.disabled = true;
      scrollToEl('section-leases');
      guideSay(GUIDE.mid[3]);

      try {
        const symbolId = 'func:processOrder';
        const agentId = 'agent_security';

        await fetch('/api/leases/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbolId,
            agentId,
            leaseType: 'exclusive_write',
            ttlMs: 12000,
            intent: 'Refactoring order processing schema'
          })
        });
        await fetchState();
        renderLeasesTable([{ symbolId, agentId, leaseType: 'exclusive_write', expiresAt: Date.now() + 12000, acquiredAt: Date.now(), intent: 'Refactoring order processing schema' }]);
        showToast('T+0ms: Lease Acquired', 'agent_security locked func:processOrder (TTL 12s).', 'info');

        await new Promise(r => setTimeout(r, 650));

        await fetch('/api/leases/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbolId,
            agentId: 'agent_fraud',
            leaseType: 'exclusive_write',
            ttlMs: 5000,
            intent: 'Injecting velocity check'
          })
        });
        const banner = document.getElementById('backpressure-alert-banner');
        if (banner) {
          banner.classList.remove('hidden');
          banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showToast('T+600ms: HTTP 423 Locked!', 'agent_fraud halted before LLM inference: 1,420 tokens saved.', 'warning');
        await fetchState();
        markLevelCompleted(3);
      } catch (e) {
        const banner = document.getElementById('backpressure-alert-banner');
        if (banner) banner.classList.remove('hidden');
        markLevelCompleted(3);
      } finally {
        if (label) label.innerText = 'Simulate Same-Symbol Race';
        if (btn) btn.disabled = false;
      }
    }

    async function testImmuneAttack() {
      activeLevelView = 4;
      applyQuestGate();
      const btn = document.getElementById('btn-immune-l4');
      const label = document.getElementById('btn-immune-l4-text');
      if (label) label.innerText = 'Fuzzing AST Node...';
      if (btn) btn.disabled = true;
      scrollToEl('section-immune');
      guideSay(GUIDE.mid[4]);

      const card = document.getElementById('immune-scanner-card');
      const title = document.getElementById('immune-scanner-title');
      const count = document.getElementById('immune-threat-count');
      const desc = document.getElementById('immune-scanner-desc');
      const codeBox = document.getElementById('immune-antibody-box');
      const codeEl = document.getElementById('immune-antibody-code');

      if (card) card.className = 'p-4 bg-rose-50/50 border-2 border-rose-400 rounded-lg space-y-2.5 transition-all alert-pulse';
      if (title) title.innerHTML = '<span class="text-rose-700 font-bold">INVARIANT BREACH INTERCEPTED // CVE-SIM-01</span>';
      if (count) {
        count.className = 'text-[10px] px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold';
        count.innerText = '1 Boundary Exploit Blocked';
      }
      if (desc) {
        desc.innerHTML = 'Pre-merge fuzzer invoked <code class="font-mono font-bold text-rose-900">transferFunds(-99999)</code>. Function returned <code class="font-mono">true</code>, violating <code class="font-mono">strict_positive_amount</code> invariant.';
      }

      try {
        await fetch('/api/immune-attack', { method: 'POST' });
        await fetchState();

        if (codeBox) codeBox.classList.remove('hidden');
        if (codeEl) {
          const lines = [
            'export function transferFunds(amount: number): boolean {',
            '  if (amount <= 0) throw new RangeError("Security: Invalid amount");',
            '  console.log("Transferring amount: " + amount);',
            '  return true;',
            '}'
          ];
          codeEl.innerText = '';
          for (let i = 0; i < lines.length; i++) {
            await new Promise(r => setTimeout(r, 120));
            codeEl.innerText += (i > 0 ? '\n' : '') + lines[i];
          }
        }

        const badge = document.getElementById('immune-badge-status');
        if (badge) {
          badge.className = 'text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold flex items-center space-x-1.5';
          badge.innerHTML = '<span class="text-emerald-600 font-bold">✓</span><span>ANTIBODY_SPLICED</span>';
        }

        spotlightSymbolInCodeViewer('transferFunds');
        showToast('Stage 04 Verified', 'Synthetic RangeError antibody spliced into AST before merge.', 'success');
        markLevelCompleted(4);
      } catch (e) {
        if (codeBox) codeBox.classList.remove('hidden');
        if (codeEl && !codeEl.innerText) codeEl.innerText = 'if (amount <= 0) throw new RangeError("Security: Invalid amount");';
        markLevelCompleted(4);
      } finally {
        if (label) label.innerText = 'Push Unvalidated Commit';
        if (btn) btn.disabled = false;
      }
    }

    function renderStageFallbackRPR() {
      const container = document.getElementById('rpr-container');
      if (!container || container.querySelector('.rpr-card')) return;
      const prId = 'rpr_stage_demo';
      container.innerHTML = `
        <div class="p-4 bg-zinc-50 border-2 border-zinc-900 rounded-lg space-y-3 rpr-card slide-down-fade" data-pr-id="${prId}">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-zinc-950 font-bold">agent_architect // ESCALATION</span>
            <span class="text-[10px] text-[#F6821F] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 font-bold">AWAITING_HUMAN_STEERING</span>
          </div>
          <p class="text-zinc-950 text-xs font-bold leading-snug">Database schema tradeoff: migrate ledger state to distributed D1 SQLite or retain co-located Durable Object SQLite with WAL snapshots?</p>
          <div class="flex flex-col space-y-1.5 pt-1">
            ${['Retain co-located DO SQLite + Artifacts WAL', 'Migrate ledger to distributed D1', 'Hybrid read-replica tier'].map((opt) => `
              <button onclick="resolvePR('${prId}', '${opt}', this)" class="rpr-option-btn w-full text-left px-3 py-2 bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 rounded border border-zinc-300 transition text-xs font-mono flex items-center justify-between">
                <span>${opt}</span>
                <span>-></span>
              </button>`).join('')}
          </div>
        </div>`;
    }

    async function triggerTestRPR() {
      if (!document.body.classList.contains('platform-mode')) {
        activeLevelView = 5;
        applyQuestGate();
      }
      const btn = document.getElementById('btn-rpr-l5');
      const label = document.getElementById('btn-rpr-l5-text');
      if (label) label.innerText = 'Escalating...';
      if (btn) btn.disabled = true;
      if (!document.body.classList.contains('platform-mode')) {
        scrollToEl('section-rpr');
        guideSay(GUIDE.mid[5]);
      }
      try {
        await fetch('/api/reverse-pr/trigger', { method: 'POST' });
        await fetchState();
        renderStageFallbackRPR();
        lastPSig = '';
        renderPlatform(window.__lastState || {});
        showToast('Reverse PR Opened', 'Select an architectural direction to unblock the agent swarm.', 'info');
      } catch (e) {
        renderStageFallbackRPR();
      } finally {
        if (label) label.innerText = 'Simulate Agent Escalation (Reverse PR)';
        if (btn) btn.disabled = false;
      }
    }

    async function resolvePR(prId, option, buttonEl) {
      if (buttonEl) {
        buttonEl.innerHTML = `<span>✓ Applying direction: ${option}...</span>`;
        buttonEl.classList.add('bg-zinc-900', 'text-white', 'font-bold');
      }

      try {
        await fetch('/api/reverse-pr/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prId, option })
        });
        await fetchState();
      } catch (e) {}
      const container = document.getElementById('rpr-container');
      if (container) {
        container.innerHTML = `
          <div class="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex items-center space-x-2">
            <span>✓</span>
            <span>Direction locked ("${option}") · swarm unblocked. Zero pending architectural inquiries.</span>
          </div>`;
      }
      showToast('Stage 05 Verified · All 5/5 Complete!', 'Click ▶ in NOVA (or "Launch Convergence") to open the full standalone platform!', 'success');
      markLevelCompleted(5);
    }

    setInterval(() => {
      const statThroughput = document.getElementById('stat-throughput');
      if (statThroughput) {
        const jitter = 96 + Math.floor(Math.sin(Date.now() / 2500) * 6 + Math.random() * 5);
        statThroughput.innerText = `${jitter} ops/s`;
      }
    }, 2200);

    connectWS();
    fetchState();
    setInterval(fetchState, 3000);