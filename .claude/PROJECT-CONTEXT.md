# KRBS site — project context

Read this before doing anything in this repo. It's written so a Claude session with no
memory of prior conversations — including Richard's own sessions — can understand what
this project is, why it's built the way it is, and what's actually in progress right now.

## Who's involved

- **Koala Rescue Brisbane South Inc. (KRBS)** — a volunteer-run koala rescue charity.
  Richard Unwin is president.
- **Kristie (Hyperfocus Creatives)** — builds and maintains this site pro bono.
- **Richard** — not a developer, but medium-skilled with Claude. He's being given a
  project skill (`krbs-site-editor`, see below) so he can make simple content changes
  himself without Kristie in the loop every time.

## What this site is

A static Eleventy (11ty) site, deployed on Netlify from this repo
(`kristie-hyperfocus/koala-rescue-site`), serving `koalarescuebrisbanesouth.org.au`.

- Pages are Nunjucks templates in `src/*.njk`, sharing one layout and nav/footer via
  `src/_includes/`.
- The committee list on the About page is fetched at build time from a published Google
  Sheet CSV (`src/_data/committee.js`) — not hardcoded, so committee changes are a Sheet
  edit, never a code edit.
- The Facebook feed on the home page is fetched server-side from the Graph API
  (`src/_data/facebookPosts.js`), same fetch-at-build-time pattern.
- This replaced an older set of 6 flat, hand-written HTML files with duplicated
  nav/footer in every file — that migration shipped Nov 2026 (merged via PR #1).

## The trap camera viewer — the current main thread of work

KRBS runs a 4G trail camera on koala traps. It emails photos to a dedicated mailbox
(`eft@antl.com.au`, IMAP/SMTP on `mail.antl.com.au`), which **used to** be polled by a
separate WordPress install (the Postie plugin turned each email into a WP post; two
WordPress page-passwords gated viewing vs. deleting).

**Why it's being rebuilt:** the recent wave of WordPress-targeted attacks ("Black
October") made WordPress's attack surface (PHP, plugins, exposed admin login, database)
a real concern. Richard sent a developer overview PDF
(`KRBS_Trap_Viewer_Developer_Overview.pdf`) written specifically to support rebuilding
this feature on a different stack — critically, it confirmed **the camera never talks to
the website**, it only ever talks to that mailbox. That decoupling is what makes a
rebuild possible without touching the camera at all.

**What replaced it**, built entirely as Netlify Functions alongside this same static
site — no new hosting provider, no database:

- `netlify/functions/trap-ingest.mts` — a Scheduled Function (every 5 min) that polls
  the mailbox over IMAP, allow-lists the sender, stores each photo in **Netlify Blobs**,
  and appends a record to a JSON index (also in Blobs).
- `netlify/functions/trap-login.mts`, `trap-gallery.mts`, `trap-image.mts`,
  `trap-delete.mts` — cookie-based auth (HMAC-signed session, two roles: viewer / admin)
  and the gallery/delete API.
- `src/trap-viewer.njk` (volunteers, view-only) and `src/trap-manager.njk`
  (committee, can delete) — the two private, `noindex`, password-gated pages.
- Images are only ever served through an authenticated function — a deliberate
  improvement over WordPress, which served them as public static files regardless of
  the page password.

**Current status:** code is built and verified (full auth flow tested locally and
against a live Netlify deploy preview), sitting in
[PR #2](https://github.com/kristie-hyperfocus/koala-rescue-site/pull/2) on branch
`trap-viewer-rebuild`. **Not merged, main untouched.** It's blocked on:

1. IMAP credentials for the mailbox (host/port already known; need the actual
   username/password — Richard has these, or knows who does).
2. The camera's exact sending address, for the allow-list.
3. New viewer and admin/delete passwords.
4. **The actual cutover is the risky step**: the new ingest function and WordPress's
   Postie plugin cannot both poll the same mailbox at once without racing each other for
   messages. This needs a coordinated moment with Richard — Postie/WP cron off, then
   merge, then confirm a real test photo comes through the new system — before
   WordPress can be retired. Nothing is at risk of being lost as long as this sequencing
   is followed; the risk is specifically in a sloppy, uncoordinated switch.

The full build plan (architecture rationale, env var names, rollout steps, verification
checklist) lives at `~/.claude/plans/nested-orbiting-karp.md` — read it for implementation
detail beyond this summary.

## The "Richard can edit the site himself" initiative

Separate from the trap viewer work. The goal: let Richard make small content changes
(wording, swapping a photo) without a full conversation with Kristie each time, while
keeping the things that would break the whole site (shared layout, build config, and —
critically — the trap viewer's security-sensitive code) off-limits to self-serve edits.

- `.claude/skills/krbs-site-editor/SKILL.md` — the project skill governing what's safe
  to edit directly, what goes through the committee Sheet instead of code, and what
  needs Kristie's sign-off first. Already includes the trap viewer files as explicitly
  off-limits.
- `.claude/skills/krbs-setup/SKILL.md` — a one-time setup/environment check, meant to
  run before `krbs-site-editor` ever does anything, so Richard (or anyone new) finds out
  what's missing before trying to make an edit.
- `RICHARD-GUIDE.md` — a plain-English, non-technical walkthrough for Richard: get a
  GitHub account, install Claude Code, clone the repo, how a change actually flows
  (branch → PR → Netlify deploy preview → merge).
- **Open decision, not yet settled**: should Richard's edits always go through a PR
  (safer, but our own commit history shows Kristie mostly pushes small content changes
  straight to `main`), or should his workflow match that once he's proven reliable?
  Currently the skill defaults to the stricter PR-always path.
- **Not yet done**: Richard hasn't been added as a GitHub collaborator on this repo yet.
  See `scripts/grant-collaborator.sh` for the one-command way to do that once Kristie has
  his GitHub username.

## Loose ends worth knowing about

- `RICHARD-GUIDE.md`, `.claude/launch.json`, and 19 new photos in `src/website-images/`
  are untracked (not committed) as of this writing. The photos aren't wired into any
  page yet — nobody's confirmed where they should go.
- Netlify project name: `koala-rescue-brisbane-south`, on a Pro team plan (confirmed —
  no plan-tier blockers for Scheduled Functions or Blobs).
