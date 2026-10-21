import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  jsonb,
  real,
  doublePrecision,
  customType,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import type { NotebookCellData } from "./notebook";

// ============================================================================
// Auth (Better Auth core tables)
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  policyAccepted: boolean("policyAccepted").notNull().default(false),
  policyAcceptedAt: timestamp("policyAcceptedAt", { mode: "date" }),
  policyVersion: text("policyVersion"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_userId_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("account_userId_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

const userId = () =>
  text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

// One personal Stripe subscription per account. Stripe remains the source of truth; webhook
// events keep the access status here so request handlers do not call Stripe on every request.
export const billingAccounts = pgTable(
  "BillingAccount",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripeCustomerId").notNull().unique(),
    stripeSubscriptionId: text("stripeSubscriptionId").unique(),
    stripePriceId: text("stripePriceId"),
    subscriptionStatus: text("subscriptionStatus").notNull().default("inactive"),
    currentPeriodEnd: timestamp("currentPeriodEnd", { mode: "date" }),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
    lastStripeEventCreated: integer("lastStripeEventCreated"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
);

// ============================================================================
// App tables — everything user-owned carries userId; messages/attachments/
// reactions/annotations are owned through their chat.
// ============================================================================

// Personal API keys for `Authorization: Bearer mwb_…`. Only the SHA-256 hash of the key is
// stored; revoked keys are kept (revokedAt set) so the list shows their history.
export const apiKeys = pgTable(
  "ApiKey",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // first characters of the key, for recognizing it
    hash: text("hash").notNull().unique(),
    lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revokedAt", { mode: "date" }),
  },
  (t) => [index("ApiKey_userId_idx").on(t.userId)],
);

// User-made folders for organizing chats; deleting a folder leaves its chats unfiled.
export const chatFolders = pgTable(
  "ChatFolder",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("ChatFolder_userId_idx").on(t.userId)],
);

export const chats = pgTable(
  "Chat",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    title: text("title"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
    systemPrompt: text("systemPrompt"),
    defaultProvider: text("defaultProvider").notNull().default("ollama"),
    defaultModelId: text("defaultModelId"),
    toolServerIds: text("toolServerIds"),
    meta: text("meta"),
    agentId: text("agentId").references(() => agents.id, { onDelete: "set null" }),
    knowledgeBaseIds: jsonb("knowledgeBaseIds").$type<string[]>().notNull().default([]),
    // Unguessable token for the public read-only link; null when the chat isn't shared.
    shareId: text("shareId").unique(),
    sharedAt: timestamp("sharedAt", { mode: "date" }),
    // Optional limits on the link: it stops working after shareExpiresAt, and viewers must
    // enter a password when sharePasswordHash (scrypt, see lib/share-password.ts) is set.
    shareExpiresAt: timestamp("shareExpiresAt", { mode: "date" }),
    sharePasswordHash: text("sharePasswordHash"),
    // Set when this chat was branched from another chat (or a shared one).
    forkedFromId: text("forkedFromId"),
    // Organization: pinned chats list first, archived ones are hidden from the main list.
    pinnedAt: timestamp("pinnedAt", { mode: "date" }),
    archivedAt: timestamp("archivedAt", { mode: "date" }),
    folderId: text("folderId").references(() => chatFolders.id, { onDelete: "set null" }),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [
    index("Chat_userId_updatedAt_idx").on(t.userId, t.updatedAt),
    index("Chat_folderId_idx").on(t.folderId),
    index("Chat_tags_idx").using("gin", t.tags),
  ],
);

// Installed plugin bundles (Claude Code plugin layout). Deleting one removes everything it added.
export const plugins = pgTable(
  "Plugin",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    version: text("version"),
    description: text("description"),
    author: text("author"),
    sourceUrl: text("sourceUrl").notNull(), // GitHub folder it was installed from (shown to the user)
    // How to fetch it again for updates: a plugin URL, or a marketplace URL + plugin name.
    source: jsonb("source").$type<{ url: string } | { marketplaceUrl: string; name: string }>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    installedAt: timestamp("installedAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("Plugin_userId_name_key").on(t.userId, t.name)],
);

const pluginId = () => text("pluginId").references(() => plugins.id, { onDelete: "cascade" });

// Agent Skills: SKILL.md instructions plus text resources, loaded on demand in chat.
export const skills = pgTable(
  "Skill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    pluginId: pluginId(),
    name: text("name").notNull(), // plugin skills are namespaced "plugin:skill"
    description: text("description").notNull(),
    instructions: text("instructions").notNull(),
    resources: jsonb("resources").$type<Record<string, string>>().notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    sourceUrl: text("sourceUrl"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("Skill_userId_name_key").on(t.userId, t.name)],
);

// Slash commands: "/name args" in chat expands to the prompt with $ARGUMENTS substituted.
export const commands = pgTable(
  "Command",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    pluginId: pluginId(),
    name: text("name").notNull(),
    description: text("description"),
    argumentHint: text("argumentHint"),
    prompt: text("prompt").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("Command_userId_name_key").on(t.userId, t.name)],
);

// pgvector column without a fixed size: each knowledge base picks its own embedding model.
// ponytail: no ANN index (HNSW needs fixed dimensions), so search is an exact scan per knowledge base.
const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => "vector",
  toDriver: (v) => `[${v.join(",")}]`,
  fromDriver: (v) => JSON.parse(v),
});
const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

