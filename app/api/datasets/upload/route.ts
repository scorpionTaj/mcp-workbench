import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import logger from "@/lib/logger";
import { createDataset as dbCreateDataset } from "@/lib/db-cached";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["text/csv", "application/x-parquet"];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".parquet")
    ) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only CSV and Parquet files are supported",
        },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist and save the file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Generate a unique filename to avoid conflicts
    const fileExtension = path.extname(file.name);
    const fileNameWithoutExt = path.basename(file.name, fileExtension);
    const uniqueFileName = `${fileNameWithoutExt}_${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    
    // Convert file blob to buffer and save to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    
    // Save dataset metadata to database
    const dataset = await dbCreateDataset({
      name: file.name,
      filename: uniqueFileName,  // Store the unique filename
      mime: file.type,
      size: file.size,
      path: `/uploads/${uniqueFileName}`, // Publicly accessible path
      rows: undefined, // Will be calculated after parsing
      columns: undefined, // Will be calculated after parsing
      indexed: false,
    });

    logger.info(
      `MCP Workbench Dataset uploaded: ${dataset.name}, ID: ${dataset.id}, size: ${dataset.size}`
    );

    return NextResponse.json({
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        type: file.name.endsWith(".csv") ? "csv" : "parquet",
        size: dataset.size,
        uploadedAt: dataset.createdAt,
        indexed: dataset.indexed,
        rows: dataset.rows,
        columns: dataset.columns,
      },
    });
  } catch (error) {
    logger.error("MCP Workbench Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload dataset" },
      { status: 500 }
    );
  }
}
