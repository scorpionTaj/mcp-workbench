import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db, schema, ownedMessage } from "@/lib/db";
import { eq } from "drizzle-orm";
import { UPLOAD_DIR, ALLOWED_UPLOAD_TYPES, uploadNameForMime, resolveUploadUrl } from "@/lib/uploads";
import logger from "@/lib/logger";
import { withUser, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Upload file attachments
 * POST /api/attachments/upload
 */
export const POST = withUser(async (req, user) => {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const messageId = formData.get("messageId") as string;

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }
    if (!(await ownedMessage(user.id, messageId))) return notFound();

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadedAttachments = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
        logger.warn(
          { fileName: file.name, fileType: file.type },
          "Invalid file type uploaded"
        );
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        logger.warn(
          { fileName: file.name, fileSize: file.size },
          "File size exceeds limit"
        );
        continue;
      }

      try {
        const fileName = uploadNameForMime(file.type, user.id)!;
        const filePath = join(UPLOAD_DIR, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create database record
        const [attachment] = await db
          .insert(schema.attachments)
          .values({
            messageId,
            name: file.name,
            mime: file.type,
            size: file.size,
            url: `/uploads/${fileName}`,
            createdAt: new Date(),
          })
          .returning();

        uploadedAttachments.push(attachment);

        logger.info(
          {
            attachmentId: attachment.id,
            fileName: file.name,
            fileSize: file.size,
          },
          "File uploaded successfully"
        );
      } catch (error) {
        logger.error(
          { err: error, fileName: file.name },
          "Failed to upload file"
        );
      }
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedAttachments,
      count: uploadedAttachments.length,
    });
  } catch (error) {
    logger.error({ err: error }, "File upload failed");
    return NextResponse.json(
      {
        error: "Failed to upload files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

/**
 * Get attachments for a message
 * GET /api/attachments/upload?messageId=xxx
 */
export const GET = withUser(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }
    if (!(await ownedMessage(user.id, messageId))) return notFound();

    const attachments = await db.query.attachments.findMany({
      where: eq(schema.attachments.messageId, messageId),
      orderBy: [schema.attachments.createdAt],
    });

    return NextResponse.json({ attachments });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch attachments");
    return NextResponse.json(
      {
        error: "Failed to fetch attachments",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

/**
 * Delete an attachment
 * DELETE /api/attachments/upload?id=xxx
 */
export const DELETE = withUser(async (req, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Attachment ID is required" },
        { status: 400 }
      );
    }

    const attachment = await db.query.attachments.findFirst({
      where: eq(schema.attachments.id, id),
    });

    if (!attachment || !(await ownedMessage(user.id, attachment.messageId))) return notFound();

    // Delete file from filesystem
    const filePath = resolveUploadUrl(attachment.url);
    try {
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
    } catch (error) {
      logger.warn(
        { err: error, filePath },
        "Failed to delete file from filesystem"
      );
    }

    // Delete database record
    await db.delete(schema.attachments).where(eq(schema.attachments.id, id));

    logger.info({ attachmentId: id }, "Attachment deleted");

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete attachment");
    return NextResponse.json(
      {
        error: "Failed to delete attachment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
