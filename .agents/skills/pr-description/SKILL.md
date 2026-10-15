---
name: pr-description
description: Write Dub pull request descriptions in the team standard format. Use when opening or updating a PR, regenerating a PR description, or when the user mentions PR body, Key Changes, How to Test, or Linear issue links.
---

# Pull request descriptions

Use this format for every PR body. Match recent human-written PRs (prose first, then structured sections) — not the generic Cursor "Summary / Test plan" template.

## Structure

1. **Opening prose** (no `## Summary` heading). 1–3 short paragraphs: what was wrong, what this changes, why it matters. Lead with the Linear fix line when there is an issue.
2. **`## Key Changes`** — concrete bullets about behavior and call sites, not a file list.
3. **`## How to Test`** — checkbox steps a reviewer can follow. Optional **`## Notes`** / **`## Deploy`** only when needed (migrations, follow-ups, caveats).

## Linear issues

Always link the issue id as markdown text. Never paste a bare Linear URL as the only reference.

```md
Fixes [ENG-1868](https://linear.app/dubinc/issue/ENG-1868/release-hold-commissions-when-partner-accounts-are-merged)
```

Wrong:

```md
Fixes https://linear.app/dubinc/issue/ENG-1868/release-hold-commissions-when-partner-accounts-are-merged
```

Same rule for related issues in the body (`Related [ENG-####](…)`).

## Do not include

- `<!-- CURSOR_AGENT_PR_BODY_BEGIN -->` / `<!-- CURSOR_AGENT_PR_BODY_END -->` or other Cursor agent wrapper comments. Provide only the raw description content. If a PR update tool injects those markers, strip them from the visible body when editing (they belong in tooling metadata, not in what we treat as the description standard).
- Cloud-agent session links, "Open in Cursor" footers, or other agent chrome in the body.
- A `## Summary` / `## Test plan` skeleton unless the user asks for that shape.

## Example

```md
Fixes [ENG-1868](https://linear.app/dubinc/issue/ENG-1868/release-hold-commissions-when-partner-accounts-are-merged)

Merging duplicate partner accounts already resolved `partnerDuplicateAccount` fraud groups, but it never released the commissions those groups had put on hold. After the merge, those commissions sat on the surviving partner stuck in `hold`.

The merge cleanup now releases hold commissions when it resolves those fraud groups, and it runs the release against the target partner because commissions have already been transferred by that point.

## Key Changes

- `cleanupFraudEvents` passes `releaseHoldCommissions: true` when resolving duplicate-account fraud groups.
- `resolveFraudGroups` / `queueReleaseHoldCommissions` accept an optional `releasePartnerId` so merge cleanup can release against the surviving partner.

## How to Test

- [ ] Flag two partners for duplicate-account risk so their commissions move to `hold`, merge them, and confirm the target partner's commissions return to `pending`
- [ ] With 3+ partners sharing the same duplicate-account risk, merge only two of them and confirm holds stay while another pending partner-level fraud group remains
```
