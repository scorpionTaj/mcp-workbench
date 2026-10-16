# Implementation plan for ROADMAP.txt

Checked against `main` at 2a7523e on 2026-10-16. Each phase is one PR, and each
PR ends with `bun run check` and `bun run build` passing.

## What the code confirms

| Roadmap gap | Evidence on main |
|---|---|
| Rate limiting unused | `lib/rate-limit.ts` is imported nowhere. It keys on `x-forwarded-for` (spoofable) and is in-memory only. |
| Regenerate / Edit | `app/api/chat/route.ts:44` already resends from any stored user message and truncates after it. The UI only calls `regenerate()` in the error Retry (`components/chat/chat-conversation.tsx:190`). |
| Sampling not saved | `topP` and the other settings live in page state (`app/chat/page.tsx:54`). `Chat` has no column for them. |
| Replicate in chat | Listed in `lib/llm-providers.ts`, `lib/models.ts`, `app/api/chats/route.ts`. |
| Notebook dead ends | Saves to localStorage (`app/notebook/page.tsx:159`). "Open Workspace" toast says "coming soon" (`:343`). No image output. |
| `/api/settings` | No caller in `app/`, `components/` or `lib/`. |
| Search UI | `/api/search` serves suggestions and popular searches. Only the history list uses search. |
| Cost, email, API keys | Nothing in the code for any of them yet. |

## Phase 1: Hardening and dead ends (Next #1, #3)
- Wire `createRateLimiter` into `app/api/chat`, `app/api/studio/*`, `app/api/upload` and the auth sign-in/sign-up routes.
- Key on the user id when signed in and fall back to IP. Trust `x-forwarded-for` only behind `TRUSTED_PROXY=1`.
- Return 429 with `Retry-After`. Add a test with fake timers.
- Note in the README that limits are per instance.
- Filter providers that can't chat (Replicate) out of the chat and compare model pickers, using a `chat: false` capability in `lib/llm-providers.ts`.
- Remove the "Open Workspace" button until Phase 5. Delete `app/api/settings`.

## Phase 2: Finish chat basics (Next #2)
- Add Regenerate on the last assistant reply. Add Edit on user messages: an inline editor, then `sendMessage` with the same message id, which the route already truncates from.
- Migration 0016: add `Chat.settings jsonb` (temperature, topP, maxTokens, penalties). Load it into the sidebar and save it on change with a debounced PATCH `/api/chats/[id]`.
- Tests: route truncation on resend, and settings round trip.

## Phase 3: Chat organization and search UI (Next #4, #10)
- Migration: `Chat.pinnedAt`, `Chat.archivedAt`, `Chat.folderId`, plus a `ChatFolder` table and a `tags text[]` column with a GIN index.
- Sidebar: pinned section, folders, archive view, tag chips, and filters in `chat-history.tsx`.
- Search: a recent/suggested dropdown in the history search box and in the ⌘K palette, fed by `/api/search`.

## Phase 4: Cost tracking and analytics export (Next #5, #12)
- `lib/pricing.ts`: a static price table (input and output per 1M tokens) with per-model overrides stored with the existing model overrides.
- Record cost per message at save time in the message metadata, with no backfill.
- Analytics: cost per day and per model, plus a cost column in Compare.
- CSV export endpoint for analytics. Scheduled usage reports can reuse Phase 6 email.

## Phase 5: Notebook (Next #8)
- Pyodide worker: set the `AGG` backend and patch `plt.show()` to capture base64 PNGs into the cell's Images panel.
- Migration: a `Notebook` table (owner, title, cells jsonb). Save, open and list notebooks in the account, which replaces localStorage and "Open Workspace".
- Import and export `.ipynb` (nbformat 4: code and markdown cells, outputs as text and image/png).

## Phase 6: Notifications, API keys, share links (Next #6, #7, #9)
- Email: `lib/email.ts` with Resend or SMTP picked by env. Add an "email me" option to schedules next to the webhook.
- Personal API keys: a hashed `ApiKey` table, an `Authorization: Bearer` path in auth, and a settings UI for creating and revoking keys. Rate limit by key, and keep the CSRF check off bearer requests only.
- Share links: `shareExpiresAt` plus an optional `sharePasswordHash`, a password prompt page, and a signed cookie after unlock.

## Phase 7: Compare upgrades (Next #11)
- Word-level diff between two answers. Batch prompts run as a CSV of prompts × models.
- LLM-as-judge: pick a judge model and a rubric, and get a score per answer.

## Later (section 4 of the roadmap)
Each of these is its own design doc first, not a PR: prompt library, teams and audit log, PWA, OpenTelemetry, integrations, key rotation, fine-tuning, SDKs. I suggest **encryption key rotation** and **OpenTelemetry** first, because they harden what's already shipped.

## Parallelism
Phases 1, 4, 5 and 7 touch separate files and can run in parallel worktrees.
Phases 2 and 3 both change the chat schema and sidebar, so 3 follows 2.
Phase 6 follows 1 because both touch auth and the rate limiter.
Migrations are numbered when each PR merges, so rebase before merging.
After each phase, update ROADMAP.txt: move the item to ✅ only after checking it in the code.
