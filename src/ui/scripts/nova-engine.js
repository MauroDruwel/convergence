// =====================================================================
// NOVA ARCHITECT CONTROLLER & VIEW SWITCHER
// =====================================================================

    function toggleDeepDive() {
      isDeepDiveOpen = !isDeepDiveOpen;
      const contentEl = document.getElementById('guide-deep-dive-content');
      const btn = document.getElementById('guide-deep-dive-btn');
      if (!contentEl) return;
      if (isDeepDiveOpen) {
        contentEl.classList.remove('hidden');
        if (btn) {
          btn.classList.add('bg-[#F6821F]', 'text-white', 'border-[#F6821F]');
          btn.classList.remove('bg-zinc-900', 'text-zinc-400');
          btn.setAttribute('data-tip', 'Collapse Architecture Note (</>)');
        }
        renderDeepDive();
      } else {
        contentEl.classList.add('hidden');
        if (btn) {
          btn.classList.remove('bg-[#F6821F]', 'text-white', 'border-[#F6821F]');
          btn.classList.add('bg-zinc-900', 'text-zinc-400');
          btn.setAttribute('data-tip', 'Architecture Deep Dive (</>)');
        }
      }
    }

    function renderDeepDive() {
      const contentEl = document.getElementById('guide-deep-dive-content');
      if (!contentEl) return;
      const lvl = (typeof currentChapterKey === 'number') ? currentChapterKey : (payoffLevel || 1);
      const spec = NOVA_DEEP_DIVES[lvl] || NOVA_DEEP_DIVES[1];
      const step = (isShowingPayoff && payoffLevel)
        ? NOVA_PAYOFFS[payoffLevel]
        : ((NOVA_DECKS[currentChapterKey] || [])[currentChapterStep] || NOVA_PAYOFFS[lvl] || {});

      const issueText = step.issue || spec?.sections?.[0]?.detail || "Legacy Git locks on raw line numbers during swarm pushes.";
      const solutionText = step.solution || spec?.sections?.[1]?.detail || "AST Symbol Graph converts disjoint edits into commutative set unions.";
      const cfPortText = step.cfPort || spec?.sections?.[2]?.detail || "Cloudflare Workers Isolates (<2ms) and Durable Objects SQLite WAL serialize commits globally.";

      const html = `
        <div class="mt-3 pt-2.5 border-t border-zinc-800/80 font-mono text-xs">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
            <span class="text-[#F6821F] font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <span>⚡</span>
              <span>Systems Architecture &amp; Edge Runtime Spec</span>
            </span>
            <span class="text-[10px] text-zinc-500 hidden sm:inline font-mono">
              Runtime: <span class="text-emerald-400 font-medium">Cloudflare Workers · AST CRDT</span>
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-md p-2.5 flex flex-col justify-between">
              <div class="text-rose-400 font-bold text-[10px] mb-1 font-mono uppercase tracking-wide">🔴 The Issue</div>
              <div class="text-zinc-300 font-sans leading-snug">${linkifyTerms(escapeHtml(issueText))}</div>
            </div>
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-md p-2.5 flex flex-col justify-between">
              <div class="text-emerald-400 font-bold text-[10px] mb-1 font-mono uppercase tracking-wide">🟢 The Solution</div>
              <div class="text-zinc-300 font-sans leading-snug">${linkifyTerms(escapeHtml(solutionText))}</div>
            </div>
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-md p-2.5 flex flex-col justify-between">
              <div class="text-[#F6821F] font-bold text-[10px] mb-1 font-mono uppercase tracking-wide">🟠 Cloudflare Port</div>
              <div class="text-zinc-300 font-sans leading-snug">${linkifyTerms(escapeHtml(cfPortText))}</div>
            </div>
          </div>
        </div>
      `;

      contentEl.innerHTML = html;
    }

    window.toggleDeepDive = toggleDeepDive;
    window.renderDeepDive = renderDeepDive;
    window.spawnLevel = spawnLevel;


    // =========================================================================

    function toggleNovaDockPosition() {
      const isInline = document.body.classList.toggle('nova-inline-mode');
      const guideEl = document.getElementById('guide');
      const questShell = document.getElementById('quest-shell');
      if (isInline && guideEl && questShell) {
        questShell.insertBefore(guideEl, questShell.firstChild);
        showToast('NOVA Docked Inline (Top)', 'NOVA is now docked inline at the top of the workspace with zero floating overlap.', 'info');
      } else if (guideEl) {
        document.body.appendChild(guideEl);
        showToast('NOVA Floating HUD (Bottom)', 'NOVA is docked at the bottom edge.', 'info');
      }
    }
    window.toggleNovaDockPosition = toggleNovaDockPosition;

    function formatTriadHtml(item) {
      if (!item) return '';
      if (item.issue && item.solution && item.cfPort) {
        return `
          <div class="flex items-start space-x-1.5"><span class="px-1 py-0.2 rounded bg-rose-950/90 text-rose-400 border border-rose-800/70 text-[9px] font-bold flex-shrink-0 mt-0.5">ISSUE</span><span class="text-zinc-300">${linkifyTerms(escapeHtml(item.issue))}</span></div>
          <div class="flex items-start space-x-1.5"><span class="px-1 py-0.2 rounded bg-emerald-950/90 text-emerald-400 border border-emerald-800/70 text-[9px] font-bold flex-shrink-0 mt-0.5">FIX</span><span class="text-zinc-200">${linkifyTerms(escapeHtml(item.solution))}</span></div>
          <div class="flex items-start space-x-1.5"><span class="px-1 py-0.2 rounded bg-[#F6821F]/20 text-[#F6821F] border border-[#F6821F]/40 text-[9px] font-bold flex-shrink-0 mt-0.5">CF PORT</span><span class="text-amber-200/95">${linkifyTerms(escapeHtml(item.cfPort))}</span></div>
        `;
      }
      return linkifyTerms(escapeHtml(item.eng || ''));
    }

    function renderNovaCurrent() {
      const levelEl = document.getElementById('guide-level');
      const stepTagEl = document.getElementById('guide-step-tag');
      const titleEl = document.getElementById('guide-title');
      const textEl = document.getElementById('guide-text');
      const engEl = document.getElementById('guide-eng-note');
      const primPill = document.getElementById('guide-cf-primitive-pill');
      const prevBtn = document.getElementById('guide-prev-btn');
      const nextBtn = document.getElementById('guide-next-btn');
      const ctaBtn = document.getElementById('guide-cta');

      if (isDeepDiveOpen) {
        try { renderDeepDive(); } catch (e) {}
      }

      pulseNovaSpeaking();

      if (isShowingPayoff && payoffLevel) {
        const payoff = NOVA_PAYOFFS[payoffLevel];
        if (levelEl) levelEl.innerText = `STAGE 0${payoffLevel}/05`;
        if (stepTagEl) stepTagEl.innerText = 'VERIFIED ✓';
        if (titleEl) titleEl.innerText = payoff.title;
        document.getElementById('guide')?.classList.remove('guide-running-compact');
        if (textEl) textEl.innerHTML = linkifyTerms(payoff.text);
        if (primPill && payoff.primitive) primPill.innerText = payoff.primitive;
        if (engEl) {
          engEl.innerHTML = formatTriadHtml(payoff);
          engEl.style.display = '';
        }
        if (prevBtn) prevBtn.disabled = true;
        if (ctaBtn) ctaBtn.classList.add('hidden');
        if (nextBtn) {
          nextBtn.setAttribute('data-tip', payoff.nextLevel ? `Unlock Stage 0${payoff.nextLevel}` : 'Launch Convergence');
          nextBtn.classList.remove('hidden');
        }
        return;
      }

      const chapter = NOVA_DECKS[currentChapterKey] || [];
      const step = chapter[currentChapterStep];
      if (!step) return;

      if (levelEl) levelEl.innerText = typeof currentChapterKey === 'number' ? `STAGE 0${currentChapterKey}/05` : currentChapterKey === 'complete' ? 'UNLOCKED' : 'STANDBY';
      if (stepTagEl) stepTagEl.innerText = `STEP ${currentChapterStep + 1}/${chapter.length}`;
      if (titleEl) titleEl.innerText = step.title;
      document.getElementById('guide')?.classList.remove('guide-running-compact');
      if (textEl) textEl.innerHTML = linkifyTerms(step.text);
      if (primPill && step.primitive) primPill.innerText = step.primitive;
      if (engEl) {
        engEl.innerHTML = formatTriadHtml(step);
        engEl.style.display = '';
      }

      if (prevBtn) {
        const canGoBack = currentChapterStep > 0 || (typeof currentChapterKey === 'number' && currentChapterKey >= 1) || currentChapterKey === 'complete';
        prevBtn.disabled = !canGoBack;
      }

      const isLastStep = currentChapterStep === chapter.length - 1;
      if (isLastStep && step.ctaTip) {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (ctaBtn) {
          ctaBtn.setAttribute('data-tip', step.ctaTip);
          ctaBtn.disabled = false;
          ctaBtn.classList.remove('hidden');
        }
      } else {
        if (ctaBtn) ctaBtn.classList.add('hidden');
        if (nextBtn) {
          if (currentChapterKey === 'welcome' && isLastStep) {
            nextBtn.setAttribute('data-tip', 'Initialize Stage 01');
          } else if (currentChapterKey === 'complete') {
            nextBtn.setAttribute('data-tip', 'Explore Convergence');
          } else {
            nextBtn.setAttribute('data-tip', 'Next Step');
          }
          nextBtn.classList.remove('hidden');
        }
      }

      if (step.spawnId) {
        spawnAndSpotlight(step.spawnId, step.targetTab);
      }
    }
    window.renderNovaCurrent = renderNovaCurrent;

    function novaNext() {
      if (isShowingPayoff) {
        const payoff = NOVA_PAYOFFS[payoffLevel];
        const nextLvl = payoff ? payoff.nextLevel : null;
        isShowingPayoff = false;
        payoffLevel = null;
        if (nextLvl) {
          spawnLevel(nextLvl);
          switchLevel(nextLvl);
        } else {
          spawnLevel(6);
          currentChapterKey = 'complete';
          currentChapterStep = 0;
          switchPTab('code');
          renderNovaCurrent(); if (isDeepDiveOpen) renderDeepDive();
        }
        return;
      }

      if (currentChapterKey === 'welcome') {
        currentChapterStep++;
        const chapter = NOVA_DECKS.welcome;
        if (currentChapterStep >= chapter.length) {
          spawnLevel(1);
          switchLevel(1);
          return;
        }
        renderNovaCurrent();
        return;
      }

      if (currentChapterKey === 'complete') {
        switchPTab('code');
        return;
      }

      const chapter = NOVA_DECKS[currentChapterKey] || [];
      if (currentChapterStep < chapter.length - 1) {
        currentChapterStep++;
        renderNovaCurrent();
      }
    }

    function novaPrev() {
      if (isShowingPayoff) return;
      if (currentChapterStep > 0) {
        currentChapterStep--;
        renderNovaCurrent();
      } else if (currentChapterKey === 'complete') {
        setView('quest');
        const prevChapter = NOVA_DECKS[5] || [];
        currentChapterStep = Math.max(0, prevChapter.length - 1);
        switchLevel(5);
      } else if (typeof currentChapterKey === 'number' && currentChapterKey > 1) {
        const targetLvl = currentChapterKey - 1;
        const prevChapter = NOVA_DECKS[targetLvl] || [];
        currentChapterStep = Math.max(0, prevChapter.length - 1);
        switchLevel(targetLvl);
      } else if (currentChapterKey === 1 && currentChapterStep === 0) {
        activeLevelView = 0;
        currentChapterKey = 'welcome';
        currentChapterStep = (NOVA_DECKS.welcome || []).length - 1;
        applyQuestGate();
        renderNovaCurrent();
      }
    }

    function novaReplay() {
      renderNovaCurrent();
    }

    function toggleGuideMinimize() {
      isGuideMinimized = !isGuideMinimized;
      const guideEl = document.getElementById('guide');
      if (guideEl) guideEl.classList.toggle('guide-minimized', isGuideMinimized);
      const icon = document.getElementById('guide-toggle-icon');
      if (icon) {
        icon.innerHTML = isGuideMinimized
          ? '<polyline points="18 15 12 9 6 15"/>'
          : '<polyline points="6 9 12 15 18 9"/>';
      }
    }

    function spawnAndSpotlight(elementId, targetTab) {
      if (targetTab && document.body.classList.contains('platform-mode')) {
        switchPTab(targetTab);
      }
      document.querySelectorAll('.game-spotlight-active').forEach(e => e.classList.remove('game-spotlight-active'));
      const el = document.getElementById(elementId);
      if (!el || el.style.display === 'none') return;
      el.classList.remove('spawn-pulse-ring');
      void el.offsetWidth;
      el.classList.add('spawn-pulse-ring');
      el.classList.add('game-spotlight-active');
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {}
    }

    function dockGuideCompanion() {
      const guide = document.getElementById('guide');
      if (guide) guide.classList.add('hidden');
      const pill = document.getElementById('guide-minimized-pill');
      if (pill) pill.classList.remove('hidden');
    }

    function restoreGuide() {
      const pill = document.getElementById('guide-minimized-pill');
      if (pill) pill.classList.add('hidden');
      const guide = document.getElementById('guide');
      if (guide) guide.classList.remove('hidden');
      isDeepDiveOpen = false;
      const contentEl = document.getElementById('guide-deep-dive-content');
      if (contentEl) contentEl.classList.add('hidden');
      const btn = document.getElementById('guide-deep-dive-btn');
      if (btn) {
        btn.classList.remove('bg-[#F6821F]', 'text-white', 'border-[#F6821F]');
        btn.classList.add('bg-zinc-900', 'text-zinc-400');
        btn.setAttribute('data-tip', 'Architecture Deep Dive (</>)');
      }
      renderNovaCurrent();
    }

    function novaRunOffered() {
      const actions = { 1: runBenchmark, 2: triggerSwarmWave, 3: testLeaseAcquire, 4: testImmuneAttack, 5: triggerTestRPR };
      const actionFn = actions[currentChapterKey];
      const cta = document.getElementById('guide-cta');
      if (cta) cta.disabled = true;
      if (actionFn) {
        try { actionFn(); } catch (e) { console.error(e); }
      }
    }

    function guideSay(text, onDone) {
      if (!text) { if (onDone) onDone(); return; }
      document.getElementById('guide')?.classList.add('guide-running-compact');
      const textEl = document.getElementById('guide-text');
      const titleEl = document.getElementById('guide-title');
      if (titleEl) titleEl.innerText = "NOVA · LIVE RUNTIME TELEMETRY (COMPACT MODE)";
      if (textEl) textEl.innerHTML = linkifyTerms(text);
      pulseNovaSpeaking();
      if (onDone) try { onDone(); } catch (e) {}
    }

    function updateObjectiveBar() {
      try {
        const next = [1, 2, 3, 4, 5].find((l) => !completedLevels.has(l));
        const txt = document.getElementById('objective-text');
        const cnt = document.getElementById('objective-count');
        if (txt) txt.innerText = next ? `STAGE 0${next}/05 · ${OBJECTIVE[next]}` : 'ALL 5 STAGES VERIFIED · Launch Convergence';
        if (cnt) cnt.innerText = `${completedLevels.size}/5`;
      } catch (e) {}
    }

    window.addEventListener('DOMContentLoaded', () => {
      try { updateObjectiveBar(); } catch (e) {}
      if (window.__e2e) {
        spawnAllLevelsForE2E();
      } else {
        applyQuestGate();
        setTimeout(() => renderNovaCurrent(), 150);
      }
    });

    function initDuelPips() {
      const gitContainer = document.getElementById('duel-git-pips');
      const convContainer = document.getElementById('duel-conv-pips');
      if (!gitContainer || !convContainer) return;
      gitContainer.innerHTML = '';
      convContainer.innerHTML = '';

      for (let i = 1; i <= 25; i++) {
        const gitPip = document.createElement('div');
        gitPip.id = `pip-git-${i}`;
        gitPip.className = 'w-7 h-7 text-[10px] font-mono flex items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold transition-all';
        gitPip.innerText = i;
        gitContainer.appendChild(gitPip);

        const convPip = document.createElement('div');
        convPip.id = `pip-conv-${i}`;
        convPip.className = 'w-7 h-7 text-[10px] font-mono flex items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold transition-all';
        convPip.innerText = i;
        convContainer.appendChild(convPip);
      }
    }
    initDuelPips();


    function drawTopology() {
      const c = getSwarmCanvas();
      if (!c || !ctx) {
        requestAnimationFrame(drawTopology);
        return;
      }
      ctx.clearRect(0, 0, c.width, c.height);
      const cx = c.width / 2;
      const cy = c.height / 2;
      const radius = Math.min(cx, cy) * 0.65;

      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - radius - 20, cy);
      ctx.lineTo(cx + radius + 20, cy);
      ctx.moveTo(cx, cy - radius - 20);
      ctx.lineTo(cx, cy + radius + 20);
      ctx.stroke();

      radarSweepAngle += 0.018;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, radarSweepAngle - 0.35, radarSweepAngle);
      ctx.closePath();
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      sweepGrad.addColorStop(0, 'rgba(246, 130, 31, 0.22)');
      sweepGrad.addColorStop(1, 'rgba(246, 130, 31, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.fill();
      ctx.restore();

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.r += 1.4;
        rip.alpha -= 0.025;
        if (rip.alpha <= 0 || rip.r >= rip.maxR) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = rip.color;
        ctx.globalAlpha = Math.max(0, rip.alpha);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rip.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;
        if (p.progress >= 1) {
          triggerRipple(p.color);
          particles.splice(i, 1);
          continue;
        }
        const curX = p.fromX + (cx - p.fromX) * p.progress;
        const curY = p.fromY + (cy - p.fromY) * p.progress;

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.fromX, p.fromY);
        ctx.lineTo(curX, curY);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(curX, curY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const coreBreathe = Math.sin(Date.now() / 450) * 1.5;
      ctx.save();
      ctx.shadowColor = '#F6821F';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#F6821F';
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + coreBreathe, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DO_SQLITE', cx, cy + 3);

      agents.forEach((ag) => {
        ag.angle += ag.speed;
        const x = cx + Math.cos(ag.angle) * radius;
        const y = cy + Math.sin(ag.angle) * radius;

        ctx.strokeStyle = ag.active ? ag.color : '#27272A';
        ctx.lineWidth = ag.active ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();

        if (ag.active) {
          ctx.save();
          ctx.shadowColor = ag.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = ag.color;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = ag.color;
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = ag.active ? '#FFFFFF' : '#A1A1AA';
        ctx.font = ag.active ? 'bold 10px monospace' : '9px monospace';
        ctx.fillText(ag.name, x, y - 8);
      });

      requestAnimationFrame(drawTopology);
    }
    drawTopology();

