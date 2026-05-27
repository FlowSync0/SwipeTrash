# SwipeTrash Launch Submissions

SwipeTrash is ready to share publicly through GitHub Releases. This tracker keeps
the launch focused on places where people actually discover small desktop apps.

## Current Links

- Repository: https://github.com/FlowSync0/SwipeTrash
- Latest release: https://github.com/FlowSync0/SwipeTrash/releases/latest
- Issues: https://github.com/FlowSync0/SwipeTrash/issues
- License: MIT
- Platforms: macOS, Windows, Linux
- Installers: `.dmg`, `.zip`, `.exe`, `.AppImage`, `.deb`

## Assets To Prepare

- 1 short demo video or GIF showing swipe left to trash and swipe right to keep.
- 3 screenshots: main card, settings, final daily goal state.
- 1 square app icon: `build/icon.png`.
- 1 trust paragraph: files are moved to the system trash, not permanently deleted.
- 1 known limitation paragraph: current builds are unsigned, so macOS Gatekeeper
  and Windows SmartScreen may warn on first launch.

## Priority Submissions

| Priority | Channel | Link | Fit | Submit | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | GitHub Release | https://github.com/FlowSync0/SwipeTrash/releases/latest | Source of truth for installers | Release assets + README | Done | Keep this as the canonical download until a website exists. |
| P0 | GitHub Topics | https://github.com/FlowSync0/SwipeTrash | Open-source discovery | Topics + README | Done | Topics already cover desktop, file management, and all OSes. |
| P0 | Product Hunt | https://www.producthunt.com/ | Launch audience for small productivity tools | Product page, screenshots, short video, maker comment | Todo | Best once a polished demo GIF/video exists. |
| P0 | Hacker News - Show HN | https://news.ycombinator.com/submit | Technical audience, good for open source | Title + short story + GitHub link | Todo | Keep it honest and technical. Do not over-market. |
| P0 | AlternativeTo | https://alternativeto.net/ | Evergreen discovery for software alternatives | App listing, platforms, open-source license | Todo | Useful for long-tail search once accepted. |
| P1 | Reddit r/macapps | https://www.reddit.com/r/macapps/ | Mac users who like small utilities | Native-feeling Mac post + release link | Todo | Read subreddit rules before posting. Mention unsigned build clearly. |
| P1 | Reddit r/SideProject | https://www.reddit.com/r/SideProject/ | Friendly launch feedback | Story + demo + GitHub link | Todo | Ask for product feedback, not just installs. |
| P1 | Reddit r/opensource | https://www.reddit.com/r/opensource/ | Open-source audience | Source-first post | Todo | Lead with MIT license and safety model. |
| P1 | Indie Hackers | https://www.indiehackers.com/ | Maker audience | Build story + launch thread | Todo | Useful for feedback and early users. |
| P1 | Uneed | https://www.uneed.best/ | Product directory | Product listing | Todo | Good for clean indie tools; requires account/submission flow. |
| P1 | DevHunt | https://devhunt.org/ | Developer product discovery | Product listing | Todo | Works best with a concise product page and demo media. |
| P2 | BetaList | https://betalist.com/submit | Startup/product discovery | Product listing | Todo | Better after there is a landing page. |
| P2 | MacUpdate | https://www.macupdate.com/developers | Mac software directory | Mac app listing | Todo | Stronger after signing/notarization. |
| P2 | SourceForge | https://sourceforge.net/ | Open-source hosting/discovery | Project mirror | Todo | Optional mirror if GitHub is not enough. |
| P2 | FossHub | https://www.fosshub.com/ | Software download mirror | Project application | Todo | Usually better once there is demand and signed builds. |
| P3 | Softpedia | https://www.softpedia.com/ | Download directory | Software listing | Todo | Optional; verify listing requirements before spending time. |

## Package Manager Roadmap

These are not launch communities, but they make the app easier to install.

| Priority | Channel | Link | Fit | Requirement | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | WinGet | https://github.com/microsoft/winget-pkgs | Windows install command | Stable `.exe` release URL | Todo | Test silent NSIS install/uninstall before submission. |
| P1 | Homebrew Cask | https://docs.brew.sh/Adding-Software-to-Homebrew | macOS install command | Stable `.dmg`/`.zip`, checksums, notability | Todo | If official cask is rejected, create `FlowSync0/homebrew-tap`. |
| P2 | Chocolatey | https://docs.chocolatey.org/en-us/create/create-packages/ | Windows package ecosystem | Chocolatey package + moderation | Todo | Useful after first users ask for it. |
| P2 | Snapcraft | https://snapcraft.io/docs/electron-apps | Linux install command | Snap package metadata | Todo | Add `snap` target to electron-builder if chosen. |
| P2 | Flathub | https://docs.flathub.org/docs/for-app-authors/submission | Linux app store | Flatpak manifest + AppStream metadata | Todo | More work because file-system access must be documented carefully. |
| P3 | AppImageHub | https://www.appimagehub.com/ | Linux AppImage discovery | AppImage + metadata | Todo | Optional, since GitHub already hosts the AppImage. |

## Recommended Order

1. Add demo media and a simple landing page or GitHub Pages page.
2. Post to Product Hunt, Show HN, Reddit, AlternativeTo, Uneed, and DevHunt.
3. Submit WinGet and create a Homebrew tap.
4. Add Snap/Flatpak only if Linux users ask for package-manager installs.
5. Submit to MacUpdate/FossHub/Softpedia after code signing/notarization.

## Trust Checklist

- Explain that SwipeTrash moves files to trash instead of permanently deleting.
- Explain which folders are scanned by default.
- Explain which paths are excluded to avoid app/game/system files.
- Show the app reviewing a harmless file in the demo.
- Keep unsigned build warnings visible until signing is solved.

## Reference Pages

- Product Hunt posting guide: https://help.producthunt.com/en/articles/479557-how-to-post-a-product
- Hacker News Show HN guidelines: https://news.ycombinator.com/showhn.html
- Homebrew adding software: https://docs.brew.sh/Adding-Software-to-Homebrew
- Windows Package Manager submission: https://learn.microsoft.com/en-us/windows/package-manager/package/repository
- Chocolatey package creation: https://docs.chocolatey.org/en-us/create/create-packages/
- Snapcraft Electron apps: https://snapcraft.io/docs/electron-apps/
- Flathub app submission: https://docs.flathub.org/docs/for-app-authors/submission
