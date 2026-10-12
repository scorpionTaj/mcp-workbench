import { describe, expect, it } from "vitest";
import { expandCommand, parseFrontmatter, parsePlugin, parseSkill, resolveHeaders } from "@/lib/bundles";
import { parseGithubUrl, resolveMarketplaceSource } from "@/lib/github-source";

describe("frontmatter", () => {
  it("reads key/values, quotes, and block scalars", () => {
    const { data, body } = parseFrontmatter(
      '---\nname: pdf\ndescription: "Work with PDFs"\nnotes: |\n  line one\n  line two\nargument-hint: [file]\n---\n\n# Body\ntext',
    );
    expect(data).toEqual({ name: "pdf", description: "Work with PDFs", notes: "line one line two", "argument-hint": "[file]" });
    expect(body).toBe("# Body\ntext");
    expect(parseFrontmatter("no frontmatter").body).toBe("no frontmatter");
  });
});

describe("skills", () => {
  it("parses SKILL.md and keeps other files as resources", () => {
    const s = parseSkill(
      { "SKILL.md": "---\nname: Brand Guidelines\ndescription: Apply brand colors\n---\nUse #123456.", "ref/colors.md": "blue" },
      "brand",
    );
    expect(s).toEqual({ name: "brand-guidelines", description: "Apply brand colors", instructions: "Use #123456.", resources: { "ref/colors.md": "blue" } });
  });

  it("requires a description", () => {
    expect(() => parseSkill({ "SKILL.md": "---\nname: x\n---\nbody" }, "x")).toThrow(/description/);
  });
});

describe("plugins", () => {
  const files = {
    ".claude-plugin/plugin.json": JSON.stringify({ name: "Dev Kit", version: "1.2.0", description: "Tools", author: { name: "Acme" } }),
    "agents/reviewer.md": "---\nname: reviewer\ndescription: Reviews code\nmodel: sonnet\n---\nYou review code.",
    "agents/nested/ignored.md": "---\nname: x\n---\nnot top-level",
    "commands/new-app.md": "---\ndescription: Scaffold an app\nargument-hint: [name]\n---\nCreate an app called $ARGUMENTS.",
    "skills/pdf/SKILL.md": "---\nname: pdf\ndescription: PDFs\n---\nUse pdf tools.",
    "skills/broken/SKILL.md": "---\nname: broken\n---\nno description",
    ".mcp.json": JSON.stringify({
      mcpServers: {
        docs: { type: "http", url: "https://docs.example.com/mcp" },
        gh: { type: "http", url: "https://api.example.com/mcp", headers: { Authorization: "Bearer ${GH_TOKEN}" } },
        local: { command: "npx", args: ["x"] },
        templated: { type: "http", url: "https://${HOST}/mcp" },
      },
    }),
  };

  it("collects skills, agents, commands and remote MCP servers", () => {
    const b = parsePlugin(files);
    expect(b.manifest).toEqual({ name: "dev-kit", version: "1.2.0", description: "Tools", author: "Acme" });
    expect(b.skills.map((s) => s.name)).toEqual(["pdf"]);
    expect(b.agents).toEqual([{ name: "reviewer", description: "Reviews code", systemPrompt: "You review code." }]);
    expect(b.commands).toEqual([{ name: "new-app", description: "Scaffold an app", argumentHint: "[name]", prompt: "Create an app called $ARGUMENTS." }]);
    expect(b.mcpServers.map((m) => [m.name, m.missingSecrets])).toEqual([["docs", []], ["gh", ["GH_TOKEN"]]]);
    expect(b.warnings.join("\n")).toMatch(/broken: SKILL\.md needs a description/);
    expect(b.warnings.join("\n")).toMatch(/"local" runs locally/);
    expect(b.warnings.join("\n")).toMatch(/"templated" needs HOST/);
  });

  it("accepts a bare .mcp.json map and inline marketplace plugins with skill lists", () => {
    const b = parsePlugin(
      {
        ".mcp.json": JSON.stringify({ ctx: { type: "http", url: "https://ctx.example/mcp" } }),
        "skills/docx/SKILL.md": "---\ndescription: Word\n---\nx",
        "skills/xlsx/SKILL.md": "---\ndescription: Excel\n---\ny",
        "skills/other/SKILL.md": "---\ndescription: Other\n---\nz",
      },
      { name: "document-skills", skills: ["./skills/docx", "./skills/xlsx"] },
    );
    expect(b.manifest.name).toBe("document-skills");
    expect(b.skills.map((s) => s.name)).toEqual(["docx", "xlsx"]);
    expect(b.mcpServers[0].name).toBe("ctx");
  });

  it("fills header placeholders and expands commands", () => {
    expect(resolveHeaders({ A: "Bearer ${T}" }, { T: "x" })).toEqual({ A: "Bearer x" });
    expect(resolveHeaders({ A: "Bearer ${T}" }, {})).toBeNull();
    expect(expandCommand("Review $1 then $2: $ARGUMENTS", "a.ts b.ts")).toBe("Review a.ts then b.ts: a.ts b.ts");
  });
});

describe("github sources", () => {
  it("parses repo, tree and blob URLs", () => {
    expect(parseGithubUrl("anthropics/skills")).toEqual({ owner: "anthropics", repo: "skills", ref: undefined, path: "" });
    expect(parseGithubUrl("https://github.com/anthropics/skills/tree/main/skills/pdf")).toEqual({ owner: "anthropics", repo: "skills", ref: "main", path: "skills/pdf" });
    expect(parseGithubUrl("https://github.com/a/b/blob/v1/x/SKILL.md").path).toBe("x");
    expect(parseGithubUrl("https://github.com/a/b.git").repo).toBe("b");
    for (const bad of ["https://evil.com/a/b", "https://github.com/a/b/tree/main/../../x", "a b/c"]) {
      expect(() => parseGithubUrl(bad), bad).toThrow();
    }
  });

  it("resolves marketplace sources relative to the marketplace repo", () => {
    const base = { owner: "o", repo: "m", ref: "main", path: "" };
    expect(resolveMarketplaceSource("./plugins/x", base)).toEqual({ ...base, path: "plugins/x" });
    expect(resolveMarketplaceSource("./", base)).toEqual({ ...base, path: "" });
    expect(resolveMarketplaceSource({ source: "git-subdir", url: "https://github.com/a/b.git", path: "p", ref: "v1" }, base)).toEqual({ owner: "a", repo: "b", ref: "v1", path: "p" });
    expect(resolveMarketplaceSource({ source: "github", repo: "a/b" }, base)).toMatchObject({ owner: "a", repo: "b" });
    expect(resolveMarketplaceSource({ source: "npm", package: "x" }, base)).toBeNull();
    expect(resolveMarketplaceSource("../escape", base)).toBeNull();
  });
});
