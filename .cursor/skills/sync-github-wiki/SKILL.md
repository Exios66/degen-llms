---
name: sync-github-wiki
description: >-
  Publish wiki/ from the repository to the GitHub Wiki for degen-llms. Manual
  invocation only (no GitHub Actions). Use when the user asks to update, publish,
  or sync the GitHub Wiki; after editing wiki/ pages; or mentions the Mandalay
  Bay wiki at github.com/Exios66/degen-llms/wiki. Invoke via /sync-github-wiki.
disable-model-invocation: true
---

# Sync GitHub Wiki

Mirror [`wiki/`](../../../wiki/) to **https://github.com/Exios66/degen-llms/wiki**.

Wiki content is **not** deployed by GitHub Actions. The repo `wiki/` folder is the source of truth; run this skill after merging wiki changes.

## Publish (agent)

1. Confirm `wiki/*.md` changes are committed on `main` (or the branch being synced).
2. Run:

   ```bash
   bash .cursor/skills/sync-github-wiki/scripts/run-sync.sh
   ```

3. Report whether pages were pushed or already up to date, and link the wiki URL.

Requires git credentials with push access to `Exios66/degen-llms.wiki.git`.

## What sync does

- Clones `https://github.com/Exios66/degen-llms.wiki.git` (or initializes if missing)
- Replaces all top-level `*.md` pages and the `images/` folder from `wiki/`
- Applies themed `_Sidebar.md` and `_Footer.md` on every wiki page
- Commits and pushes only when content differs
- Force-pushes on first init if the remote wiki repo does not exist yet

## When to run

- After adding or editing pages in `wiki/`
- When the live GitHub Wiki is stale vs repository content
- User explicitly asks to update the wiki

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Repository not found` on push | Enable Wiki in repo Settings; ensure token has `repo` scope |
| `Wiki already up to date` | No changes in `wiki/` since last sync |
| Permission denied | Use credentials that can push to `.wiki.git` |

## Related

- [`scripts/sync-github-wiki.sh`](../../../scripts/sync-github-wiki.sh) — core sync logic
- [`wiki/Home.md`](../../../wiki/Home.md) — wiki landing page source
