import { NextRequest, NextResponse } from "next/server";
import { ALLOWED_UPLOAD_TYPES, uploadNameForMime } from "@/lib/uploads";
import { uploadStorage } from "@/lib/storage";
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
    await uploadStorage().put(safeFilename, new Uint8Array(await file.arrayBuffer()), file.type);

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
}, { rateLimit: "upload" });
