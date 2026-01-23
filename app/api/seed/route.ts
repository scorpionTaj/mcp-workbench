import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle-db";
import { chatTemplates } from "@/lib/schema";
import { createId } from "@paralleldrive/cuid2";

export async function POST() {
  try {
    // Check if templates already exist
    const existingCount = await db
      .select({ id: chatTemplates.id })
      .from(chatTemplates);

    if (existingCount.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Templates already exist (${existingCount.length} found)`,
        count: existingCount.length,
      });
    }

    // Seed templates
    const templates = [
      {
        id: createId(),
        name: "Code Review Assistant",
        description:
          "Expert code reviewer providing detailed feedback on code quality, performance, and best practices",
        category: "coding",
        systemPrompt: `You are an expert code reviewer. When reviewing code:
1. Focus on readability, performance, and maintainability
2. Identify potential bugs and security issues
3. Suggest refactoring opportunities
4. Provide specific examples of improvements
5. Acknowledge good practices
Be constructive and educational in your feedback.`,
        suggestedModel: "gpt-4",
        suggestedTools: JSON.stringify(["code_analyzer"]),
        modelParams: JSON.stringify({
          temperature: 0.5,
          topP: 0.9,
          maxTokens: 2000,
        }),
        tags: JSON.stringify(["coding", "review", "best-practices"]),
        isPublic: true,
        author: "System",
        createdAt: new Date(),
      },
      {
        id: createId(),
        name: "Data Analysis Expert",
        description:
          "Professional data analyst with expertise in statistical analysis and visualization",
        category: "analysis",
        systemPrompt: `You are a professional data analyst. When analyzing data:
1. Start with data understanding and exploration
2. Identify patterns, trends, and anomalies
3. Perform statistical tests when appropriate
4. Create clear visualizations
5. Provide actionable insights
Always explain your methodology and caveats.`,
        suggestedModel: "gpt-4-turbo",
        suggestedTools: JSON.stringify(["data_analyzer"]),
        modelParams: JSON.stringify({
          temperature: 0.3,
          topP: 0.95,
          maxTokens: 2500,
        }),
        tags: JSON.stringify(["data", "analysis", "statistics"]),
        isPublic: true,
        author: "System",
        createdAt: new Date(),
      },
      {
        id: createId(),
        name: "Creative Writing Coach",
        description:
          "Helps improve writing with grammar, style, and creative suggestions",
        category: "creative",
        systemPrompt: `You are a creative writing coach. When reviewing writing:
1. Assess clarity, flow, and impact
2. Identify grammatical and stylistic issues
3. Suggest stronger word choices
4. Enhance narrative and descriptive elements
5. Maintain the author's voice and intent
Be encouraging while providing constructive feedback.`,
        suggestedModel: "gpt-4",
        suggestedTools: JSON.stringify(["grammar_checker", "thesaurus"]),
        modelParams: JSON.stringify({
          temperature: 0.7,
          topP: 0.95,
          maxTokens: 1500,
        }),
        tags: JSON.stringify(["writing", "creative", "grammar"]),
        isPublic: true,
        author: "System",
        createdAt: new Date(),
      },
      {
        id: createId(),
        name: "Research Paper Assistant",
        description:
          "Assists with research paper writing, citations, and academic structure",
        category: "research",
        systemPrompt: `You are an academic research assistant. When helping with research papers:
1. Maintain academic rigor and formality
2. Ensure proper citation formatting
3. Help structure arguments logically
4. Identify gaps in reasoning
5. Suggest improvements to methodology sections
Follow the paper's specified citation style throughout.`,
        suggestedModel: "gpt-4-turbo",
        suggestedTools: JSON.stringify([
          "citation_formatter",
          "research_database",
        ]),
        modelParams: JSON.stringify({
          temperature: 0.4,
          topP: 0.9,
          maxTokens: 3000,
        }),
        tags: JSON.stringify(["academic", "research", "writing"]),
        isPublic: true,
        author: "System",
        createdAt: new Date(),
      },
    ];

    await db.insert(chatTemplates).values(templates);

    return NextResponse.json({
      success: true,
      message: "Templates seeded successfully",
      count: templates.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Seeding failed",
      },
      { status: 500 },
    );
  }
}
