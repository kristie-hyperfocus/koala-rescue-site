---
name: krbs-setup
description: Run once, the first time this repo is opened in Claude Code on a new machine (especially Richard's) — checks what's installed, what access is missing, and tells the person exactly what to fix before using krbs-site-editor. Also answers "what does Richard need" for Kristie.
---

# KRBS site: first-time setup check

Read `.claude/PROJECT-CONTEXT.md` first for the full picture of this project if you
haven't already this session. This skill is just the preflight check — it does not edit
any site content. Once it reports "ready," hand off to the `krbs-site-editor` skill for
actual changes.

## What Richard needs, end to end

Answer this plainly if asked, or when running the checks below:

1. **A GitHub account** — free, at github.com. No specific plan needed.
2. **Collaborator access to this repo** (`kristie-hyperfocus/koala-rescue-site`) —
   Kristie has to grant this; he can't self-serve it. She has a one-command script for
   this: `scripts/grant-collaborator.sh` (see `PROJECT-CONTEXT.md`). If a check below
   shows push access is missing, that's the most likely reason — tell the person to ask
   Kristie, don't try to work around it.
3. **Claude Code installed** on his own machine — from claude.com/claude-code.
4. **Git installed** — usually already present on macOS/Linux; Claude Code's own install
   docs cover Windows.
5. **A Netlify account — NOT needed.** Deploy previews from a pull request are public
   links, no login required to view them. Only Kristie needs Netlify account access
   (she manages environment variables and production settings). Say this explicitly if
   asked — it's a common assumption to double-check.
6. **Node/npm — not required** for ordinary content edits (wording, images). Only
   useful if he wants to preview locally before pushing; the PR's Netlify deploy preview
   covers this anyway, so don't treat Node as a blocker.

## Checks to run

Run these and report the results plainly — don't just say "done," show what passed and
what didn't:

1. **Git is installed:**
   ```bash
   git --version
   ```
2. **This is actually a clone of the right repo:**
   ```bash
   git remote -v
   ```
   Expect `kristie-hyperfocus/koala-rescue-site` in the output. If it's a different repo
   or there's no remote at all, stop here — something's wrong with how the repo was
   cloned, not with access.
3. **Push access actually works** (this is the one that depends on Kristie having
   granted collaborator access):
   ```bash
   git fetch origin
   git ls-remote origin
   ```
   If this fails with a permission/authentication error, Richard doesn't have access
   yet — that's expected until Kristie runs her grant script, not a sign anything is
   broken on his end. Don't try `git push` as a test — that could create junk commits;
   `git ls-remote` is read-only and enough to prove auth works.
4. **GitHub CLI auth status, if `gh` is installed** (optional but makes opening PRs
   easier):
   ```bash
   gh auth status
   ```
   If `gh` isn't installed, that's fine — note it, don't treat it as required. PRs can
   also be opened from github.com directly.

## Reporting back

Summarize as a short checklist: what passed, what's missing, and the one specific next
action for whatever's missing (almost always "ask Kristie to run her grant script" or
"install Claude Code from claude.com/claude-code"). Once everything passes, say so
clearly and point to `RICHARD-GUIDE.md` for how an actual edit works, or hand off
directly to the `krbs-site-editor` skill if he's ready to make a change right now.
