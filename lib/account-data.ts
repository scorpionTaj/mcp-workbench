import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { deleteUpload, readUpload } from "@/lib/storage";
import { isOwnUpload, MIME_BY_EXT, uploadName } from "@/lib/uploads";

export const MAX_ACCOUNT_EXPORT_FILE_BYTES = 100 * 1024 * 1024;

export class AccountExportError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function omit<T extends object, K extends keyof T>(row: T, ...keys: K[]): Omit<T, K> {
  const safe = { ...row };
  for (const key of keys) delete (safe as Partial<T>)[key];
  return safe;
}

export function exportApiKey<T extends { hash: string }>(row: T) {
  return omit(row, "hash");
}

export function exportProviderConfig<T extends { apiKey: string | null; config: string | null }>(row: T) {
  const { apiKey, config, ...safe } = row;
  return { ...safe, hasApiKey: Boolean(apiKey), hasCustomConfig: Boolean(config) };
}

export function exportMcpServer<T extends { headers: string | null; oauth: string | null }>(row: T) {
  const { headers, oauth, ...safe } = row;
  return { ...safe, hasHeaders: Boolean(headers), hasOAuth: Boolean(oauth) };
}

export function exportSchedule<T extends { notifyWebhook: string | null }>(row: T) {
  const { notifyWebhook, ...safe } = row;
  return { ...safe, webhookConfigured: Boolean(notifyWebhook) };
}

