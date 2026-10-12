import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { UPLOAD_DIR, newUploadName } from "@/lib/uploads";
import logger from "@/lib/logger";
import { toClientDataset } from "@/lib/datasets";
import fs from "fs";
import path from "path";
import { withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const POST = withUser(async (request, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Browsers send unreliable MIME types for csv/parquet, so trust only the suffix,
    // and store under a server-generated name with exactly that suffix.
    const ext = file.name.toLowerCase().match(/\.(csv|parquet)$/)?.[1];
    if (!ext) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only CSV and Parquet files are supported",
        },
        { status: 400 }
      );
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const uniqueFileName = newUploadName(ext);
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);
    
    // Convert file blob to buffer and save to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    // Save dataset metadata to database
    const [dataset] = await db.insert(schema.datasets).values({
      userId: user.id,
      name: file.name,
      filename: uniqueFileName,  // Store the unique filename
      mime: file.type,
      size: file.size,
      path: `/uploads/${uniqueFileName}`, // Publicly accessible path
      rows: null,
      columns: null,
      indexed: false,
      embeddings: null,
    }).returning();

    logger.info(
      `MCP Workbench Dataset uploaded: ${dataset.name}, ID: ${dataset.id}, size: ${dataset.size}`
    );

    return NextResponse.json({ success: true, dataset: toClientDataset(dataset) });
  } catch (error) {
    logger.error({ err: error }, "MCP Workbench Upload error");
    return NextResponse.json(
      { error: "Failed to upload dataset" },
      { status: 500 }
    );
  }
});
