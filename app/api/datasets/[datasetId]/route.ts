import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params;

    // In production, this would:
    // 1. Delete the file from storage
    // 2. Remove dataset info from database
    // 3. Clean up any vector embeddings

    logger.info(`MCP Workbench Deleting dataset: ${datasetId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("MCP Workbench Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete dataset" },
      { status: 500 }
    );
  }
}