// RAG: documents are split into chunks, embedded, and searched by vector + keyword (hybrid).
export const knowledgeBases = pgTable(
  "KnowledgeBase",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    description: text("description"),
    embeddingProvider: text("embeddingProvider").notNull(),
    embeddingModel: text("embeddingModel").notNull(),
    chunkSize: integer("chunkSize").notNull().default(1000), // characters
    chunkOverlap: integer("chunkOverlap").notNull().default(150),
    // Optional reranker applied to the hybrid search results (Cohere or Together).
    rerankProvider: text("rerankProvider"),
    rerankModel: text("rerankModel"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("KnowledgeBase_userId_name_key").on(t.userId, t.name)],
);

export const knowledgeDocuments = pgTable(
  "KnowledgeDocument",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    knowledgeBaseId: text("knowledgeBaseId")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(), // characters of extracted text
    sourceUrl: text("sourceUrl"),
    status: text("status", { enum: ["processing", "ready", "error"] }).notNull().default("processing"),
    error: text("error"),
    chunkCount: integer("chunkCount").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("KnowledgeDocument_knowledgeBaseId_idx").on(t.knowledgeBaseId)],
);

export const knowledgeChunks = pgTable(
  "KnowledgeChunk",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    knowledgeBaseId: text("knowledgeBaseId")
      .notNull()
      .references(() => knowledgeBases.id, { onDelete: "cascade" }),
    documentId: text("documentId")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding").notNull(),
    tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', "content")`),
  },
  (t) => [
    index("KnowledgeChunk_knowledgeBaseId_idx").on(t.knowledgeBaseId),
    index("KnowledgeChunk_tsv_idx").using("gin", t.tsv),
  ],
);

// Scheduled agent runs: each run posts the prompt to the agent in a new chat.
export const agentSchedules = pgTable(
  "AgentSchedule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    agentId: text("agentId")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    cron: text("cron").notNull(), // 5-field cron expression
    timezone: text("timezone").notNull().default("UTC"),
    provider: text("provider"), // null: the agent's default model
    modelId: text("modelId"),
    enabled: boolean("enabled").notNull().default(true),
    nextRunAt: timestamp("nextRunAt", { mode: "date" }),
    lastRunAt: timestamp("lastRunAt", { mode: "date" }),
    lastStatus: text("lastStatus", { enum: ["running", "ok", "error"] }),
    lastError: text("lastError"),
    lastChatId: text("lastChatId"),
    runCount: integer("runCount").notNull().default(0),
    // Optional webhook (Slack, Discord or any HTTPS endpoint) called after runs; encrypted because such URLs are secrets.
    notifyWebhook: text("notifyWebhook"),
    notifyOn: text("notifyOn", { enum: ["always", "error"] }).notNull().default("error"),
    // Email the owner's account address after runs (same notifyOn rule as the webhook).
    notifyEmail: boolean("notifyEmail").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("AgentSchedule_userId_idx").on(t.userId),
    index("AgentSchedule_due_idx").on(t.enabled, t.nextRunAt),
  ],
);

