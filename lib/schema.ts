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
  })
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
  })
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
      table.modelId
    ),
  })
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
