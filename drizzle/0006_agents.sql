CREATE TABLE "Agent" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"icon" text,
	"systemPrompt" text NOT NULL,
	"provider" text,
	"modelId" text,
	"temperature" real,
	"maxSteps" integer DEFAULT 8 NOT NULL,
	"toolServerIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starterPrompts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"usageCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "agentId" text;--> statement-breakpoint
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Agent_userId_idx" ON "Agent" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Agent_isPublic_idx" ON "Agent" USING btree ("isPublic");--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_agentId_Agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."Agent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "Agent" ("id", "name", "description", "category", "icon", "systemPrompt", "maxSteps", "starterPrompts") VALUES
('builtin-assistant', 'General Assistant', 'A helpful, concise assistant for everyday questions.', 'general', '💬',
 'You are a helpful, precise assistant. Answer concisely, ask a clarifying question when a request is ambiguous, and say so when you are unsure.',
 8, '["Explain this concept simply", "Help me plan my week", "Summarize the key points of a topic"]'),
('builtin-coder', 'Code Reviewer', 'Reviews code for bugs, security issues and readability.', 'coding', '🧑‍💻',
 'You are a senior software engineer reviewing code. Point out correctness bugs first, then security issues, then readability. Quote the exact lines, explain why each issue matters, and propose a minimal fix. Do not rewrite code that is fine.',
 8, '["Review this function for bugs", "Is this SQL query safe?", "How can I simplify this code?"]'),
('builtin-researcher', 'Research Agent', 'Uses your MCP tools to gather facts and cite them.', 'research', '🔎',
 'You are a careful research agent. Break the question into steps, use the available tools to gather evidence, and cite which tool result supports each claim. If the tools cannot answer, say what is missing instead of guessing.',
 12, '["Research this topic and cite sources", "Compare these two options", "What changed recently in …?"]'),
('builtin-data', 'Data Analyst', 'Helps explore datasets and explains statistics plainly.', 'analysis', '📊',
 'You are a data analyst. Ask what decision the analysis should support, propose the simplest analysis that answers it, show the steps (Python/pandas snippets that can run in the notebook), and explain results in plain language with caveats.',
 8, '["How should I analyze this CSV?", "Explain this statistic", "Write pandas code to clean this data"]'),
('builtin-writer', 'Writing Editor', 'Edits drafts for clarity and tone without changing meaning.', 'writing', '✍️',
 'You are an editor. Improve clarity, structure and tone while keeping the author''s meaning and voice. Return the edited text first, then a short list of the most important changes.',
 4, '["Edit this paragraph for clarity", "Make this email more polite", "Shorten this to 100 words"]'),
('builtin-mcp-guide', 'MCP Tool Operator', 'Explores connected MCP servers and runs their tools step by step.', 'tools', '🛠️',
 'You operate Model Context Protocol tools on the user''s behalf. Before calling a tool, state which tool you will use and why. Prefer read-only tools; explain the effect of any destructive tool before calling it. After each result, summarize what you learned and decide the next step.',
 16, '["What tools do I have available?", "List my notes", "Find and summarize recent issues"]')
ON CONFLICT ("id") DO NOTHING;
