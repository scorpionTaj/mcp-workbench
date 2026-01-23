import { NextRequest, NextResponse } from "next/server";
import {
  searchChatsAndMessages,
  saveSearchToHistory,
  getSearchHistory,
  getSearchSuggestions,
  getPopularSearchTerms,
  type SearchFilters,
} from "@/lib/search-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const query = searchParams.get("q");

    // Get search suggestions
    if (action === "suggestions") {
      const prefix = query || "";
      const suggestions = await getSearchSuggestions(prefix);
      return NextResponse.json(suggestions);
    }

    // Get search history
    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const result = await getSearchHistory(limit);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json(result.data);
    }

    // Get popular searches
    if (action === "popular") {
      const limit = parseInt(searchParams.get("limit") || "5");
      const results = await getPopularSearchTerms(limit);
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
    const results = await searchChatsAndMessages(query, filters);

    // Save to search history
    await saveSearchToHistory(query, filters, results.length);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters, selectedResult } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Search
    const results = await searchChatsAndMessages(query, filters);

    // Save to history with result tracking
    await saveSearchToHistory(query, filters, results.length, selectedResult);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
