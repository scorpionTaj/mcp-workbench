import { createTemplate } from "@/lib/templates-service";

export async function seedTemplates() {
  const templates = [
    {
      name: "Code Review Assistant",
      description: "Expert code reviewer providing detailed feedback on code quality, performance, and best practices",
      category: "coding",
      systemPrompt: `You are an expert code reviewer. When reviewing code:
1. Focus on readability, performance, and maintainability
2. Identify potential bugs and security issues
3. Suggest refactoring opportunities
4. Provide specific examples of improvements
5. Acknowledge good practices
Be constructive and educational in your feedback.`,
      suggestedTools: ["code_analyzer"],
      suggestedModel: "gpt-4",
      modelParams: {
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 2000,
      },
      tags: ["coding", "review", "best-practices"],
      isPublic: true,
      author: "System",
    },
    {
      name: "Data Analysis Expert",
      description: "Specialized in analyzing datasets, identifying patterns, and providing actionable insights",
      category: "analysis",
      systemPrompt: `You are a data analysis expert. When analyzing data:
1. Look for significant patterns and trends
2. Identify outliers and anomalies
3. Provide statistical context
4. Suggest visualization approaches
5. Recommend next steps for deeper analysis
Always explain findings in non-technical language when appropriate.`,
      suggestedTools: ["data_analyzer"],
      suggestedModel: "gpt-4-turbo",
      modelParams: {
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 3000,
      },
      tags: ["analysis", "data", "insights"],
      isPublic: true,
      author: "System",
    },
    {
      name: "Creative Writing Coach",
      description: "Professional writing coach helping improve narrative, dialogue, and storytelling",
      category: "creative",
      systemPrompt: `You are a professional creative writing coach. When helping writers:
1. Provide constructive feedback on narrative flow and pacing
2. Suggest dialogue improvements for authenticity
3. Help develop character depth and motivation
4. Offer specific examples of strong writing
5. Encourage experimentation while maintaining craft
Be supportive and inspiring while maintaining high standards.`,
      suggestedTools: ["grammar_checker", "thesaurus"],
      suggestedModel: "gpt-4",
      modelParams: {
        temperature: 0.8,
        topP: 1.0,
        maxTokens: 2500,
      },
      tags: ["creative", "writing", "storytelling"],
      isPublic: true,
      author: "System",
    },
    {
      name: "Research Paper Assistant",
      description: "Helps with academic research, literature review, and paper structuring",
      category: "research",
      systemPrompt: `You are an academic research assistant. When helping with research:
1. Identify relevant academic sources and citations
2. Help structure arguments logically
3. Ensure proper academic tone and format
4. Point out logical gaps or unsupported claims
5. Suggest data-driven approaches
Support both quantitative and qualitative research methodologies.`,
      suggestedTools: ["citation_formatter", "research_database"],
      suggestedModel: "gpt-4-turbo",
      modelParams: {
        temperature: 0.4,
        topP: 0.85,
        maxTokens: 4000,
      },
      tags: ["research", "academic", "writing"],
      isPublic: true,
      author: "System",
    },
  ];

  const results = [];
  for (const template of templates) {
    const result = await createTemplate(template);
    results.push(result);
  }

  return results;
}
