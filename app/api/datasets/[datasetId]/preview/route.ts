import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params;

    // In production, this would:
    // 1. Read the dataset file
    // 2. Parse the first N rows
    // 3. Return column names and sample data

    console.log(`MCP Workbench Previewing dataset: ${datasetId}`);

    // Mock preview data
    const mockPreview = {
      columns: ["id", "name", "value", "category", "timestamp"],
      data: [
        {
          id: 1,
          name: "Item A",
          value: 100,
          category: "Type 1",
          timestamp: "2024-01-01",
        },
        {
          id: 2,
          name: "Item B",
          value: 200,
          category: "Type 2",
          timestamp: "2024-01-02",
        },
        {
          id: 3,
          name: "Item C",
          value: 150,
          category: "Type 1",
          timestamp: "2024-01-03",
        },
        {
          id: 4,
          name: "Item D",
          value: 300,
          category: "Type 3",
          timestamp: "2024-01-04",
        },
        {
          id: 5,
          name: "Item E",
          value: 250,
          category: "Type 2",
          timestamp: "2024-01-05",
        },
      ],
      rows: 100,
      size: 5120,
    };

    return NextResponse.json(mockPreview);
  } catch (error) {
    console.error("MCP Workbench Preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview dataset" },
      { status: 500 }
    );
  }
}
