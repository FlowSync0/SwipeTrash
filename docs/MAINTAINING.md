# Maintaining SwipeTrash

This document is for maintainers and contributors. The public README stays
focused on end users.

## Development

```bash
npm install
npm run dev
```

## Local Packaging

```bash
npm run package
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Local installers are written to `release/`.

## Public Releases

Push a version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions builds native installers on macOS, Windows, and Linux and
attaches them to the GitHub release.

## Launch Planning

- [Launch submissions](LAUNCH_SUBMISSIONS.md)
- [Pitch kit](PITCH_KIT.md)
