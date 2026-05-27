# SwipeTrash

SwipeTrash is a small desktop app for cleaning old files a few decisions at a time.
It scans safe candidates from Documents and Downloads, shows a large preview card,
then lets you swipe right to keep the file or left to move it to the system trash.

The app is built with Electron, React, and Vite. It runs on macOS, Windows, and Linux.

## Download

Installers are published from GitHub Releases:

- macOS: `.dmg`
- Windows: `.exe`
- Linux: `.AppImage` and `.deb`

The current builds are unsigned. macOS Gatekeeper and Windows SmartScreen may show
a warning on first launch until the project has signing certificates.

## Safety model

- Files are moved to the system trash, not permanently deleted.
- The scanner only looks at the OS Documents and Downloads folders.
- Hidden files, application folders, game/mod assets, dependency folders, caches,
  source/build folders, keys, databases, and sensitive names are skipped.
- The renderer has no Node.js access. File actions go through a narrow Electron IPC bridge.

## Development

```bash
npm install
npm run dev
```

## Packaging locally

```bash
npm run package
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Local installers are written to `release/`.

For public releases, push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will build native installers on macOS, Windows, and Linux and attach
them to the GitHub release.

## License

MIT
