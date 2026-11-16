# Updating the KRBS website with Claude Code

This is a walkthrough for making small updates to the website yourself — wording
changes, swapping a photo, that kind of thing — using Claude Code. You don't need to
know how to code. You'll type what you want changed in plain English, and Claude does
the editing.

Nothing you do goes live immediately — every change opens as a "pull request" first,
which is just a preview link you (or Kristie) check before it actually publishes.

## One-time setup

1. **Get a GitHub account** — go to [github.com](https://github.com) and sign up if you
   don't have one already (it's free). Tell Kristie your username so she can give your
   account access to the website's repository.

2. **Install Claude Code** — go to
   [claude.com/claude-code](https://claude.com/claude-code) and follow the install
   instructions for your computer. This is the same Claude you already use, just running
   on your own computer so it can edit files and talk to GitHub for you.

3. **Get the website files onto your computer** — once Kristie's confirmed you have
   access to the repo, open a terminal and run:

   ```bash
   git clone https://github.com/kristie-hyperfocus/koala-rescue-site.git
   ```

   This downloads a copy of the website onto your computer, into a folder called
   `koala-rescue-site`.

4. **Open that folder in Claude Code.** In the terminal:

   ```bash
   cd koala-rescue-site
   claude
   ```

5. **Run the setup check.** Type `/krbs-setup` and press enter. It checks that
   everything above actually worked (git's installed, you're in the right repo, your
   access is active) and tells you plainly if anything's still missing — most commonly
   that Kristie hasn't granted your GitHub access yet.

## Making a change

Once Claude Code is open in that folder, just ask in plain English, for example:

- "Update the phone number on the volunteer page to..."
- "Add this photo to the homepage gallery" (and attach or describe the photo)
- "Fix the typo in the second paragraph of the About page"

Claude will:

1. Make the edit.
2. Show you the page so you can see how it looks.
3. Open a pull request — a link where you can preview the change live before it's public.
4. Tell you the link.

**Open that link and check it looks right.** When you're happy, click "Merge" on that
page (or ask Claude to merge it for you) and the change goes live on the real site
within a minute or two.

## What Claude will say no to (or check with Kristie about)

A few things are deliberately off-limits for self-serve edits, because getting them
wrong breaks the whole site, not just one page — things like the shared header/footer,
the site's build setup, and the donation checkout link. If you ask for one of these,
Claude will tell you to check with Kristie first rather than just doing it. That's
expected, not a bug.

One specific one: **the committee list on the About page comes from a Google Sheet, not
the website code.** If a committee member joins or leaves, that's a Sheet edit — ask
Kristie for access to that Sheet if you don't have it already.

## If something goes wrong

Nothing is destroyed by trying — every change lives on its own branch and preview link
until someone actually clicks "Merge." If you're ever unsure whether something looks
right, just ask Claude, or check with Kristie before merging.
