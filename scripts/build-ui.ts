import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function buildDashboardHtml(): string {
  const baseDir = join(process.cwd(), 'src', 'ui');

  const readComponent = (relPath: string) => readFileSync(join(baseDir, relPath), 'utf-8');

  // Styles & Components
  const mainCss = readComponent('styles/main.css');
  let headHtml = readComponent('components/head.html');
  const claudeSwarmJs = readComponent('scripts/claude-swarm.js');
  const headerHtml = readComponent('components/header.html');
  const questViewHtml = readComponent('components/quest-view.html');
  const platformViewHtml = readComponent('components/platform-view.html');
  const novaDrawerHtml = readComponent('components/nova-drawer.html');
  const termModalHtml = readComponent('components/term-modal.html');
  const toastsHtml = readComponent('components/toasts.html');

  // Modular Client Scripts
  const stateJs = readComponent('scripts/state.js');
  const glossaryJs = readComponent('scripts/glossary-data.js');
  const questEngineJs = readComponent('scripts/quest-engine.js');
  const platformEngineJs = readComponent('scripts/platform-engine.js');
  const novaEngineJs = readComponent('scripts/nova-engine.js');
  const appBootstrapJs = readComponent('scripts/app-bootstrap.js');

  // Inject CSS and early Swarm Multiplexer into Head
  headHtml = headHtml.replace('<!-- CLAUDE_SWARM -->', claudeSwarmJs);
  headHtml = headHtml.replace('<!-- STYLES -->', mainCss);

  const bundledScripts = [
    stateJs,
    glossaryJs,
    questEngineJs,
    platformEngineJs,
    novaEngineJs,
    appBootstrapJs
  ].join('\n\n// ---------------------------------------------------------------------\n\n');

  const fullHtml = [
    headHtml,
    headerHtml,
    questViewHtml,
    platformViewHtml,
    novaDrawerHtml,
    termModalHtml,
    toastsHtml,
    '  <script>',
    bundledScripts,
    '  </script>',
    '</body>',
    '</html>'
  ].join('\n');

  const outPath = join(baseDir, 'dashboard.html');
  writeFileSync(outPath, fullHtml, 'utf-8');
  console.log(`[build-ui] Successfully compiled modular UI -> ${outPath} (${fullHtml.length} bytes)`);
  return fullHtml;
}

if (process.argv[1] && process.argv[1].endsWith('build-ui.ts')) {
  buildDashboardHtml();
}
