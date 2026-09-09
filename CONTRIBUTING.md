# Contributing to Witness

## Ground rules

- **Author identity.** Set your real name and email before the first commit
  (`git config user.name` / `git config user.email`). This repo rejects AI
  attribution trailers via a `commit-msg` hook in `.githooks/`; run
  `git config core.hooksPath .githooks` after cloning.
- **Conventional commits.** Subject 60 chars or fewer, imperative, no trailing
  period. Longer explanation goes in the body via `git commit -F`.
- **No new dataset without a registry entry.** Any dataset that touches a
  training run must be listed in `data/registry.yaml` with role `train`.
  `scripts/check-licences.py` fails CI otherwise.
- **Mermaid.** No literal ampersand inside a mermaid block — GitHub's renderer
  fails on it. `scripts/check-mermaid.mjs` enforces this.

## Local setup

    git config core.hooksPath .githooks
    npm install
    npm run dev

## Before opening a PR

    npm run build
    npm run lint
    node scripts/check-mermaid.mjs
    python scripts/check-licences.py

CI runs the same checks. A red check blocks merge.
