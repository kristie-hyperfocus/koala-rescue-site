---
name: krbs-site-editor
description: Use whenever editing the Koala Rescue Brisbane South website (this repo) for Richard — defines what's safe to change directly, what must go through the committee Google Sheet instead of code, what to never touch without checking with Kristie first, and the branch/PR workflow every change must follow.
---

# Editing the KRBS website

This site is built with Eleventy (11ty). Pages are `.njk` templates in `src/`, sharing a
layout and nav/footer so a global change only needs editing once. Netlify builds and
deploys automatically from the `main` branch on GitHub.

Richard is not a developer. Every change made under this skill must be low-risk,
previewed, and landed through a pull request — never pushed straight to `main`.

## Safe to edit directly

- Page content in `src/index.njk`, `about.njk`, `volunteer.njk`, `donate.njk`,
  `privacy.njk`, `terms.njk`, `thank-you.njk` — wording, headings, adding/removing a
  paragraph, swapping an image, adding a new photo.
- Adding new images to `src/website-images/` and referencing them from a page.
  Match the existing convention: resize/compress large phone photos before adding them
  (the repo's existing images are mostly resized to a sane web width already — don't add
  a multi-megabyte original straight from a phone).

## Goes through the Google Sheet, not a code edit

- The committee list on the About page comes from a published Google Sheet CSV, fetched
  at build time by `src/_data/committee.js` (see the comment at the top of that file for
  the Sheet columns: Name, Role, Email, ACNC Link). **Never hand-edit the committee data
  in code or templates.** If Richard wants to add/remove/update a committee member,
  that's a Sheet edit, not a site edit — point him to the Sheet instead of making a code
  change, even if asked directly.

## Never touch without checking with Kristie first

Stop and ask rather than editing, even if Richard asks for it directly:

- `src/_includes/layouts/base.njk`, `src/_includes/components/nav.njk`,
  `src/_includes/components/footer.njk` — shared across every page; a mistake here
  breaks the whole site at once, not just one page.
- `src/_data/siteConfig.js` — phone number, ABN, email, ACNC link used site-wide.
- `src/_data/facebookPosts.js` — pulls from the Facebook Graph API using env vars set in
  Netlify, not something to hand-edit.
- `netlify.toml`, `.eleventy.js`, `package.json`, `package-lock.json` — build
  configuration, not content.
- Everything under `netlify/functions/` and the `src/trap-viewer.njk` /
  `src/trap-manager.njk` pages — this is the trap camera gallery (mailbox polling,
  password gates, delete access, image storage). It's security-sensitive
  infrastructure, not page content; treat any request touching it as "ask Kristie."
- Anything about the donate flow (Square checkout link), Netlify environment variables,
  domain/DNS settings, or the volunteer form's `netlify-honeypot`/`data-netlify`
  attributes (removing or renaming these silently breaks Netlify Forms).
- Deleting any file, or any `git` command beyond a normal commit/push on a feature
  branch (no `--force`, no `reset --hard`, no rewriting history).

## Workflow for every change

1. Make the edit.
2. Run the site locally (`npm run dev` or the Eleventy dev server already configured in
   this repo) and actually look at the changed page before going further.
3. Create a new branch for the change — never commit to `main` directly.
4. Commit with a plain-English message describing what changed.
5. Push the branch and open a pull request (`gh pr create`).
6. Give Richard the PR link. Netlify will build a deploy preview automatically — tell him
   to check that preview looks right before merging.
7. Do not merge the PR yourself unless Richard explicitly says to. Merging publishes the
   change to the live site.

If a request doesn't clearly fit "safe to edit directly," treat it as "ask first" — the
cost of pausing is low, the cost of a broken live site for a volunteer-run rescue group
is not.
