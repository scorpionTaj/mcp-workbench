import { NextResponse } from "next/server";

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

    // In production, this would:
    // 1. Save the file to storage
    // 2. Parse the file to extract metadata (rows, columns)
    // 3. Store dataset info in database
    // 4. Optionally generate embeddings for vector search

    console.log(
      `MCP Workbench Uploading dataset: ${file.name}, size: ${file.size}`
    );

    return NextResponse.json({
      success: true,
      dataset: {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.name.endsWith(".csv") ? "csv" : "parquet",
        size: file.size,
        uploadedAt: new Date(),
        indexed: false,
      },
    });
  } catch (error) {
    console.error("MCP Workbench Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload dataset" },
      { status: 500 }
    );
  }
}
