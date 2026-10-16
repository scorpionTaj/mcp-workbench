import { withUser } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import {
  searchChatsAndMessages,
  saveSearchToHistory,
  getSearchHistory,
  getSearchSuggestions,
  getRecentSearches,
  getPopularSearchTerms,
  clearSearchHistory,
  type SearchFilters,
} from "@/lib/search-service";

export const GET = withUser(async (request, user) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const query = searchParams.get("q");

    // Get search suggestions
    if (action === "suggestions") {
      const prefix = query || "";
      const suggestions = await getSearchSuggestions(user.id, prefix);
      return NextResponse.json(suggestions);
    }

    // Get search history
    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const result = await getSearchHistory(user.id, Math.min(limit, 100));
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result.data);
    }

    // Distinct recent queries (the history list saves only searches the user acted on)
    if (action === "recent") {
      const limit = parseInt(searchParams.get("limit") || "5");
      return NextResponse.json(await getRecentSearches(user.id, "", Math.min(Math.max(limit, 1), 20)));
    }

    // Get popular searches
    if (action === "popular") {
      const limit = parseInt(searchParams.get("limit") || "5");
      const results = await getPopularSearchTerms(user.id, Math.min(limit, 50));
      return NextResponse.json(results);
    }

    // Default: search
    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 },
      );
    }

    // Parse filters
    const filters: SearchFilters = {};

    if (searchParams.has("chatId")) {
      filters.chatId = searchParams.get("chatId") || undefined;
    }

    if (searchParams.has("role")) {
      const role = searchParams.get("role");
      if (role === "user" || role === "assistant") {
        filters.messageRole = role;
      }
    }

    if (searchParams.has("provider")) {
      filters.provider = searchParams.get("provider") || undefined;
    }

    if (searchParams.has("startDate")) {
      const date = searchParams.get("startDate");
      if (date) filters.startDate = new Date(date);
    }

    if (searchParams.has("endDate")) {
      const date = searchParams.get("endDate");
      if (date) filters.endDate = new Date(date);
    }

    if (searchParams.has("minTokens")) {
      filters.minTokens = parseInt(searchParams.get("minTokens") || "0");
    }

    if (searchParams.has("maxTokens")) {
      filters.maxTokens = parseInt(searchParams.get("maxTokens") || "999999");
    }

    // Perform search
    const results = await searchChatsAndMessages(user.id, query, filters);

    // Search-as-you-type passes no save flag, so partial words don't fill the history.
    if (searchParams.get("save") === "1") {
      await saveSearchToHistory(user.id, query, filters, results.length);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withUser(async (request, user) => {
  try {
    const body = await request.json();
    const { query, filters, selectedResult, record } = body;

    if (!query || typeof query !== "string" || query.length > 500) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Record a search the user acted on (e.g. opened a result) without running it again.
    if (record) {
      await saveSearchToHistory(user.id, query.trim(), undefined, undefined, typeof selectedResult === "string" ? selectedResult : undefined);
      return NextResponse.json({ success: true });
    }

    // Search
    const results = await searchChatsAndMessages(user.id, query, filters);

    // Save to history with result tracking
    await saveSearchToHistory(user.id, query, filters, results.length, selectedResult);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const DELETE = withUser(async (_req, user) => {
  const result = await clearSearchHistory(user.id);
  return result.success
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: result.error }, { status: 500 });
});
