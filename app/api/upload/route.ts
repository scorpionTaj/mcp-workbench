import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { UPLOAD_DIR, ALLOWED_UPLOAD_TYPES, uploadNameForMime } from "@/lib/uploads";
import logger from "@/lib/logger";
import { withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Upload file endpoint
 * POST /api/upload - Upload a file
 */
export const POST = withUser(async (request, user) => {
  try {
    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const safeFilename = uploadNameForMime(file.type, user.id)!;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${safeFilename}`;

    logger.info(
      {
        filename: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
      },
      "File uploaded successfully"
    );

    return NextResponse.json({
      id: safeFilename.split(".")[0],
      name: file.name,
      size: file.size,
      type: file.type,
      url: fileUrl,
    });
  } catch (error) {
    logger.error({ err: error }, "File upload failed");

    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});