export async function buildAccountExport(userId: string) {
  const [
    profile,
    apiKeys,
    chatFolders,
    chats,
    plugins,
    skills,
    commands,
    knowledgeBases,
    agentSchedules,
    generations,
    agents,
    mcpServers,
    datasets,
    notebooks,
    usageReports,
    serverKeyUsage,
    modelOverrides,
    providerConfigs,
    feedbacks,
    searchHistory,
    billing,
  ] = await Promise.all([
    db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { id: true, name: true, email: true, emailVerified: true, createdAt: true, policyAcceptedAt: true, policyVersion: true },
    }),
    db.select().from(schema.apiKeys).where(eq(schema.apiKeys.userId, userId)),
    db.select().from(schema.chatFolders).where(eq(schema.chatFolders.userId, userId)),
    db.select().from(schema.chats).where(eq(schema.chats.userId, userId)),
    db.select().from(schema.plugins).where(eq(schema.plugins.userId, userId)),
    db.select().from(schema.skills).where(eq(schema.skills.userId, userId)),
    db.select().from(schema.commands).where(eq(schema.commands.userId, userId)),
    db.select().from(schema.knowledgeBases).where(eq(schema.knowledgeBases.userId, userId)),
    db.select().from(schema.agentSchedules).where(eq(schema.agentSchedules.userId, userId)),
    db.select().from(schema.generations).where(eq(schema.generations.userId, userId)),
    db.select().from(schema.agents).where(eq(schema.agents.userId, userId)),
    db.select().from(schema.mcpServers).where(eq(schema.mcpServers.userId, userId)),
    db.select().from(schema.datasets).where(eq(schema.datasets.userId, userId)),
    db.select().from(schema.notebooks).where(eq(schema.notebooks.userId, userId)),
    db.select().from(schema.usageReports).where(eq(schema.usageReports.userId, userId)),
    db.select().from(schema.serverKeyUsage).where(eq(schema.serverKeyUsage.userId, userId)),
    db.select().from(schema.modelOverrides).where(eq(schema.modelOverrides.userId, userId)),
    db.select().from(schema.providerConfigs).where(eq(schema.providerConfigs.userId, userId)),
    db.select({ id: schema.feedbacks.id, feedbackType: schema.feedbacks.feedbackType, subject: schema.feedbacks.subject, message: schema.feedbacks.message, rating: schema.feedbacks.rating, createdAt: schema.feedbacks.createdAt })
      .from(schema.feedbacks).where(eq(schema.feedbacks.userId, userId)),
    db.select().from(schema.searchHistory).where(eq(schema.searchHistory.userId, userId)),
    db.query.billingAccounts.findFirst({
      where: eq(schema.billingAccounts.userId, userId),
      columns: { subscriptionStatus: true, stripePriceId: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
  ]);
  if (!profile) return null;

  const chatIds = chats.map((chat) => chat.id);
  const knowledgeBaseIds = knowledgeBases.map((base) => base.id);
  const [messages, knowledgeDocuments, knowledgeChunks] = await Promise.all([
    chatIds.length ? db.select().from(schema.messages).where(inArray(schema.messages.chatId, chatIds)) : [],
    knowledgeBaseIds.length ? db.select().from(schema.knowledgeDocuments).where(inArray(schema.knowledgeDocuments.knowledgeBaseId, knowledgeBaseIds)) : [],
    knowledgeBaseIds.length ? db.select().from(schema.knowledgeChunks).where(inArray(schema.knowledgeChunks.knowledgeBaseId, knowledgeBaseIds)) : [],
  ]);
  const messageIds = messages.map((message) => message.id);
  const [attachments, reactions, annotations] = await Promise.all([
    messageIds.length ? db.select().from(schema.attachments).where(inArray(schema.attachments.messageId, messageIds)) : [],
    messageIds.length ? db.select().from(schema.messageReactions).where(inArray(schema.messageReactions.messageId, messageIds)) : [],
    messageIds.length ? db.select().from(schema.messageAnnotations).where(inArray(schema.messageAnnotations.messageId, messageIds)) : [],
  ]);

  const urls = [...new Set([
    ...datasets.map((dataset) => dataset.path),
    ...generations.flatMap((generation) => generation.files),
    ...attachments.map((attachment) => attachment.url),
  ].filter((url) => url.startsWith("/uploads/")))];
  const files: { name: string; contentType: string; contentBase64: string }[] = [];
  let fileBytes = 0;
  for (const url of urls) {
    let name: string;
    try {
      name = uploadName(url);
    } catch {
      throw new AccountExportError("An account file could not be exported safely. Contact support.", 500);
    }
    const bytes = await readUpload(url);
    if (!bytes) throw new AccountExportError("An account file is missing from storage. Contact support.", 503);
    fileBytes += bytes.byteLength;
    if (fileBytes > MAX_ACCOUNT_EXPORT_FILE_BYTES) {
      throw new AccountExportError("Account files exceed the 100 MB export limit. Download large files individually first.", 413);
    }
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    files.push({ name, contentType: MIME_BY_EXT[extension] ?? "application/octet-stream", contentBase64: bytes.toString("base64") });
  }
  const fileNameByUrl = new Map(urls.map((url) => [url, uploadName(url)]));

  return {
    format: "mcp-workbench-cloud-account-export-v1",
    generatedAt: new Date().toISOString(),
    account: profile,
    billing: billing ?? null,
    data: {
      apiKeys: apiKeys.map(exportApiKey),
      chatFolders,
      chats,
      messages,
      attachments: attachments.map(({ url, ...attachment }) => ({ ...attachment, fileName: fileNameByUrl.get(url) ?? null })),
      messageReactions: reactions,
      messageAnnotations: annotations,
      agents,
      agentSchedules: agentSchedules.map(exportSchedule),
      plugins,
      skills,
      commands,
      knowledgeBases,
      knowledgeDocuments,
      knowledgeChunks: knowledgeChunks.map((chunk) => omit(chunk, "embedding")),
      mcpServers: mcpServers.map(exportMcpServer),
      datasets: datasets.map((dataset) => ({
        ...omit(dataset, "path", "filename"),
        fileName: fileNameByUrl.get(dataset.path) ?? null,
      })),
      generations: generations.map((generation) => ({
        ...generation,
        files: generation.files.map((url) => fileNameByUrl.get(url) ?? null).filter(Boolean),
      })),
      notebooks,
      usageReports: usageReports.map((report) => omit(report, "lastError")),
      serverKeyUsage,
      modelOverrides,
      providerConfigs: providerConfigs.map(exportProviderConfig),
      feedback: feedbacks,
      searchHistory,
    },
    files,
    omittedSecrets: [
      "password hashes and sessions",
      "OAuth access and refresh tokens",
      "personal API key hashes",
      "provider API keys and custom configuration secrets",
      "MCP server credentials and webhook URLs",
      "knowledge-base embedding vectors",
    ],
  };
}

export async function deleteUserFiles(userId: string) {
  const [datasets, generations, attachments] = await Promise.all([
    db.select({ url: schema.datasets.path }).from(schema.datasets).where(eq(schema.datasets.userId, userId)),
    db.select({ files: schema.generations.files }).from(schema.generations).where(eq(schema.generations.userId, userId)),
    db.select({ url: schema.attachments.url })
      .from(schema.attachments)
      .innerJoin(schema.messages, eq(schema.attachments.messageId, schema.messages.id))
      .innerJoin(schema.chats, eq(schema.messages.chatId, schema.chats.id))
      .where(eq(schema.chats.userId, userId)),
  ]);
  const urls = new Set([
    ...datasets.map(({ url }) => url),
    ...generations.flatMap(({ files }) => files),
    ...attachments.map(({ url }) => url),
  ]);
  for (const url of urls) {
    if (isOwnUpload(url, userId)) await deleteUpload(url);
  }
}
