# teleprompter

A responsive Markdown teleprompter web app built as an installable SPA/PWA for Android and Windows. Paste or upload scripts, then play with smooth scrolling, auto-optimized defaults for device size and orientation, dark/light themes, and full controls for text size, speed, and margins hidden behind a compact playback menu.

## Features

- Paste or upload Markdown and render it as teleprompter-friendly output.
- Playback controls for play, pause, stop, restart, progress, and speed.
- Customization for text size, line spacing, font family, text color, background, margin, padding, mirror mode, and reverse playback.
- Responsive layout for phones, tablets, laptops, and desktops.
- Local persistence for script content and user settings.
- PWA installability and offline support.
- Keyboard shortcuts and touch-friendly controls.

## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm run preview
```

## GitHub Pages

This app is configured for static hosting. Build it with `npm run build` and publish the generated `dist/` folder to GitHub Pages. The Vite base path and all PWA URLs are relative, so the same build works from a project subpath without a backend.

## Architecture Notes

- `src/main.js` owns the app shell, playback loop, keyboard handling, upload flow, and panel toggling.
- `src/markdown.js` converts Markdown to sanitized HTML with `marked` and `DOMPurify`.
- `src/state.js` provides device-aware defaults and persistence helpers backed by `localStorage`.
- `public/sw.js` caches the app shell for offline usage, and `public/manifest.webmanifest` makes the app installable.

The UI intentionally keeps the customization panel hidden during playback behind a single floating button, so the teleprompter stays focused and uncluttered.
