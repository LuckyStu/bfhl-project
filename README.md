# BFHL Hierarchy API

A Node.js + Express implementation of the SRM Full Stack Engineering Round 1 challenge.
Exposes a `POST /bfhl` endpoint that processes an array of `Parent->Child` edge strings and
returns identity info, parsed hierarchies, detected cycles, duplicate edges, invalid entries,
and a summary. A single-page frontend at `/` lets users paste input and view the result.

## Quick start

```bash
npm install
npm start
# server on http://localhost:5000
```

## API

### `POST /bfhl`

Request:

```json
{ "data": ["A->B", "A->C", "B->D"] }
```

Response includes:

- `user_id`, `email_id`, `college_roll_number`
- `hierarchies[]` — each with `root`, `tree`, plus `depth` (or `has_cycle: true` for cycles)
- `invalid_entries[]`
- `duplicate_edges[]`
- `summary` — `total_trees`, `total_cycles`, `largest_tree_root`

### Processing rules

- Valid edge format: `X->Y` where X, Y are single uppercase letters and `X != Y`
- Whitespace is trimmed before validation
- First occurrence of a duplicate edge wins; subsequent occurrences are reported once
- Diamond rule: if a child already has a parent, later parent edges for it are silently dropped
- Cycle detection: if a connected group has no node without a parent, it's a cycle (`tree: {}`, `has_cycle: true`); root is the lexicographically smallest node
- Depth = number of nodes on the longest root-to-leaf path
- `largest_tree_root` tiebreaker: lexicographically smallest root

CORS is enabled for all origins.