// Studio history: generated images, transcripts and speech. Files live in private uploads.
export const generations = pgTable(
  "Generation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    kind: text("kind", { enum: ["image", "transcription", "speech"] }).notNull(),
    provider: text("provider").notNull(),
    modelId: text("modelId").notNull(),
    prompt: text("prompt"), // image prompt or text that was spoken
    text: text("text"), // transcript
    files: jsonb("files").$type<string[]>().notNull().default([]), // "/uploads/..." URLs
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    durationMs: integer("durationMs"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Generation_userId_createdAt_idx").on(t.userId, t.createdAt)],
);

// Reusable assistants. userId null = built-in (visible to everyone); isPublic = shared by its author.
export const agents = pgTable(
  "Agent",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("general"),
    icon: text("icon"), // a single emoji
    systemPrompt: text("systemPrompt").notNull(),
    provider: text("provider"), // default model; the chat can still switch
    modelId: text("modelId"),
    temperature: real("temperature"),
    maxSteps: integer("maxSteps").notNull().default(8),
    toolServerIds: jsonb("toolServerIds").$type<string[]>().notNull().default([]),
    starterPrompts: jsonb("starterPrompts").$type<string[]>().notNull().default([]),
    skillIds: jsonb("skillIds").$type<string[]>().notNull().default([]), // empty = all enabled skills
    knowledgeBaseIds: jsonb("knowledgeBaseIds").$type<string[]>().notNull().default([]),
    pluginId: text("pluginId").references(() => plugins.id, { onDelete: "cascade" }),
    isPublic: boolean("isPublic").notNull().default(false),
    usageCount: integer("usageCount").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Agent_userId_idx").on(t.userId), index("Agent_isPublic_idx").on(t.isPublic)],
);

export const messages = pgTable(
  "Message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    chatId: text("chatId")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    reasoning: text("reasoning"),
    provider: text("provider"),
    modelId: text("modelId"),
    toolCalls: text("toolCalls"),
    toolResults: text("toolResults"),
    tokensIn: integer("tokensIn"),
    tokensOut: integer("tokensOut"),
    // AI SDK UIMessage parts (text, reasoning, tool calls, files); `content` keeps the plain text for search.
    parts: jsonb("parts").$type<unknown[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Message_chatId_idx").on(t.chatId)],
);

export const attachments = pgTable(
  "Attachment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Attachment_messageId_idx").on(t.messageId)],
);

// Remote MCP servers a user connected (Streamable HTTP or SSE).
export const mcpServers = pgTable(
  "McpServer",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    transport: text("transport").notNull().default("http"), // "http" | "sse"
    headers: text("headers"), // encrypted JSON object, e.g. {"Authorization": "Bearer …"}
    authType: text("authType", { enum: ["headers", "oauth"] }).notNull().default("headers"),
    // OAuth client registration, tokens and PKCE verifier (encrypted JSON); see lib/mcp-oauth.ts.
    oauth: text("oauth"),
    enabled: boolean("enabled").notNull().default(true),
    // When to ask before running a tool: "never" | "readonly" (ask unless the server marks it read-only) | "always"
    approval: text("approval").notNull().default("readonly"),
    disabledTools: jsonb("disabledTools").$type<string[]>().notNull().default([]),
    registryName: text("registryName"), // official MCP registry id it was added from
    pluginId: text("pluginId").references(() => plugins.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("McpServer_userId_idx").on(t.userId)],
);

export const datasets = pgTable(
  "Dataset",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    name: text("name").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    path: text("path").notNull(),
    rows: integer("rows"),
    columns: integer("columns"),
    indexed: boolean("indexed").notNull().default(false),
    embeddings: text("embeddings"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Dataset_userId_idx").on(t.userId)],
);

// Python notebooks saved to the account. Cells (with their last outputs, figures inline) are one jsonb value.
export const notebooks = pgTable(
  "Notebook",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    title: text("title").notNull(),
    cells: jsonb("cells").$type<NotebookCellData[]>().notNull().default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("Notebook_userId_updatedAt_idx").on(t.userId, t.updatedAt)],
);

// Usage report emails: one row per user who turned them on (lib/usage-reports.ts).
export const usageReports = pgTable(
  "UsageReport",
  {
    userId: text("userId")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    frequency: text("frequency").$type<"weekly" | "monthly">().notNull(),
    nextRunAt: timestamp("nextRunAt", { mode: "date" }).notNull(),
    lastSentAt: timestamp("lastSentAt", { mode: "date" }),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("UsageReport_nextRunAt_idx").on(t.nextRunAt)],
);

