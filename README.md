<div align="center">

<img src="./public/logo.svg" alt="" width="72" height="72" />

# MCP Workbench

**A self-hostable AI workbench.** Chat with any model, give it tools through MCP, teach it skills,
install Claude Code plugins, ground it in your own documents, and measure what it does.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![HeroUI](https://img.shields.io/badge/HeroUI-v3-7828c8)](https://heroui.com/)
[![Vercel AI SDK](https://img.shields.io/badge/AI%20SDK-v7-000?logo=vercel)](https://ai-sdk.dev/)
[![MCP](https://img.shields.io/badge/MCP-remote%20servers-0089d6)](https://modelcontextprotocol.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-336791?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Features](#features) · [Screenshots](#screenshots) · [Quick start](#quick-start) · [Architecture](#architecture) · [Security](#security-model) · [Development](#development) · [Roadmap](#roadmap)

<img src="./Screenshots/v5/chat-rag.png" alt="A chat where the model searches a knowledge base, with the tool inspector open" width="900" />

</div>

---

## Why MCP Workbench

Most chat UIs stop at "pick a model, type a prompt". MCP Workbench is the bench around the model:

| You want to…                     | MCP Workbench gives you                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use whichever model fits the job | **12 chat providers** behind one streaming chat (OpenAI, Anthropic, Google, Groq, OpenRouter, Together, Mistral, Cohere, Hugging Face, Ollama, LM Studio, any OpenAI-compatible server) |
| Let the model act, safely        | **Remote MCP servers** with per-server approval policies and signed approvals                                                                                                           |
| Reuse expertise                  | **Agents**, **Agent Skills** (`SKILL.md`) and **slash commands**                                                                                                                        |
| Bring the ecosystem in           | **Claude Code plugins** and marketplaces installed straight from GitHub                                                                                                                 |
| Answer from your own data        | **Knowledge bases** with hybrid (vector + keyword) retrieval and citations                                                                                                              |
| Choose and justify models        | **Side-by-side comparison** and **usage analytics**                                                                                                                                     |
| Go beyond text                   | **Studio** for image generation, speech-to-text and text-to-speech                                                                                                                      |
| Automate and share               | **Scheduled agents**, **shareable read-only chats** and **conversation branching**                                                                                                      |

It is multi-user from the ground up: every record is scoped to its owner, secrets are encrypted,
and uploaded files are private.

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### 💬 Chat

- Streaming on the Vercel AI SDK; stop, and retry after an error
- Per-chat model and system prompt; sampling settings for the session
- Image, PDF and text attachments
- `/` **slash commands** with `$ARGUMENTS` and `$1…$9`; the same `/` picker lists **skills** and installed **plugins'** commands and skills, and picking a skill attaches it to the message
- `@` **mentions** for one message: a chat folder (a summary of its chats), a knowledge base (`search_knowledge`), an MCP server (its tools) or a recent upload (attached), shown as removable chips
- Reactions, annotations, JSON/CSV export; history search over titles **and message text**
- **Share** a read-only link (revocable, with optional expiry and password; attachments and system prompt stay private) and **branch** from any reply
- **Inspector**: every tool call with input, output and timing

### 🤖 Agents

- Instructions, default model, temperature, step budget, starter prompts
- Attach **MCP servers, skills and knowledge bases**
- Six built-ins; share yours without exposing tools, keys or documents
- **Schedules**: run an agent on a cron schedule in your time zone; each run lands in a new chat and can notify a Slack, Discord or any HTTPS webhook, or email you

### 🔌 MCP

- Remote servers over Streamable HTTP or SSE, with encrypted auth headers or **OAuth sign-in** (dynamic registration, PKCE, token refresh)
- **Local stdio servers** through the bundled [bridge](#local-stdio-mcp-servers)
- Approval policy per server: never · unless read-only · always
- **Inspector** to run tools, read resources and get prompts
- **Official MCP Registry** browser with one-click add
- **Import** `mcpServers` configs from Claude Desktop, Cursor or VS Code

</td>
<td width="50%" valign="top">

### 🧩 Skills, commands and plugins

- **Agent Skills** loaded on demand (progressive disclosure), written in-app or imported from GitHub
- **Claude Code plugins** from a repo or `.claude-plugin/marketplace.json`: review, install, update, disable or uninstall skills, agents, commands and MCP servers as one unit

### 📚 Knowledge (RAG)

- PDF, HTML, Markdown, text, code, CSV, JSON, web pages, pasted text, dataset rows
- Chunking with overlap, embeddings from any provider, stored in **pgvector**
- **Hybrid retrieval**: cosine similarity + Postgres full-text, merged with reciprocal rank fusion
- `search_knowledge` tool with cited sources; retrieval playground and chunk viewer
- **HNSW** indexes for common embedding sizes (384 to 3072 dimensions)
- Optional **reranking** (Cohere or Together) of the hybrid results

### 📊 Compare, measure, explore

- **Compare** up to four models: streaming side by side with first-token time, total time, tokens, tokens/s and cost
- **Usage analytics**: tokens and cost per day, by model, tool calls and agents; CSV export
- **Cost tracking**: built-in price table per model, with your own price for any model on /models
- **Datasets**: CSV/TSV/Parquet preview with column statistics
- **Embeddings playground** with a similarity heatmap
- **Python notebook** in the browser (Pyodide)

### 🎨 Studio

- **Images** from OpenAI, Google Imagen, Together (FLUX) or any compatible server
- **Speech to text** (Whisper, GPT-4o transcribe, Groq) and **text to speech** with voices
- Results saved privately with download and history

</td>
</tr>
</table>

---

## Screenshots

<table>
<tr>
<td width="50%"><img src="./Screenshots/v5/compare.png" alt="Two models answering side by side" /><p align="center"><b>Compare models</b></p></td>
<td width="50%"><img src="./Screenshots/v5/analytics.png" alt="Usage dashboard" /><p align="center"><b>Usage analytics</b></p></td>
</tr>
<tr>
<td><img src="./Screenshots/v5/knowledge.png" alt="Knowledge base with retrieval results" /><p align="center"><b>Knowledge bases and retrieval</b></p></td>
<td><img src="./Screenshots/v5/plugins.png" alt="Plugin marketplace" /><p align="center"><b>Plugins from a marketplace</b></p></td>
</tr>
<tr>
<td><img src="./Screenshots/v5/datasets.png" alt="Dataset column statistics" /><p align="center"><b>Dataset column profile</b></p></td>
<td><img src="./Screenshots/v5/embeddings.png" alt="Embedding similarity heatmap" /><p align="center"><b>Embeddings playground</b></p></td>
</tr>
<tr>
<td><img src="./Screenshots/v5/agents-light.png" alt="Agents in the light theme" /><p align="center"><b>Agents (light theme)</b></p></td>
<td><img src="./Screenshots/v5/settings-light.png" alt="Settings" /><p align="center"><b>Settings and MCP config import</b></p></td>
</tr>
<tr>
<td><img src="./Screenshots/v5/studio.png" alt="Studio with generated images" /><p align="center"><b>Studio: images, speech to text, text to speech</b></p></td>
<td><img src="./Screenshots/v5/schedules.png" alt="Scheduled agent runs" /><p align="center"><b>Scheduled agents</b></p></td>
</tr>
<tr>
<td colspan="2"><img src="./Screenshots/v5/share-light.png" alt="A shared read-only chat" /><p align="center"><b>Shareable read-only chat (light theme)</b></p></td>
</tr>
</table>

---

## Quick start

**Requirements:** [Bun](https://bun.sh) and PostgreSQL with [pgvector](https://github.com/pgvector/pgvector) (the dev compose file runs it for you).

```bash
git clone https://github.com/scorpiontaj/mcp-workbench.git
cd mcp-workbench
bun install

cp .env.example .env
# Required: ENCRYPTION_KEY and BETTER_AUTH_SECRET (openssl rand -base64 32), ADMIN_EMAILS (your email)

bun run docker:dev     # PostgreSQL + pgvector on localhost:5432
bun run db:migrate     # tables, the vector extension and built-in agents
bun run dev            # http://localhost:3000
```

1. Sign up. The emails in `ADMIN_EMAILS` become admins; after that, admins manage roles on **/admin/users**.
2. Add a provider on **Providers**: an API key, or the URL of a local Ollama / LM Studio.
3. Start a chat, or create a knowledge base with an embedding model such as `text-embedding-3-small` or `nomic-embed-text`.

**Production:** `bun run docker:prod` builds a multi-stage image that runs as non-root; then apply migrations as described in
[docker/README.md](docker/README.md). Set `ALLOW_PRIVATE_PROVIDER_URLS=false` on a public deployment.

<details>
<summary><b>Environment variables</b></summary>

| Variable                                                | Purpose                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                          | PostgreSQL with pgvector                                                                                                                                                                                                                                                                                                                                      |
| `ENCRYPTION_KEY`                                        | Encrypts provider keys and MCP headers (required, 32+ chars)                                                                                                                                                                                                                                                                                                  |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                 | Session signing and the app's public URL (required)                                                                                                                                                                                                                                                                                                           |
| `ADMIN_EMAILS`                                          | Comma-separated emails promoted to admin on sign-up (later changes happen on /admin/users)                                                                                                                                                                                                                                                                    |
| `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`    | Optional OAuth sign-in                                                                                                                                                                                                                                                                                                                                        |
| `ALLOW_PRIVATE_PROVIDER_URLS`                           | Allow LAN/loopback provider URLs (default: on outside production)                                                                                                                                                                                                                                                                                             |
| `UPLOAD_DIR`                                            | Where private uploads are stored (default `./storage/uploads`)                                                                                                                                                                                                                                                                                                |
| `GITHUB_TOKEN`                                          | Raises GitHub rate limits for skill and plugin imports                                                                                                                                                                                                                                                                                                        |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` | Optional server-wide fallback keys                                                                                                                                                                                                                                                                                                                            |
| `REDIS_URL`                                             | Optional cache                                                                                                                                                                                                                                                                                                                                                |
| `SCHEDULER`                                             | `off` stops this instance from running scheduled agents (several instances can safely run it together)                                                                                                                                                                                                                                                        |
| `RESEND_API_KEY` or `SMTP_URL`, `EMAIL_FROM`            | Email for sign-up verification, password reset and scheduled-run notifications: Resend's API, or any SMTP server (`smtps://user:pass@host:465`). Without either, emails are skipped with a log line and "Forgot password?" is hidden                                                                                                                          |
| `REQUIRE_EMAIL_VERIFICATION`                            | `true`/`false` forces email verification before email/password sign-in on or off. Default: on when an email transport is configured, off otherwise. OAuth accounts are verified by the provider                                                                                                                                                               |
| `RATE_LIMIT`                                            | `off` disables rate limiting. Limits are per user (chat 30/min, compare and Studio 10/min, Compare batch and judge runs 120/min, uploads 20/min), per API key (120/min), per shared link for password attempts (10/min) and per IP for sign-in (5/min), sign-up (3/min) and password-reset or verification emails (3/min), counted in memory on each instance |

</details>

---

## Architecture

MCP Workbench is a single Next.js 16 application: React pages for the UI and route handlers for the
API, backed by PostgreSQL. Everything model-related goes through the Vercel AI SDK, so every provider
gets the same streaming, tools, approvals and embeddings.

### System overview

```mermaid
flowchart LR
  subgraph Browser["Browser"]
    UI["Next.js pages<br/>HeroUI v3 + Tailwind v4"]
    Py["Pyodide notebook<br/>(Web Worker)"]
  end

  subgraph Server["Next.js server"]
    Proxy["proxy.ts<br/>auth redirect + CSRF guard"]
    API["Route handlers /api/*<br/>withUser() → user-scoped"]
    Core["lib/<br/>models · mcp · skills · plugins<br/>knowledge · agents · uploads"]
  end

  subgraph Data["Storage"]
    PG[("PostgreSQL<br/>Drizzle ORM<br/>pgvector + tsvector")]
    Files[("storage/uploads<br/>private files")]
  end

  subgraph Outside["External services"]
    LLM["LLM providers<br/>OpenAI · Anthropic · Google<br/>Ollama · LM Studio · …"]
    MCP["Remote MCP servers<br/>HTTP / SSE"]
    GH["GitHub<br/>skills & plugins"]
    Reg["Official MCP Registry"]
  end

  UI -->|"fetch / SSE stream"| Proxy --> API --> Core
  Core --> PG
  Core --> Files
  Core -->|"AI SDK v7"| LLM
  Core -->|"ai-sdk/mcp client"| MCP
  Core --> GH
  Core --> Reg
```

### One chat turn

The client sends only the new message; the server rebuilds the context, runs the model with every
tool the chat and its agent allow, pauses for approvals when a server's policy asks for one, and
saves the turn when the stream ends, even if the tab was closed.

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (useChat)
  participant R as /api/chat
  participant DB as PostgreSQL
  participant M as Model provider
  participant T as Tools (MCP · skills · knowledge)

  B->>R: new message (+ model, settings, picked skills and @ mentions)
  R->>DB: load chat history, agent, owned files
  R->>R: system prompt = agent + chat + skill list + knowledge note
  R->>M: streamText(messages, tools)
  loop up to the agent's step budget
    M-->>R: tool call
    alt server policy needs approval
      R-->>B: signed approval request
      B->>R: approve / deny
    end
    R->>T: execute
    T-->>R: result
    R->>M: continue with result
  end
  M-->>R: text stream
  R-->>B: UI message stream (text, tool cards, usage)
  R->>DB: save turn and token usage
```

**What the model gets for a turn:**

| Source          | Contributes                                                                                                                                                                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent           | Instructions, default temperature, step budget, MCP servers, skills, knowledge bases                                                                                                                                                                                                   |
| Chat            | Its own system prompt and the MCP servers / knowledge bases switched on in the sidebar                                                                                                                                                                                                 |
| MCP servers     | Their tools, namespaced `<server>__<tool>`, each gated by the server's approval policy                                                                                                                                                                                                 |
| Skills          | Names and descriptions in the prompt; `load_skill` / `read_skill_file` fetch the rest when needed                                                                                                                                                                                      |
| Knowledge bases | A note listing them and the `search_knowledge` tool                                                                                                                                                                                                                                    |
| Composer picks  | For that message only: picked skills' full `SKILL.md` text, `@folder` summaries, and `@` knowledge bases and MCP servers added to the above. Every id is checked against the user's own records (400 otherwise) and stored on the message, so tool approvals and regenerates keep them |

### Knowledge pipeline

```mermaid
flowchart TB
  subgraph Ingest["Ingestion (background, after the request returns)"]
    S["Upload · web page · pasted text · dataset rows"] --> X["Extract text<br/>unpdf · HTML → text · CSV/Parquet → records"]
    X --> C["Chunk<br/>recursive splitter, size + overlap"]
    C --> E["embedMany()<br/>the base's embedding model"]
    E --> V[("KnowledgeChunk<br/>vector + generated tsvector")]
  end

  subgraph Search["Retrieval: search_knowledge tool"]
    Q["Question"] --> QE["embed() per embedding model"]
    Q --> KW["OR keyword query<br/>English stemming"]
    QE --> VS["cosine distance &lt;=&gt;"]
    KW --> FT["ts_rank_cd over GIN index"]
    VS --> F["Reciprocal rank fusion"]
    FT --> F
    F --> P["Top passages + sources → model cites them"]
  end

  V -.-> VS
  V -.-> FT
```

Each knowledge base fixes its embedding model, so bases built with different models can be searched
together: the question is embedded once per model, and the ranked lists are fused.

### Data model

```mermaid
erDiagram
  user ||--o{ Chat : owns
  user ||--o{ Agent : authors
  user ||--o{ McpServer : connects
  user ||--o{ Skill : has
  user ||--o{ Command : has
  user ||--o{ Plugin : installs
  user ||--o{ KnowledgeBase : owns
  user ||--o{ Dataset : uploads
  user ||--o{ ProviderConfig : configures

  Chat ||--o{ Message : contains
  Message ||--o{ Attachment : has
  Agent |o--o{ Chat : "linked to"

  Plugin ||--o{ Skill : adds
  Plugin ||--o{ Command : adds
  Plugin ||--o{ Agent : adds
  Plugin ||--o{ McpServer : adds

  KnowledgeBase ||--o{ KnowledgeDocument : holds
  KnowledgeDocument ||--o{ KnowledgeChunk : "split into"

  Message {
    jsonb parts "text, files, tool calls"
    int tokensIn
    int tokensOut
  }
  KnowledgeChunk {
    vector embedding
    tsvector tsv "generated"
  }
  McpServer {
    text headers "encrypted"
    text approval "never / readonly / always"
  }
```

Deleting a plugin cascades to everything it installed; deleting a knowledge base removes its documents
and chunks. The schema lives in [`lib/schema.ts`](lib/schema.ts) and the migrations in [`drizzle/`](drizzle).

### Project layout

```text
app/
  (pages)            chat, agents, compare, skills, plugins, knowledge, datasets, embeddings,
                     models, providers, tools (MCP inspector), registry, analytics, config, …
  api/               route handlers, one folder per resource; every handler is wrapped in withUser()
  uploads/[name]     serves a private upload to its owner
components/
  ui/                design-system primitives: HeroUI components behind a stable props API
  chat/ compare/ analytics/ datasets/ skills/ …   feature components
hooks/               SWR data hooks (useAgents, useKnowledgeBases, usePlugins, …)
lib/
  models.ts          provider → AI SDK language/embedding model, per-user keys
  mcp.ts             MCP clients, tool namespacing, approval policy
  skills.ts          progressive-disclosure skill tools
  composer.ts turn-context.ts              "/" and "@" picker parsing; per-message skills and mentions (ownership checks)
  bundles.ts plugins.ts github-source.ts   SKILL.md / plugin parsing and GitHub fetching
  knowledge.ts rag-text.ts                 ingestion, chunking, hybrid search
  tabular.ts datasets.ts                   CSV/Parquet parsing and column profiling
  uploads.ts upload-access.ts              private file storage and access checks
  schema.ts db.ts    Drizzle schema and client
scripts/             mock-llm.ts, mock-mcp.ts, migrate-uploads.ts
drizzle/             SQL migrations
docker/              Dockerfile and compose files
```

### Design decisions

- **One AI layer.** Every provider goes through the AI SDK (`getModel` / `getEmbeddingModel`), so chat, tools, comparison and embeddings behave the same everywhere.
- **The server owns the conversation.** Clients send the new message only; history, tools and approvals are rebuilt on the server, so a modified client can't rewrite history or forge an approval.
- **Pure parsers, thin routes.** Skill/plugin parsing, chunking, CSV and MCP-config parsing, rank fusion and PATCH schemas are pure functions with unit tests; routes validate input with zod and stay small.
- **Postgres does the retrieval.** pgvector and full-text search run side by side in one database, so there's no separate vector store to run or keep in sync.
- **Design system behind stable props.** `components/ui` keeps one component API while rendering HeroUI v3, so the whole app moved to HeroUI at once and can keep evolving.

---

## Local stdio MCP servers

The hosted app can't start processes on your machine, so local servers (the `npx …` and `uvx …` kind) run
through a small bridge you start yourself. It launches the server once per session and exposes it as a
Streamable HTTP endpoint protected by OAuth:

```bash
bun scripts/mcp-bridge.ts --port 8808 -- npx -y @modelcontextprotocol/server-filesystem ~/notes
```

It prints a URL and a pairing code. In the **MCP Inspector**, add `http://127.0.0.1:8808/mcp` with
authentication **OAuth sign-in** and sign in: the bridge registers the workbench, opens its approval page, and
you approve with the pairing code from its terminal. Tokens refresh on their own; restarting the bridge signs
clients out and prints a new code, and after 10 wrong codes it stops approving until restarted. Clients without
OAuth can send the `Authorization: Bearer <token>` header the bridge also prints.

A self-hosted workbench reaches it directly (set `ALLOW_PRIVATE_PROVIDER_URLS=true`). For the hosted app, expose
it with a tunnel such as `cloudflared tunnel --url http://127.0.0.1:8808`, add the tunnel's https URL instead,
and start the bridge with `--public-url https://<tunnel-host>` so its OAuth metadata names that address.

## Security model

| Concern             | How it's handled                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts            | Better Auth (email/password, optional GitHub/Google); `withUser()` on every API route; queries scoped to `user.id`; admins manage roles on /admin/users but never their own, and the last admin stays                               |
| Secrets             | Provider keys and MCP headers encrypted with AES-256-GCM; never returned to the browser                                                                                                                                             |
| Provider spend      | Server-wide keys are only used by accounts `SERVER_KEYS` allows (requests with a personal API key count as a regular user; scheduled runs use the owner's role); `SERVER_KEYS_DAILY_LIMIT_USD` caps each user's daily spend on them |
| Files               | Stored outside `public/`, served only to their owner, never inlined into another user's chat                                                                                                                                        |
| Outbound requests   | SSRF guard on provider, MCP, plugin and knowledge URLs (private ranges blocked in production, no redirects)                                                                                                                         |
| Tool use            | Per-server approval policy; approval requests are HMAC-signed and decisions are applied to the stored message                                                                                                                       |
| Cross-site requests | `proxy.ts` rejects cross-origin mutations (requests with an API key carry no cookie credential and skip this check); strict CSP and security headers                                                                                |
| API keys            | Personal `mwb_` keys are shown once and stored as SHA-256 hashes; they act as the user without admin rights, can't manage keys, and are rate-limited per key                                                                        |
| Sharing             | Shared agents never expose the author's MCP servers, skills or knowledge bases; share links can expire and take a password (scrypt hash, per-link signed httpOnly cookie, attempts rate-limited)                                    |
| Local MCP bridge    | OAuth 2.1 with PKCE (S256) and dynamic registration; approving a client needs the pairing code printed in the bridge's terminal, so a public tunnel URL alone grants nothing                                                        |
| Code execution      | The notebook runs Python in the browser (Pyodide); nothing executes on the server                                                                                                                                                   |

---

## Development

```bash
bun run dev          # Next.js dev server
bun run check        # typecheck + lint + unit tests (CI also runs a production build)
bun run db:generate  # create a migration after editing lib/schema.ts
bun run db:migrate   # apply migrations
```

**Calling the API from scripts:** create a personal key under **Settings → API keys** (it is shown once) and send it as a
bearer token. Keys work on every user API route except admin routes and key management:

```bash
curl -H "Authorization: Bearer mwb_…" http://localhost:3000/api/chats
```

**Mock services** for working without API keys:

| Command                        | Provides                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun scripts/mock-llm.ts 4010` | OpenAI-compatible chat model `mock-echo`, embedding model `mock-embed`, and Studio endpoints (images, transcription, speech). Add it as an LM Studio provider at `http://127.0.0.1:4010/v1` or a custom provider at `http://127.0.0.1:4010`. Send `/call <tool> <json>` to make it call a tool. |
| `bun scripts/mock-mcp.ts 4020` | An MCP server at `http://127.0.0.1:4020/mcp` with read-only and destructive tools, a resource and a prompt                                                                                                                                                                                      |

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) installs with a frozen lockfile, then runs typecheck, lint, tests and a production build.

---

## Contributing

1. Fork the repository and create a branch.
2. Run `bun run check` before pushing.
3. Open a pull request describing what changed and how you tested it.

## License

MIT, see [LICENSE](LICENSE).

<div align="center">

Made by [Tajeddine Bourhim](https://github.com/scorpiontaj)
</div>
