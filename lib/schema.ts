import { relations } from "drizzle-orm";
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
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

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

// ============================================================================
// App tables — everything user-owned carries userId; messages/attachments/
// reactions/annotations are owned through their chat.
// ============================================================================

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
  },
  (t) => [index("Chat_userId_updatedAt_idx").on(t.userId, t.updatedAt)],
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
    enabled: boolean("enabled").notNull().default(true),
    // When to ask before running a tool: "never" | "readonly" (ask unless the server marks it read-only) | "always"
    approval: text("approval").notNull().default("readonly"),
    disabledTools: jsonb("disabledTools").$type<string[]>().notNull().default([]),
    registryName: text("registryName"), // official MCP registry id it was added from
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

// One row per user (id = userId)
export const settings = pgTable("Settings", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredInstaller: text("preferredInstaller").notNull().default("npm"),
  githubToken: text("githubToken"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const modelOverrides = pgTable(
  "ModelOverride",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: userId(),
    provider: text("provider").notNull(),
    modelId: text("modelId").notNull(),
    isReasoning: boolean("isReasoning").notNull(),
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
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type ModelOverride = typeof modelOverrides.$inferSelect;
export type NewModelOverride = typeof modelOverrides.$inferInsert;
export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type NewMessageReaction = typeof messageReactions.$inferInsert;
export type MessageAnnotation = typeof messageAnnotations.$inferSelect;
export type NewMessageAnnotation = typeof messageAnnotations.$inferInsert;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type NewSearchHistory = typeof searchHistory.$inferInsert;
