import { db } from "@/lib/db";
import { messages, chats, searchHistory } from "@/lib/schema";
import { eq, and, or, ilike, gte, lte, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { escapeLike } from "@/lib/chat-organization";

export interface SearchFilters {
  chatId?: string;
  startDate?: Date;
  endDate?: Date;
  messageRole?: "user" | "assistant"; // filter by who sent the message
  provider?: string;
  hasReactions?: boolean;
  hasAnnotations?: boolean;
  minTokens?: number;
  maxTokens?: number;
  withAttachments?: boolean;
}

export interface SearchResult {
  message: {
    id: string;
    chatId: string;
    content: string;
    role: string;
    createdAt: Date;
    provider?: string;
    modelId?: string;
    tokensIn?: number;
    tokensOut?: number;
  };
  chat: {
    id: string;
    title?: string;
  };
  relevanceScore: number;
  matchedFields: string[]; // which fields matched the query
  snippet: string; // preview of matched content
}

// Advanced search in chats and messages
export async function searchChatsAndMessages(
  userId: string,
  query: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchQuery = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const conditions = [eq(chats.userId, userId)];

    // Base search - look in message content and chat titles
    const searchCondition = or(
      ilike(messages.content, searchQuery),
      ilike(chats.title, searchQuery),
    );
    if (searchCondition) conditions.push(searchCondition);

    // Apply filters
    if (filters?.chatId) {
      conditions.push(eq(messages.chatId, filters.chatId));
    }

    if (filters?.messageRole) {
      conditions.push(eq(messages.role, filters.messageRole));
    }

    if (filters?.provider) {
      conditions.push(eq(messages.provider, filters.provider));
    }

    if (filters?.startDate) {
      conditions.push(gte(messages.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(messages.createdAt, filters.endDate));
    }

    if (filters?.minTokens !== undefined) {
      const totalTokens = sql`COALESCE(${messages.tokensIn}, 0) + COALESCE(${messages.tokensOut}, 0)`;
      conditions.push(sql`${totalTokens} >= ${filters.minTokens}`);
    }

    if (filters?.maxTokens !== undefined) {
      const totalTokens = sql`COALESCE(${messages.tokensIn}, 0) + COALESCE(${messages.tokensOut}, 0)`;
      conditions.push(sql`${totalTokens} <= ${filters.maxTokens}`);
    }

    // Execute search query
    const results = await db
      .select({
        message: messages,
        chat: {
          id: chats.id,
          title: chats.title,
        },
      })
      .from(messages)
      .innerJoin(chats, eq(messages.chatId, chats.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(messages.createdAt))
      .limit(100);

    // Process results and calculate relevance scores
    const processedResults = results.map((result) => {
      const content = result.message.content || "";
      const title = result.chat.title || "";

      let relevanceScore = 0;
      const matchedFields: string[] = [];

      // Check content match
      if (content.toLowerCase().includes(query.toLowerCase())) {
        const matches = (content.match(new RegExp(query, "gi")) || []).length;
        relevanceScore += matches * 10; // 10 points per match
        matchedFields.push("content");
      }

      // Check title match (higher priority)
      if (title.toLowerCase().includes(query.toLowerCase())) {
        const matches = (title.match(new RegExp(query, "gi")) || []).length;
        relevanceScore += matches * 20; // 20 points per match in title
        matchedFields.push("title");
      }

      // Create snippet (excerpt around match)
      const lowerContent = content.toLowerCase();
      const queryLower = query.toLowerCase();
      const matchIndex = lowerContent.indexOf(queryLower);
      let snippet = content;

      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 50);
        const end = Math.min(content.length, matchIndex + query.length + 50);
        snippet =
          (start > 0 ? "..." : "") +
          content.slice(start, end) +
          (end < content.length ? "..." : "");
      } else {
        snippet = content.slice(0, 100);
      }

      return {
        message: result.message,
        chat: result.chat,
        relevanceScore,
        matchedFields,
        snippet: snippet.trim(),
      } as SearchResult;
    });

    // Sort by relevance score
    processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return processedResults;
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}

// Save search to history
export async function saveSearchToHistory(
  userId: string,
  query: string,
  filters?: SearchFilters,
  resultsCount?: number,
  selectedResult?: string,
) {
  try {
    const result = await db
      .insert(searchHistory)
      .values({
        id: createId(),
        userId,
        query,
        filters: filters ? JSON.stringify(filters) : null,
        resultsCount: resultsCount || 0,
        selectedResult,
        createdAt: new Date(),
      })
      .returning();

    return { success: true, data: result[0] };
  } catch (error) {
    console.error("Failed to save search history:", error);
    return { success: false, error: "Failed to save search history" };
  }
}

// Get search history
export async function getSearchHistory(userId: string, limit = 10) {
  try {
    const results = await db
      .select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.createdAt))
      .limit(limit);

    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to get search history:", error);
    return { success: false, error: "Failed to get search history" };
  }
}

/**
 * Distinct past queries, most recent first; with a prefix, only those starting with it.
 * (Grouped, not SELECT DISTINCT: Postgres rejects ORDER BY on a column outside a DISTINCT list.)
 */
export async function getRecentSearches(userId: string, prefix = "", limit = 5) {
  try {
    const results = await db
      .select({ query: searchHistory.query })
      .from(searchHistory)
      .where(
        and(
          eq(searchHistory.userId, userId),
          prefix ? ilike(searchHistory.query, `${escapeLike(prefix)}%`) : undefined,
        ),
      )
      .groupBy(searchHistory.query)
      .orderBy(desc(sql`max(${searchHistory.createdAt})`))
      .limit(limit);
    return results.map((r) => r.query);
  } catch (error) {
    console.error("Failed to get recent searches:", error);
    return [];
  }
}

export const getSearchSuggestions = (userId: string, prefix: string) => getRecentSearches(userId, prefix, 5);

// Clear search history
export async function clearSearchHistory(userId: string) {
  try {
    await db
      .delete(searchHistory)
      .where(eq(searchHistory.userId, userId));

    return { success: true };
  } catch (error) {
    console.error("Failed to clear search history:", error);
    return { success: false, error: "Failed to clear search history" };
  }
}

// Get popular search terms
export async function getPopularSearchTerms(userId: string, limit = 5) {
  try {
    const results = await db
      .select({
        query: searchHistory.query,
        count: sql<number>`count(*)`,
      })
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .groupBy(searchHistory.query)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);

    // Return just the queries as strings
    return results?.map((r) => r.query) || [];
  } catch (error) {
    console.error("Failed to get popular search terms:", error);
    return [];
  }
}
