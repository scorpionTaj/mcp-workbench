import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
];

/**
 * Upload file attachments
 * POST /api/attachments/upload
 */
export async function POST(req: NextRequest) {
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

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uploadedAttachments = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
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
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = file.name.split(".").pop();
        const fileName = `${timestamp}-${randomString}.${extension}`;
        const filePath = join(UPLOAD_DIR, fileName);

        // Save file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create database record
        const attachment = await prisma.attachment.create({
          data: {
            messageId,
            name: file.name,
            mime: file.type,
            size: file.size,
            url: `/uploads/${fileName}`,
          },
        });

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
}

/**
 * Get attachments for a message
 * GET /api/attachments/upload?messageId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    const attachments = await prisma.attachment.findMany({
      where: { messageId },
      orderBy: { createdAt: "asc" },
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
}

/**
 * Delete an attachment
 * DELETE /api/attachments/upload?id=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Attachment ID is required" },
        { status: 400 }
      );
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    // Delete file from filesystem
    const filePath = join(process.cwd(), "public", attachment.url);
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
    await prisma.attachment.delete({
      where: { id },
    });

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
}
