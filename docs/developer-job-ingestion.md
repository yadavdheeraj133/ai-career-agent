# Developer job ingestion

Only developer roles are allowed into the production job dataset. This document
records how each provider is filtered and why the server-side classifier is
always applied, including for providers that already have an API filter.

## Where filtering happens

Classification is a single, unconditional step in
`src/automation/aggregation.service.ts`, after normalization and before
persistence. Because every ingestion entry point funnels through that service,
the same policy applies to the scheduler, the background worker and
`POST /api/jobs/aggregate` (whose service applies it too).

Nothing else needs to remember to filter. Providers are not trusted to have
filtered anything.

| Provider | API filter | Parameter sent | Server-side fallback |
| --- | --- | --- | --- |
| Arbeitnow | None available | — (paginates with `page` only) | **Required.** The public board API ignores `?search=`; it always returns general listings, so every record must be classified. |
| The Muse | Yes | `category=Software Engineer` (only when the configured URL has no `category`) | **Required.** A category returns its own mix of roles, so results are still classified. |
| Remote OK | Partial | `tag=dev` (only when the configured URL has no `tag`) | **Required.** `tag` is a loose, site-wide taxonomy: a `dev` request still returns roles such as "Senior Growth Product Manager" and "People Operations Coordinator". |
| Jobicy | Yes | `industry=engineering` (only when the configured URL has no `industry`) | **Required.** Engineering listings still include non-development roles. |
| Adzuna | Yes | `what_or` developer keyword group | **Required.** Keyword matching is recall-oriented and returns adjacent roles. |

An explicitly configured filter is always preserved. The defaults above only
apply when the operator has not already narrowed the request, so a deliberate
`?category=Data%20Science` is never silently rewritten.

## Classifier

`src/automation/developer-classifier.ts` is provider-agnostic: it never branches
on which API delivered a record. The same job is classified identically no
matter its source, which is asserted in `test/job-providers.test.ts`.

A record is accepted when the **title** and the **description/skills/requirements**
agree, with these rules:

- **Business vetoes win.** A clearly non-development title (marketing, sales,
  HR, support, design, finance, ...) is rejected even when the description
  mentions technology. `Operations Engineer` is deliberately treated this way:
  it usually means process or manufacturing operations, and the Remote OK `dev`
  tag was demonstrably pulling those into the dataset.
- **Development terms alone are not enough.** A generic title plus
  `React`/`TypeScript` in the skills is insufficient; there must be development
  context in the description as well.
- **Strong structured evidence can carry an otherwise neutral title**, e.g.
  `Engineer` + "build production services with TypeScript and Node.js".
- German titles from Arbeitnow are recognised, since that feed is
  German-language by default.

## Storage and reads

The verdict is persisted as `Job.isDeveloperJob` and indexed
(`@@index([isDeveloperJob, status])`), so the developer-only views are a cheap
SQL predicate rather than a full-table scan:

- `GET /api/jobs/search` (Find Jobs) filters `isDeveloperJob = true` by default.
- `POST /api/jobs/match` (Job Intelligence) builds every metric from that same
  developer dataset, so counts and rankings cannot disagree with Find Jobs.
- `JobService.createJob` records a verdict but does not reject the request:
  catalogue CRUD is an explicit, role-gated write and is not an ingestion path.

## Backfilling history

The column is nullable and new rows are classified at ingestion, so existing
records are filled in by a one-off, non-destructive script. **No job is ever
deleted**: unrelated roles are hidden from the developer views but remain
stored and remain readable by id.

```bash
pnpm --filter @repo/api exec tsx src/scripts/backfill-developer-classification.ts
```

The script only touches rows whose verdict is still `null`, so it is safe to
re-run and will not rewrite history the classifier has already judged. Pass
`-- --force` to re-classify every row after a classifier improvement.