// Model calls made with the operator's env keys (lib/server-keys.ts), for SERVER_KEYS_DAILY_LIMIT_USD.
// Kept apart from messages so deleting a chat doesn't reset the day's spend.
export const serverKeyUsage = pgTable(
  "ServerKeyUsage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    provider: text("provider").notNull(),
    modelId: text("modelId").notNull(),
    tokensIn: integer("tokensIn"),
    tokensOut: integer("tokensOut"),
    costUsd: doublePrecision("costUsd"), // list price; null when the model isn't in lib/pricing.ts
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("ServerKeyUsage_userId_createdAt_idx").on(t.userId, t.createdAt)],
);

export const modelOverrides = pgTable(
  "ModelOverride",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    provider: text("provider").notNull(),
    modelId: text("modelId").notNull(),
    // Null: no reasoning override (the row may exist only for a price override).
    isReasoning: boolean("isReasoning"),
    // USD per 1M tokens; both set overrides the built-in price table (lib/pricing.ts).
    inputPricePerM: doublePrecision("inputPricePerM"),
    outputPricePerM: doublePrecision("outputPricePerM"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("ModelOverride_userId_provider_modelId_key").on(t.userId, t.provider, t.modelId),
  ],
);

export const providerConfigs = pgTable(
  "ProviderConfig",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    baseUrl: text("baseUrl"),
    apiKey: text("apiKey"),
    enabled: boolean("enabled").notNull().default(true),
    config: text("config"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("ProviderConfig_userId_provider_key").on(t.userId, t.provider)],
);

export const feedbacks = pgTable(
  "Feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    name: text("name"),
    email: text("email"),
    feedbackType: text("feedbackType").notNull().default("general"),
    subject: text("subject"),
    message: text("message").notNull(),
    rating: integer("rating"),
    status: text("status").notNull().default("new"),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolvedAt", { mode: "date" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("Feedback_status_idx").on(t.status),
    index("Feedback_createdAt_idx").on(t.createdAt),
    index("Feedback_feedbackType_idx").on(t.feedbackType),
  ],
);


export const messageReactions = pgTable(
  "MessageReaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // helpful, unhelpful, bookmark, heart, ...
    emoji: text("emoji"),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("MessageReaction_messageId_idx").on(t.messageId),
    index("MessageReaction_type_idx").on(t.type),
  ],
);

export const messageAnnotations = pgTable(
  "MessageAnnotation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // note, highlight, flag, summary
    content: text("content"),
    color: text("color").default("yellow"),
    position: integer("position"),
    length: integer("length"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("MessageAnnotation_messageId_idx").on(t.messageId),
    index("MessageAnnotation_type_idx").on(t.type),
  ],
);

export const searchHistory = pgTable(
  "SearchHistory",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    query: text("query").notNull(),
    filters: text("filters"), // JSON
    resultsCount: integer("resultsCount").default(0),
    selectedResult: text("selectedResult"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("SearchHistory_userId_idx").on(t.userId),
    index("SearchHistory_createdAt_idx").on(t.createdAt),
    index("SearchHistory_query_idx").on(t.query),
  ],
);

// ============================================================================
// Relations
// ============================================================================

export const agentSchedulesRelations = relations(agentSchedules, ({ one }) => ({
  agent: one(agents, { fields: [agentSchedules.agentId], references: [agents.id] }),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, { fields: [attachments.messageId], references: [messages.id] }),
}));

// ============================================================================
// Types
// ============================================================================

export type User = typeof user.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert;
export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;
export type UsageReport = typeof usageReports.$inferSelect;
export type ServerKeyUsage = typeof serverKeyUsage.$inferSelect;
export type ModelOverride = typeof modelOverrides.$inferSelect;
export type NewModelOverride = typeof modelOverrides.$inferInsert;
export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type Plugin = typeof plugins.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Command = typeof commands.$inferSelect;
export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type Generation = typeof generations.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type NewMessageReaction = typeof messageReactions.$inferInsert;
export type MessageAnnotation = typeof messageAnnotations.$inferSelect;
export type NewMessageAnnotation = typeof messageAnnotations.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
