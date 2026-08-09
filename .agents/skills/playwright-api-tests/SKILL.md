---
name: playwright-api-tests
description: Add or extend Playwright HTTP API specs under apps/web/playwright/api using the shared api/workspace fixtures and Bearer auth from globalSetup. Use when writing Playwright API tests, e2e API specs, or testing /api routes with the api project (not Vitest under apps/web/tests, not browser UI e2e).
---

# Playwright API tests

HTTP API coverage lives in `apps/web/playwright/api/<resource>/*.spec.ts`. Auth is seeded once by Playwright `globalSetup` (`apps/web/global-setup.ts` → `setup-test-workspace.ts`) into `playwright/.auth/api.json`. Specs use the custom `test` from `../fixtures` — not `@playwright/test` directly for `test`.

Do **not** put these under `apps/web/tests/` (Vitest) or under `playwright/partners` / `playwright/workspaces` (browser e2e).

## Before writing

1. Find the route handler and response shape (Zod schemas under `apps/web/lib/zod`, types under `@/lib/types` or Prisma).
2. Prefer mirroring an existing nearby resource folder: `tags/`, `folders/`, `customers/`, `workspaces/`.
3. Confirm the endpoint is workspace-scoped Bearer API (most `/api/*` routes). The fixture already sends `Authorization: Bearer …`.

## File layout

```
apps/web/playwright/api/
├── fixtures.ts              # api + workspace fixtures (reuse; don't duplicate)
├── setup-test-workspace.ts  # globalSetup seed only — extend only if auth/workspace setup must change
└── <resource>/
    ├── <resource>.spec.ts
    └── <resource>-pagination.spec.ts  # optional split for heavy pagination suites
```

One folder per resource. Name files `kebab-case.spec.ts` (`tags/tags.spec.ts`, `customers/customers-pagination.spec.ts`).

## Spec template

```ts
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";

test.describe.configure({
  mode: "parallel",
});

async function createThing(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<YourType>("/api/things", {
    name: randomName("thing"),
    ...overrides,
  });
}

async function deleteThing(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/things/${id}`);
}

test("POST /things", async ({ api }) => {
  let id: string | undefined;

  try {
    const body = { name: randomName("thing") };
    const { status, data } = await api.post<YourType>("/api/things", body);
    id = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      id: expect.any(String),
      ...body,
      // stable nulls / defaults from the API
    });
  } finally {
    await deleteThing(api, id);
  }
});
```

## Required conventions

| Rule                                            | Detail                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Import `test` from `../fixtures`                | Provides `api` and `workspace`                                                                               |
| `test.describe.configure({ mode: "parallel" })` | At top of every API spec file                                                                                |
| Cleanup in `finally`                            | Create → assert → always delete created rows                                                                 |
| Unique names/ids                                | Use `randomName` / `randomCustomer` from `../../utils` — never fixed colliding names across parallel workers |
| Assert status + body                            | Prefer `toStrictEqual` / `toEqual` on full shapes; use `expect.any(String)` for ids/timestamps               |
| Error responses                                 | Match `{ error: { code, message, doc_url } }` exactly                                                        |
| Typed generics                                  | `api.get<T>`, `api.post<T>`, etc.                                                                            |
| Workspace fixture                               | Use `{ workspace }` for id/slug from seed (`workspaces/workspaces.spec.ts`) — do not hardcode slug           |

### Fixtures (`api` / `workspace`)

- `api.get/post/patch/delete(url, data?)` → `{ status, data }` (JSON parsed).
- Paths are app-relative (`/api/...`); `baseURL` is `http://localhost:8888`.
- `workspace.id` / `workspace.slug` come from `.auth/api.json`.

### Helpers

- Shared randomizers / sort assertions: `apps/web/playwright/utils.ts`.
- Local `createX` / `deleteX` helpers in the spec file when the same setup repeats.
- Prisma direct seed is allowed for bulk fixtures (see `customers/customers-pagination.spec.ts`); still clean up in `finally` / after hooks.

### Error / table-driven cases

```ts
const errorCases = [
  {
    name: "POST /things – missing name",
    body: {},
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "…",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/things", body)).toEqual(expected);
  });
}
```

Optional: validate richer payloads with Zod (`.parse(...)`) like `workspaces/workspaces.spec.ts` / enriched customer fields.

## Do not

- Call `setupTestWorkspace` from specs (only `globalSetup`).
- Import browser `page` / storage-state auth for API specs.
- Commit secrets or change the fixed Playwright token unless intentionally rotating local/CI test auth.
- Skip cleanup (parallel API project will leak / flake).
- Run `pnpm build` after adding tests.

## Run

Dev server on port 8888 (local), then:

```sh
pnpm --filter web test:e2e --project=api
pnpm --filter web test:e2e --project=api playwright/api/tags/tags.spec.ts
pnpm --filter web test:e2e --project=api playwright/api/tags/tags.spec.ts -g "POST /tags"
```

`-g` / `--grep` matches the test title (regex). Combine with a file path to narrow further.
In CI, `playwright.config.ts` starts `pnpm start -p 8888` via `webServer`.

More context: `apps/web/playwright/README.md` (API section).
