import './styles.css';
import { renderMarkdown } from './markdown.js';
import { FONT_OPTIONS, loadStoredState, saveStoredState } from './state.js';

const app = document.querySelector('#app');
const supportsPwa = 'serviceWorker' in navigator;
const state = loadStoredState(window);

const playback = {
  active: false,
  position: 0,
  velocity: 0,
  lastTime: 0,
  rafId: 0,
};

const elements = {};
let fileInput;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function scheduleSave() {
  saveStoredState({ settings: state.settings, source: state.source });
}

function speedToVelocity(speed, reverse) {
  const base = Math.max(8, speed) / 24;
  return reverse ? -base : base;
}

function stopPlayback(reset = true) {
  playback.active = false;
  playback.velocity = 0;
  playback.lastTime = 0;
  if (playback.rafId) {
    cancelAnimationFrame(playback.rafId);
    playback.rafId = 0;
  }
  if (reset) {
    playback.position = 0;
    updateScroll();
  }
  updatePlaybackUi();
}

function updateScroll() {
  const scroller = elements.scroller;
  if (!scroller) {
    return;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const nextPosition = clamp(playback.position, 0, maxScroll);
  playback.position = nextPosition;
  scroller.scrollTop = nextPosition;
  elements.progress.value = maxScroll > 0 ? String(Math.round((nextPosition / maxScroll) * 1000) / 10) : '0';
  elements.progressLabel.textContent = maxScroll > 0 ? `${Math.round((nextPosition / maxScroll) * 100)}%` : '0%';
}

function updatePlaybackUi() {
  elements.playToggle.textContent = playback.active ? 'Pause' : 'Play';
  elements.stopButton.disabled = !playback.active && playback.position === 0;
  elements.restartButton.disabled = playback.position === 0;
  elements.floatingButton.textContent = state.panelOpen ? 'Close controls' : 'Settings';
  document.body.classList.toggle('playing', playback.active);
}

function animateFrame(now) {
  if (!playback.active) {
    return;
  }

  const delta = playback.lastTime ? (now - playback.lastTime) / 1000 : 0;
  playback.lastTime = now;
  playback.velocity = speedToVelocity(state.settings.speed, state.settings.reverse);
  playback.position += playback.velocity * delta * 100;
  updateScroll();

  const maxScroll = Math.max(0, elements.scroller.scrollHeight - elements.scroller.clientHeight);
  if (playback.position <= 0 || playback.position >= maxScroll) {
    if (state.settings.reverse) {
      playback.position = playback.position <= 0 ? maxScroll : 0;
    } else {
      stopPlayback(false);
      return;
    }
  }

  playback.rafId = requestAnimationFrame(animateFrame);
}

function playPause() {
  if (playback.active) {
    stopPlayback(false);
    return;
  }

  playback.active = true;
  playback.lastTime = 0;
  playback.velocity = speedToVelocity(state.settings.speed, state.settings.reverse);
  playback.rafId = requestAnimationFrame(animateFrame);
  updatePlaybackUi();
}

function restartPlayback() {
  playback.position = 0;
  updateScroll();
  if (!playback.active) {
    updatePlaybackUi();
    return;
  }
  playback.lastTime = 0;
}

function applySettings(nextSettings) {
  state.settings = { ...state.settings, ...nextSettings };
  const root = document.documentElement;
  root.style.setProperty('--text-size', `${state.settings.textSize}px`);
  root.style.setProperty('--line-height', `${state.settings.lineHeight}`);
  root.style.setProperty('--margin-size', `${state.settings.margin}px`);
  root.style.setProperty('--padding-size', `${state.settings.padding}px`);
  root.style.setProperty('--text-color', state.settings.textColor);
  root.style.setProperty('--background-color', state.settings.background);
  root.style.setProperty('--font-family', state.settings.fontFamily);
  root.style.setProperty('--mirror-scale', state.settings.mirror ? '-1' : '1');
  root.dataset.theme = state.settings.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : state.settings.theme;
  elements.editor.classList.toggle('mirror', state.settings.mirror);
  elements.teleprompter.classList.toggle('mirror', state.settings.mirror);
  scheduleSave();
  renderSource();
}

function renderSource() {
  elements.editor.value = state.source;
  elements.preview.innerHTML = renderMarkdown(state.source);
  updatePreviewOffsets();
}

function updatePreviewOffsets() {
  elements.previewContainer.style.padding = `${state.settings.padding}px`;
  elements.preview.style.margin = `${state.settings.margin}px`;
  elements.preview.style.fontSize = `${state.settings.textSize}px`;
  elements.preview.style.lineHeight = `${state.settings.lineHeight}`;
  elements.preview.style.fontFamily = state.settings.fontFamily;
  elements.preview.style.color = state.settings.textColor;
}

function togglePanel(force) {
  state.panelOpen = typeof force === 'boolean' ? force : !state.panelOpen;
  elements.panel.hidden = !state.panelOpen;
  elements.floatingButton.setAttribute('aria-expanded', String(state.panelOpen));
  updatePlaybackUi();
}

function setThemeFromSystem() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applySettings({ theme: prefersDark ? 'dark' : 'light' });
}

