import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Chat table
export const chats = pgTable("Chat", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  systemPrompt: text("systemPrompt"),
  defaultProvider: text("defaultProvider").notNull().default("ollama"),
  defaultModelId: text("defaultModelId"),
  toolServerIds: text("toolServerIds"),
  meta: text("meta"),
});

// Message table
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
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    chatIdIdx: index("Message_chatId_idx").on(table.chatId),
  }),
);

// Attachment table
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
  (table) => ({
    messageIdIdx: index("Attachment_messageId_idx").on(table.messageId),
  }),
);

// InstalledServer table
export const installedServers = pgTable("InstalledServer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  serverId: text("serverId").notNull().unique(),
  name: text("name").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  config: text("config"),
  installedAt: timestamp("installedAt", { mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Dataset table
export const datasets = pgTable("Dataset", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
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
});

// Settings table
export const settings = pgTable("Settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  preferredInstaller: text("preferredInstaller").notNull().default("npm"),
  githubToken: text("githubToken"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// ModelOverride table
export const modelOverrides = pgTable(
  "ModelOverride",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    provider: text("provider").notNull(),
    modelId: text("modelId").notNull(),
    isReasoning: boolean("isReasoning").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    providerModelIdUnique: unique("ModelOverride_provider_modelId_key").on(
      table.provider,
      table.modelId,
    ),
  }),
);

// ProviderConfig table
export const providerConfigs = pgTable("ProviderConfig", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  provider: text("provider").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  baseUrl: text("baseUrl"),
  apiKey: text("apiKey"),
  enabled: boolean("enabled").notNull().default(true),
  config: text("config"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Feedback table
export const feedbacks = pgTable(
  "Feedback",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
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
  (table) => ({
    statusIdx: index("Feedback_status_idx").on(table.status),
    createdAtIdx: index("Feedback_createdAt_idx").on(table.createdAt),
    feedbackTypeIdx: index("Feedback_feedbackType_idx").on(table.feedbackType),
  }),
);

// Relations
export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

// Chat Templates table
export const chatTemplates = pgTable(
  "ChatTemplate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("general"), // general, coding, analysis, creative, etc.
    systemPrompt: text("systemPrompt").notNull(),
    suggestedTools: text("suggestedTools"), // JSON array of tool names
    suggestedModel: text("suggestedModel"), // suggested provider:modelId
    modelParams: text("modelParams"), // JSON: {temperature, topP, maxTokens, etc}
    sampleMessages: text("sampleMessages"), // JSON array of sample conversation starts
    tags: text("tags"), // JSON array of tags for search
    isPublic: boolean("isPublic").notNull().default(false),
    usageCount: integer("usageCount").notNull().default(0),
    rating: integer("rating").default(0), // 0-5 rating
    author: text("author"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("ChatTemplate_category_idx").on(table.category),
    isPublicIdx: index("ChatTemplate_isPublic_idx").on(table.isPublic),
    createdAtIdx: index("ChatTemplate_createdAt_idx").on(table.createdAt),
  }),
);

// Message Reactions table
export const messageReactions = pgTable(
  "MessageReaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "helpful", "unhelpful", "bookmark", "heart", "fire", "lightbulb", etc.
    emoji: text("emoji"), // Unicode emoji for custom reactions
    count: integer("count").notNull().default(1),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("MessageReaction_messageId_idx").on(table.messageId),
    typeIdx: index("MessageReaction_type_idx").on(table.type),
  }),
);

// Message Annotations table
export const messageAnnotations = pgTable(
  "MessageAnnotation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    messageId: text("messageId")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "note", "highlight", "flag", "summary", etc.
    content: text("content"), // Annotation text content
    color: text("color").default("yellow"), // Highlight color
    position: integer("position"), // Character position in message (for inline highlights)
    length: integer("length"), // Length of highlighted text
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    messageIdIdx: index("MessageAnnotation_messageId_idx").on(table.messageId),
    typeIdx: index("MessageAnnotation_type_idx").on(table.type),
  }),
);

// Type exports for use in application code
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type InstalledServer = typeof installedServers.$inferSelect;
export type NewInstalledServer = typeof installedServers.$inferInsert;

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

export type ChatTemplate = typeof chatTemplates.$inferSelect;
export type NewChatTemplate = typeof chatTemplates.$inferInsert;

export type MessageReaction = typeof messageReactions.$inferSelect;
export type NewMessageReaction = typeof messageReactions.$inferInsert;

export type MessageAnnotation = typeof messageAnnotations.$inferSelect;
export type NewMessageAnnotation = typeof messageAnnotations.$inferInsert;
