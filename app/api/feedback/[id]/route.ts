import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle-db";
import { feedbacks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { cacheInvalidate } from "@/lib/cache";

// PATCH /api/feedback/[id] - Update feedback status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, resolved, notes } = body;

    // Validate status
    const validStatuses = ["new", "in-progress", "resolved", "archived"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Find existing feedback
    const [existingFeedback] = await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.id, id));

    if (!existingFeedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Update feedback
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (resolved !== undefined) {
      updateData.resolved = resolved;
      if (resolved && !existingFeedback.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updatedFeedback] = await db
      .update(feedbacks)
      .set(updateData)
      .where(eq(feedbacks.id, id))
      .returning();

    logger.info({
      msg: "Feedback updated",
      feedbackId: id,
      status: updatedFeedback.status,
      resolved: updatedFeedback.resolved,
    });

    // Invalidate feedback cache
    await cacheInvalidate.feedbackItem(id);

    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
    });
  } catch (error) {
    logger.error({ msg: "Error updating feedback", error });
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}

// DELETE /api/feedback/[id] - Delete feedback
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Delete feedback
    const [deletedFeedback] = await db
      .delete(feedbacks)
      .where(eq(feedbacks.id, id))
      .returning();

    if (!deletedFeedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    logger.info({
      msg: "Feedback deleted",
      feedbackId: id,
    });

    // Invalidate feedback cache
    await cacheInvalidate.feedbackItem(id);

    return NextResponse.json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    logger.error({ msg: "Error deleting feedback", error });
    return NextResponse.json(
      { error: "Failed to delete feedback" },
      { status: 500 }
    );
  }
}