function syncThemeClass() {
  document.documentElement.dataset.theme = state.settings.theme;
}

function handleUpload(file) {
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.source = String(reader.result || '');
    renderSource();
    scheduleSave();
  };
  reader.readAsText(file);
}

function buildApp() {
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Teleprompter</p>
          <h1>Markdown teleprompter</h1>
          <p class="subhead">Responsive, offline-ready, and tuned for native-like playback.</p>
        </div>
        <div class="topbar-actions">
          <button class="ghost" id="installButton" hidden>Install app</button>
          <button class="primary" id="playToggle">Play</button>
          <button class="ghost" id="stopButton">Stop</button>
          <button class="ghost" id="restartButton">Restart</button>
        </div>
      </header>

      <main class="workspace">
        <section class="editor-pane" aria-label="Markdown input">
          <div class="pane-header">
            <h2>Script</h2>
            <label class="file-button">
              Upload Markdown
              <input id="fileInput" type="file" accept=".md,.markdown,text/markdown,text/plain" hidden />
            </label>
          </div>
          <textarea id="editor" spellcheck="false"></textarea>
        </section>

        <section class="viewer-pane" aria-label="Teleprompter playback">
          <div class="teleprompter-shell" id="teleprompterShell">
            <div class="teleprompter-stage" id="scroller">
              <div class="teleprompter-content" id="previewContainer">
                <article id="preview"></article>
              </div>
            </div>
          </div>
          <div class="playback-bar">
            <label>Progress <input id="progress" type="range" min="0" max="100" value="0" /></label>
            <span id="progressLabel">0%</span>
          </div>
        </section>
      </main>

      <button class="floating-button" id="floatingButton" aria-expanded="false">Settings</button>

      <aside class="panel" id="panel" hidden>
        <div class="panel-grid">
          <label>Text size <input id="textSize" type="range" min="20" max="120" step="1" /></label>
          <label>Scroll speed <input id="speed" type="range" min="4" max="80" step="1" /></label>
          <label>Line spacing <input id="lineHeight" type="range" min="1.1" max="2.0" step="0.05" /></label>
          <label>Margin <input id="margin" type="range" min="0" max="120" step="1" /></label>
          <label>Padding <input id="padding" type="range" min="0" max="120" step="1" /></label>
          <label>Font family <select id="fontFamily"></select></label>
          <label>Theme <select id="theme">
            <option value="auto">Auto</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select></label>
          <label>Text color <input id="textColor" type="color" /></label>
          <label>Background <input id="background" type="color" /></label>
          <label class="toggle"><input id="mirror" type="checkbox" /> Mirror mode</label>
          <label class="toggle"><input id="reverse" type="checkbox" /> Reverse playback</label>
        </div>
      </aside>
    </div>
  `;

  elements.playToggle = document.querySelector('#playToggle');
  elements.stopButton = document.querySelector('#stopButton');
  elements.restartButton = document.querySelector('#restartButton');
  elements.editor = document.querySelector('#editor');
  elements.preview = document.querySelector('#preview');
  elements.previewContainer = document.querySelector('#previewContainer');
  elements.scroller = document.querySelector('#scroller');
  elements.teleprompter = document.querySelector('#teleprompterShell');
  elements.floatingButton = document.querySelector('#floatingButton');
  elements.panel = document.querySelector('#panel');
  elements.progress = document.querySelector('#progress');
  elements.progressLabel = document.querySelector('#progressLabel');
  elements.textSize = document.querySelector('#textSize');
  elements.speed = document.querySelector('#speed');
  elements.lineHeight = document.querySelector('#lineHeight');
  elements.margin = document.querySelector('#margin');
  elements.padding = document.querySelector('#padding');
  elements.fontFamily = document.querySelector('#fontFamily');
  elements.theme = document.querySelector('#theme');
  elements.textColor = document.querySelector('#textColor');
  elements.background = document.querySelector('#background');
  elements.mirror = document.querySelector('#mirror');
  elements.reverse = document.querySelector('#reverse');
  fileInput = document.querySelector('#fileInput');
  const installButton = document.querySelector('#installButton');

  FONT_OPTIONS.forEach((font) => {
    const option = document.createElement('option');
    option.value = font.value;
    option.textContent = font.label;
    elements.fontFamily.appendChild(option);
  });

  elements.playToggle.addEventListener('click', playPause);
  elements.stopButton.addEventListener('click', () => stopPlayback(true));
  elements.restartButton.addEventListener('click', restartPlayback);
  elements.editor.addEventListener('input', (event) => {
    state.source = event.target.value;
    renderSource();
    scheduleSave();
  });
  elements.progress.addEventListener('input', (event) => {
    const maxScroll = Math.max(0, elements.scroller.scrollHeight - elements.scroller.clientHeight);
    playback.position = (Number(event.target.value) / 100) * maxScroll;
    updateScroll();
  });
  elements.floatingButton.addEventListener('click', () => togglePanel());
  document.addEventListener('keydown', handleKeyboardShortcuts);
  elements.scroller.addEventListener('scroll', () => {
    if (!playback.active) {
      const maxScroll = Math.max(0, elements.scroller.scrollHeight - elements.scroller.clientHeight);
      playback.position = elements.scroller.scrollTop;
      elements.progress.value = maxScroll > 0 ? String(Math.round((playback.position / maxScroll) * 1000) / 10) : '0';
      elements.progressLabel.textContent = maxScroll > 0 ? `${Math.round((playback.position / maxScroll) * 100)}%` : '0%';
    }
  });

  [elements.textSize, elements.speed, elements.lineHeight, elements.margin, elements.padding, elements.fontFamily, elements.theme, elements.textColor, elements.background, elements.mirror, elements.reverse].forEach((control) => {
    control.addEventListener('input', () => {
      applySettings({
        textSize: Number(elements.textSize.value),
        speed: Number(elements.speed.value),
        lineHeight: Number(elements.lineHeight.value),
        margin: Number(elements.margin.value),
        padding: Number(elements.padding.value),
        fontFamily: elements.fontFamily.value,
        theme: elements.theme.value,
        textColor: elements.textColor.value,
        background: elements.background.value,
        mirror: elements.mirror.checked,
        reverse: elements.reverse.checked,
      });
    });
  });

  fileInput.addEventListener('change', (event) => handleUpload(event.target.files && event.target.files[0]));

  if (supportsPwa) {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      window.deferredInstallPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener('click', async () => {
      if (!window.deferredInstallPrompt) {
        return;
      }
      window.deferredInstallPrompt.prompt();
      await window.deferredInstallPrompt.userChoice;
      window.deferredInstallPrompt = null;
      installButton.hidden = true;
    });
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).catch(() => {});
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setThemeFromSystem);

  applySettings(state.settings);
  renderSource();
  togglePanel(false);
  updatePlaybackUi();
}

function handleKeyboardShortcuts(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
    event.preventDefault();
    fileInput.click();
    return;
  }
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault();
    playPause();
    return;
  }
  if (event.key === 'Escape') {
    stopPlayback(true);
    togglePanel(false);
    return;
  }
  if (event.key === 'Home') {
    playback.position = 0;
    updateScroll();
    return;
  }
  if (event.key === 'End') {
    playback.position = elements.scroller.scrollHeight - elements.scroller.clientHeight;
    updateScroll();
    return;
  }
  if (event.key === 'ArrowUp') {
    playback.position -= 80;
    updateScroll();
    return;
  }
  if (event.key === 'ArrowDown') {
    playback.position += 80;
    updateScroll();
  }
}

buildApp();
