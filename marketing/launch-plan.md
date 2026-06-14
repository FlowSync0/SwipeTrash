# SwipeTrash Launch Plan

## Positioning

SwipeTrash helps people keep their computer clean in 30 seconds a day by turning old Downloads and Documents cleanup into a quick keep-or-trash swipe session.

Core angle: avoid the giant cleanup afternoon. Open the app once a day, clear a few forgotten files, and keep the machine feeling fresh without making file cleanup a project.

Primary audience:
- Mac, Windows, and Linux users with messy Downloads folders.
- Indie makers, students, developers, designers, and creators who download many screenshots, archives, exports, and installers.
- People who distrust aggressive cleaner apps but still want a lightweight ritual.

Tone:
- Direct, practical, calm.
- Show the workflow, not hype.
- Lead with the daily habit and safety: files go to the system trash, not permanent delete.

## Assets

- Repository: https://github.com/FlowSync0/SwipeTrash
- Latest release: https://github.com/FlowSync0/SwipeTrash/releases/latest
- Demo GIF: `docs/assets/swipetrash-demo.gif`
- Demo WebM: `docs/assets/swipetrash-demo.webm`
- Icon PNG: `build/icon.png`
- Platforms: macOS, Windows, Linux
- License: MIT
- Status note: builds are currently unsigned, so macOS Gatekeeper and Windows SmartScreen may warn on first launch.

## Launch Sequence

### Day 0: Readiness

- Confirm `v0.1.3` release assets are attached for macOS, Windows, and Linux.
- Check the README renders the demo GIF inline on GitHub.
- Make sure the latest release notes mention the safer filters, compact default size, and system-trash behavior.
- Prepare screenshots from macOS plus one narrow-window screenshot.

### Day 1: High-Intent Developer And Maker Channels

- Product Hunt: launch with demo GIF, clear tagline, and first maker comment.
- Hacker News: post a Show HN only after release assets are downloadable and the demo is visible.
- Indie Hackers: write a build-in-public post about turning cleanup into a tiny daily habit.
- X / LinkedIn: post the short launch copy with the GIF.

### Day 2: Desktop App Discovery

- AlternativeTo: submit as a free, open-source utility app for macOS, Windows, and Linux.
- Reddit r/macapps: post only if the account meets current subreddit rules; avoid asking for upvotes.
- Reddit r/SideProject: share the story and ask for feedback on the safety model.
- Reddit r/opensource: share after the GitHub release is stable.

### Day 3-5: Directories

- Uneed.
- Microlaunch.
- Peerlist Launchpad.
- DevHunt, if positioning is framed as an open-source maker tool.
- Tiny Startups.
- Fazier.
- BetaList, if positioning as beta/early-access is acceptable.
- Smol Launch.
- Launching Next.

### Day 6-7: Content

- Publish a short dev.to article: "I built a Tinder-style file cleanup app so I would stop postponing my Downloads folder."
- Publish a changelog-style post on GitHub Discussions or the README release notes.
- Ask for feedback from a small set of Mac/productivity creators with the short outreach message from `submission-kit.md`.

## Account Checklist

I cannot create accounts or pass CAPTCHA/email verification autonomously. Use this checklist with your own email/identity:

- Product Hunt maker account.
- Hacker News account with enough trust to avoid immediate filtering.
- Indie Hackers account.
- Reddit account with subreddit-specific karma where needed.
- AlternativeTo account.
- Uneed account.
- Microlaunch account.
- Peerlist account.
- Dev.to account.
- X / LinkedIn accounts if you want social distribution.

## Platform Notes

- Product Hunt's own launch guide says to log in and submit a new product URL from the product submission flow. Prepare tagline, media, makers, and first comment before launch.
- Hacker News Show HN is a fit because SwipeTrash is something people can download and run on their own computers.
- AlternativeTo accepts new software through "Suggest new application" and then verifies submissions.
- Uneed allows starting from a product URL and then asks for sign-up to save the submission.
- r/macapps permits limited self-promotion, but current rules include frequency and account/karma constraints.

## Risks

- Unsigned installers will reduce conversion. Put the warning near download links and release notes until signing certificates are available.
- A GitHub-only landing page is acceptable for early launch, but Product Hunt and directories may convert better with a simple one-page site later.
- The app touches user files, so every post should mention safety plainly: system trash, skipped sensitive locations, no permanent deletion.
- Do not mass-post identical copy. Communities respond better to a native post that asks for specific feedback.

## Success Metrics

- GitHub stars and release downloads by platform.
- Issues opened with useful feedback.
- Product Hunt comments and launch traffic.
- HN / Reddit comments that reveal confusion about safety or positioning.
- Directory approvals and referral traffic over 30 days.

