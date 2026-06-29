const STORAGE_KEYS = {
  settings: 'teleprompter.settings.v1',
  source: 'teleprompter.source.v1',
};

const DEFAULT_SOURCE = `# Teleprompter ready

Paste or upload Markdown on the left, then press **Play**.

- Headings, lists, and emphasis render cleanly.
- Links stay clickable in the editor preview.
- Code blocks keep their spacing and alignment.

Use the controls to tune speed, type size, theme, and layout for the current screen.


after a blank line, text still flows naturally.
`;

const FONT_OPTIONS = [
  { label: 'Aptos', value: 'Aptos, "Segoe UI", sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", system-ui, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Merriweather', value: 'Merriweather, Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

function getSystemTheme(windowObject) {
  return windowObject.matchMedia && windowObject.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getDeviceProfile(windowObject) {
  const width = windowObject.innerWidth;
  const height = windowObject.innerHeight;
  const shortSide = Math.min(width, height);
  const landscape = width > height;
  const systemTheme = getSystemTheme(windowObject);

  if (shortSide < 700) {
    return landscape
      ? {
          kind: 'phone-landscape',
          textSize: 46,
          lineHeight: 1.34,
          speed: 24,
          margin: 14,
          padding: 18,
          fontFamily: FONT_OPTIONS[0].value,
          theme: systemTheme,
          background: systemTheme === 'dark' ? '#0b1220' : '#f8fafc',
          textColor: systemTheme === 'dark' ? '#f8fafc' : '#0f172a',
        }
      : {
          kind: 'phone-portrait',
          textSize: 54,
          lineHeight: 1.46,
          speed: 18,
          margin: 16,
          padding: 20,
          fontFamily: FONT_OPTIONS[0].value,
          theme: systemTheme,
          background: systemTheme === 'dark' ? '#0b1220' : '#f8fafc',
          textColor: systemTheme === 'dark' ? '#f8fafc' : '#0f172a',
        };
  }

  if (shortSide < 1024) {
    return {
      kind: 'tablet',
      textSize: 60,
      lineHeight: 1.5,
      speed: 22,
      margin: 22,
      padding: 28,
      fontFamily: FONT_OPTIONS[0].value,
      theme: systemTheme,
      background: systemTheme === 'dark' ? '#0d1324' : '#fcfcfd',
      textColor: systemTheme === 'dark' ? '#f8fafc' : '#0f172a',
    };
  }

  if (shortSide < 1440) {
    return {
      kind: 'laptop',
      textSize: 66,
      lineHeight: 1.56,
      speed: 28,
      margin: 28,
      padding: 32,
      fontFamily: FONT_OPTIONS[0].value,
      theme: systemTheme,
      background: systemTheme === 'dark' ? '#0a1020' : '#f8fafc',
      textColor: systemTheme === 'dark' ? '#f8fafc' : '#0f172a',
    };
  }

  return {
    kind: 'desktop',
    textSize: 72,
    lineHeight: 1.62,
    speed: 32,
    margin: 32,
    padding: 40,
    fontFamily: FONT_OPTIONS[0].value,
    theme: systemTheme,
    background: systemTheme === 'dark' ? '#090f1d' : '#fbfbfc',
    textColor: systemTheme === 'dark' ? '#f8fafc' : '#0f172a',
  };
}

function createDefaultSettings(windowObject) {
  const profile = getDeviceProfile(windowObject);

  return {
    profile: profile.kind,
    theme: profile.theme,
    fontFamily: profile.fontFamily,
    textSize: profile.textSize,
    lineHeight: profile.lineHeight,
    speed: profile.speed,
    margin: profile.margin,
    padding: profile.padding,
    textColor: profile.textColor,
    background: profile.background,
    mirror: false,
    reverse: false,
  };
}

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadStoredState(windowObject) {
  const defaults = createDefaultSettings(windowObject);
  const storedSettings = readJson(STORAGE_KEYS.settings);
  const storedSource = window.localStorage.getItem(STORAGE_KEYS.source);

  return {
    settings: {
      ...defaults,
      ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}),
    },
    source: storedSource || DEFAULT_SOURCE,
  };
}

function saveStoredState(state) {
  window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  window.localStorage.setItem(STORAGE_KEYS.source, state.source);
}

export { DEFAULT_SOURCE, FONT_OPTIONS, createDefaultSettings, getDeviceProfile, loadStoredState, saveStoredState };
