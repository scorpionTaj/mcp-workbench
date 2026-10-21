import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { newUploadName } from "@/lib/uploads";
import { uploadStorage } from "@/lib/storage";
import logger from "@/lib/logger";
import { DATASET_MAX_BYTES, toClientDataset } from "@/lib/datasets";
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
    const ext = file.name.toLowerCase().match(/\.(csv|tsv|parquet)$/)?.[1];
    if (!ext) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only CSV, TSV and Parquet files are supported",
        },
        { status: 400 }
      );
    }
    if (file.size > DATASET_MAX_BYTES) {
      return NextResponse.json({ error: "Datasets can be at most 50 MB" }, { status: 400 });
    }

    const uniqueFileName = newUploadName(ext, user.id);
    await uploadStorage().put(uniqueFileName, new Uint8Array(await file.arrayBuffer()));

    // Save dataset metadata to database
    const [dataset] = await db.insert(schema.datasets).values({
      userId: user.id,
      name: file.name,
      filename: uniqueFileName,  // Store the unique filename
      mime: file.type,
      size: file.size,
      path: `/uploads/${uniqueFileName}`, // served to its owner by app/uploads/[name]
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
