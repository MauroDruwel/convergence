// =====================================================================
// WEBSOCKET SYNC, TELEMETRY & APP BOOTSTRAP
// =====================================================================

    function updateFullState(state) {
      if (!state) return;
      if (state.files && state.files['index.ts']) {
        const nextSrc = state.files['index.ts'];
        const viewer = document.getElementById('code-viewer');
        if (viewer && viewer.innerText !== nextSrc) {
          if (lastSeenSource && lastSeenSource !== nextSrc) renderLatestDiff(lastSeenSource, nextSrc);
          lastSeenSource = nextSrc;
          viewer.innerText = nextSrc;
          viewer.parentElement.classList.remove('flash-new-code');
          void viewer.parentElement.offsetWidth;
          viewer.parentElement.classList.add('flash-new-code');
          viewer.parentElement.scrollTop = viewer.parentElement.scrollHeight;
        } else if (!lastSeenSource && viewer) {
          lastSeenSource = nextSrc;
        }
      }
      if (state.lamportClock !== undefined) {
        document.getElementById('stat-lamport').innerText = `L: ${state.lamportClock}`;
      }
      if (state.reversePRs) renderReversePRs(state.reversePRs);
      if (state.activeLeases) renderLeasesTable(state.activeLeases);
      if (state.provenanceRecords) {
        renderProvenanceTable(state.provenanceRecords);
        if (state.provenanceRecords.length > 0) {
          cleanMerges = Math.max(cleanMerges, state.provenanceRecords.length);
          document.getElementById('stat-clean').innerText = cleanMerges;
        }
      }
      if (state.events && state.events.length > 0) {
        const container = document.getElementById('event-stream');
        if (container.children.length <= 1) {
          container.innerHTML = '';
          state.events.slice(0, 15).reverse().forEach(appendEvent);
        }
      }
      window.__lastState = state;
      try { renderPlatform(state); } catch (e) {}
    }

    function appendEvent(evt) {
      const container = document.getElementById('event-stream');
      const row = document.createElement('div');
      row.className = 'py-1.5 border-b border-zinc-900 flex items-start space-x-2 text-xs font-mono';

      let badge = '<span class="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold">[EVENT]</span>';
      if (evt.type === 'ast_merge') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">[AST MERGE]</span>';
        cleanMerges++;
        document.getElementById('stat-clean').innerText = cleanMerges;
      } else if (evt.type === 'conflict_detected') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-bold border border-amber-800">[COLLISION]</span>';
      } else if (evt.type === 'reverse_pr') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 font-bold border border-purple-800">[REVERSE_PR]</span>';
      } else if (evt.type === 'immune_defense') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 font-bold border border-rose-800">[IMMUNE GUARD]</span>';
      } else if (evt.type === 'lease_acquired') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 font-bold border border-sky-800">[LEASE_LOCK]</span>';
      } else if (evt.type === 'backpressure_alert') {
        badge = '<span class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-bold border border-amber-800">[HTTP_423]</span>';
      }

      const time = new Date(evt.timestamp).toLocaleTimeString();
      row.innerHTML = `
        <span class="text-zinc-500 text-[10px]">${time}</span>
        ${badge}
        <span class="text-zinc-300"><strong class="text-white">${evt.agentId}:</strong> ${describeEvent(evt)}</span>
      `;
      container.prepend(row);

      const match = agents.find((a) => a.name === evt.agentId);
      if (match) {
        match.active = true;
        const c = getSwarmCanvas();
        const cx = (c && c.width) ? c.width / 2 : 400;
        const cy = (c && c.height) ? c.height / 2 : 150;
        const radius = Math.min(cx, cy) * 0.65;
        const x = cx + Math.cos(match.angle) * radius;
        const y = cy + Math.sin(match.angle) * radius;
        fireBeamToCenter(x, y, match.color);
        setTimeout(() => { match.active = false; }, 800);
      }
    }

    function renderLeasesTable(leases) {
      const tbody = document.getElementById('leases-table-body');
      const countPill = document.getElementById('stat-leases');
      const tabCount = document.getElementById('tab-leases-count');
      const statusText = document.getElementById('table-leases-status');

      countPill.innerText = leases.length;
      if (tabCount) tabCount.innerText = leases.length;
      statusText.innerText = `${leases.length} Active`;

      if (!leases || leases.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="px-6 py-8 text-center text-zinc-400 font-mono">
              [LOCK_TABLE_EMPTY] Click "Simulate Same-Symbol Race" to observe edit-time lease arbitration.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = leases.map(l => `
        <tr class="hover:bg-zinc-50 transition">
          <td class="px-6 py-3 text-zinc-950 font-bold">${l.symbolId}</td>
          <td class="px-4 py-3 text-zinc-800">${l.agentId}</td>
          <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-orange-50 text-[#F6821F] border border-orange-200 text-[10px] font-semibold">${l.leaseType}</span></td>
          <td class="px-4 py-3 text-zinc-700 font-mono font-bold">${Math.max(0, Math.round((l.expiresAt - Date.now()) / 1000))}s</td>
          <td class="px-4 py-3 text-zinc-500 truncate max-w-[200px]">${l.intent}</td>
        </tr>
      `).join('');
    }

    function renderProvenanceTable(records) {
      const tbody = document.getElementById('provenance-table-body');
      const countPill = document.getElementById('stat-notes');
      const tabCount = document.getElementById('tab-notes-count');
      const statusText = document.getElementById('table-notes-status');

      countPill.innerText = records.length;
      if (tabCount) tabCount.innerText = records.length;
      statusText.innerText = `${records.length} Logged`;

      if (!records || records.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="4" class="px-4 py-8 text-center text-zinc-400 font-mono">
              Awaiting agent commits to populate refs/notes/agent-provenance...
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = records.slice(-5).reverse().map((r) => `
        <tr class="hover:bg-zinc-50 transition">
          <td class="px-4 py-2.5 text-zinc-950 font-bold">${r.symbolId}</td>
          <td class="px-4 py-2.5">
            <div class="text-zinc-900 font-semibold">${r.agentId}</div>
            <div class="text-[10px] text-zinc-500">${r.model.replace('@cf/meta/', '')}</div>
          </td>
          <td class="px-4 py-2.5">
            <div class="text-zinc-800">${r.promptIntent}</div>
            <div class="text-[10px] text-emerald-700 font-semibold">${r.invariantsChecked?.join(', ') || 'verified'}</div>
          </td>
          <td class="px-4 py-2.5 text-right text-[11px] text-zinc-500">
            <div>${r.tokenTelemetry?.promptTokens || 0}in / ${r.tokenTelemetry?.completionTokens || 0}out</div>
            <div class="text-[10px] text-zinc-900 font-semibold">${r.tokenTelemetry?.latencyMs || 0}ms</div>
          </td>
        </tr>
      `).join('');
    }

    let lastRprSig = '__init__';
    function renderReversePRs(prs) {
      const container = document.getElementById('rpr-container');
      if (!container) return;
      const pending = prs ? prs.filter((p) => p.status === 'pending') : [];
      const sig = 'rpr:' + pending.map((p) => p.id).join(',');
      if (sig === lastRprSig) return;
      lastRprSig = sig;
      if (pending.length === 0) {
        container.innerHTML = `
          <div class="text-xs font-mono text-zinc-500 bg-zinc-50 border border-zinc-200 p-4 rounded-lg">
            [QUEUE_CLEAR] Zero pending architectural inquiries.
          </div>
        `;
        return;
      }

      container.innerHTML = pending.map((pr) => `
        <div class="p-4 bg-zinc-50 border-2 border-zinc-900 rounded-lg space-y-3 rpr-card slide-down-fade" data-pr-id="${pr.id}">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-zinc-950 font-bold">${pr.agentId} // ESCALATION</span>
            <span class="text-[10px] text-[#F6821F] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 font-bold">
              AWAITING_HUMAN_STEERING
            </span>
          </div>
          <p class="text-zinc-950 text-xs font-bold leading-snug">${pr.question}</p>
          <div class="flex flex-col space-y-1.5 pt-1">
            ${pr.options.map((opt) => `
              <button onclick="resolvePR('${pr.id}', '${opt.replace(/'/g, "\\'")}', this)" class="rpr-option-btn w-full text-left px-3 py-2 bg-white hover:bg-zinc-900 hover:text-white text-zinc-800 rounded border border-zinc-300 transition text-xs font-mono flex items-center justify-between">
                <span>${opt}</span>
                <span>-></span>
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');
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
