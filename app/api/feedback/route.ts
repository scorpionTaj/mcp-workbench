import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle-db";
import { feedbacks } from "@/lib/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  CACHE_KEYS,
  TTL,
} from "@/lib/cache";

// POST /api/feedback - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, feedbackType, subject, message, rating } = body;

    // Validation
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: "Message is too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate feedback type
    const validTypes = ["general", "bug", "feature", "improvement", "question"];
    if (feedbackType && !validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Insert feedback
    const [newFeedback] = await db
      .insert(feedbacks)
      .values({
        name: name?.trim() || null,
        email: email?.trim() || null,
        feedbackType: feedbackType || "general",
        subject: subject?.trim() || null,
        message: message.trim(),
        rating: rating || null,
        status: "new",
        resolved: false,
      })
      .returning();

    logger.info({
      msg: "Feedback submitted",
      feedbackId: newFeedback.id,
      type: newFeedback.feedbackType,
      hasEmail: !!newFeedback.email,
    });

    // Invalidate feedback cache
    await cacheInvalidate.feedback();

    return NextResponse.json(
      {
        success: true,
        message: "Thank you for your feedback!",
        feedback: {
          id: newFeedback.id,
          createdAt: newFeedback.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ msg: "Error submitting feedback", error });
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET /api/feedback - Get all feedback (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const feedbackType = searchParams.get("type");
    const resolved = searchParams.get("resolved");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Create cache key based on query parameters
    const cacheKey = `${CACHE_KEYS.FEEDBACK_LIST}${status || "all"}:${
      feedbackType || "all"
    }:${resolved || "all"}:${limit}:${offset}`;

    // Try to get from cache first
    const cachedData = await cacheGet<any>(cacheKey);
    if (cachedData) {
      logger.info({ msg: "Feedback list served from cache", cacheKey });
      return NextResponse.json(cachedData);
    }

    // Build query conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(feedbacks.status, status));
    }
    if (feedbackType) {
      conditions.push(eq(feedbacks.feedbackType, feedbackType));
    }
    if (resolved !== null && resolved !== undefined) {
      conditions.push(eq(feedbacks.resolved, resolved === "true"));
    }

    // Query feedback with filters
    const allFeedback = await db
      .select()
      .from(feedbacks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(feedbacks.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(feedbacks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get statistics
    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        newCount: sql<number>`count(*) filter (where ${feedbacks.status} = 'new')`,
        resolvedCount: sql<number>`count(*) filter (where ${feedbacks.resolved} = true)`,
        avgRating: sql<number>`avg(${feedbacks.rating})`,
      })
      .from(feedbacks);

    const responseData = {
      feedback: allFeedback,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
      },
      stats: {
        total: stats.total || 0,
        new: stats.newCount || 0,
        resolved: stats.resolvedCount || 0,
        averageRating:
          stats.avgRating !== null && stats.avgRating !== undefined
            ? parseFloat(Number(stats.avgRating).toFixed(2))
            : null,
      },
    };

    // Cache the response for 2 minutes
    await cacheSet(cacheKey, responseData, TTL.SHORT);
    logger.info({ msg: "Feedback list cached", cacheKey });

    return NextResponse.json(responseData);
  } catch (error) {
    logger.error({ msg: "Error fetching feedback", error });
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
