"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillForm } from "@/components/skills/skill-form";
import { CommandForm } from "@/components/skills/command-form";
import { useCommands, useSkills, type CommandInfo, type SkillDetail } from "@/hooks/use-skills";

function ImportSkills() {
  const { importSkills } = useSkills();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage(null);
        try {
          const { imported, errors } = await importSkills(url.trim());
          setMessage({
            ok: imported.length > 0,
            text: [imported.length && `Imported ${imported.join(", ")}`, ...errors].filter(Boolean).join(". "),
          });
          if (imported.length) setUrl("");
        } catch (err) {
          setMessage({ ok: false, text: err instanceof Error ? err.message : "Import failed" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/anthropics/skills/tree/main/skills/pdf"
        aria-label="GitHub URL of a skill or folder of skills"
        className="min-w-0 flex-1 sm:min-w-80"
        required
      />
      <Button type="submit" variant="outline" disabled={busy}>
        <Download className="w-4 h-4 mr-2" /> {busy ? "Importing…" : "Import from GitHub"}
      </Button>
      {message && (
        <p role="status" className={`w-full text-sm ${message.ok ? "text-muted-foreground" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

function SkillsTab() {
  const { skills, isLoading, getSkill, createSkill, updateSkill, deleteSkill } = useSkills();
  const [editing, setEditing] = useState<SkillDetail | "new" | null>(null);
  const [filter, setFilter] = useState("");
  const q = filter.toLowerCase();
  const shown = skills.filter((s) => [s.name, s.description].some((t) => t.toLowerCase().includes(q)));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Skills are folders of instructions (a SKILL.md) the model loads only when a task needs them, so you can keep many
        without filling the context. Agents use all enabled skills unless you pick some.
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <ImportSkills />
        <Input placeholder="Filter skills" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-48" aria-label="Filter skills" />
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-2" /> New skill
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing === "new" ? "New skill" : `Edit ${editing.name}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillForm
              initial={editing === "new" ? undefined : editing}
              submitLabel={editing === "new" ? "Create skill" : "Save"}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                if (editing === "new") await createSkill(input);
                else await updateSkill(editing.id, input);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">Loading skills…</p>}
      {!isLoading && skills.length === 0 && (
        <p className="text-muted-foreground">
          No skills yet. Write one, import one from GitHub, or install a <Link href="/plugins" className="underline">plugin</Link> that
          ships skills.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((skill) => (
          <Card key={skill.id} className={`flex flex-col ${skill.enabled ? "" : "opacity-60"}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-mono break-all">{skill.name}</CardTitle>
                <Switch
                  checked={skill.enabled}
                  onCheckedChange={(enabled) => updateSkill(skill.id, { enabled })}
                  aria-label={`${skill.enabled ? "Disable" : "Enable"} ${skill.name}`}
                />
              </div>
              <CardDescription className="line-clamp-3">{skill.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto space-y-3">
              <div className="flex flex-wrap gap-1">
                {skill.pluginId && <Badge variant="secondary">plugin</Badge>}
                <Badge variant="outline">{Math.ceil(skill.instructionsLength / 1000)}k chars</Badge>
                {skill.files.length > 0 && (
                  <Badge variant="outline" title={skill.files.join("\n")}>
                    <FileText className="w-3 h-3 mr-1" /> {skill.files.length} file(s)
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={async () => setEditing(await getSkill(skill.id))} aria-label={`Edit ${skill.name}`}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                {skill.sourceUrl && (
                  <Button size="sm" variant="ghost" asChild>
                    <a href={skill.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source of ${skill.name}`}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                )}
                {!skill.pluginId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${skill.name}`}
                    onClick={() => confirm(`Delete ${skill.name}?`) && deleteSkill(skill.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CommandsTab() {
  const { commands, isLoading, createCommand, updateCommand, deleteCommand } = useCommands();
  const [editing, setEditing] = useState<CommandInfo | "new" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Type <code>/</code> in chat to pick a command; it sends the saved prompt with your text filled in.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4 mr-2" /> New command
        </Button>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>{editing === "new" ? "New command" : `Edit /${editing.name}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <CommandForm
              initial={editing === "new" ? undefined : editing}
              submitLabel={editing === "new" ? "Create command" : "Save"}
              onCancel={() => setEditing(null)}
              onSubmit={async (input) => {
                if (editing === "new") await createCommand(input);
                else await updateCommand(editing.id, input);
                setEditing(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-muted-foreground">Loading commands…</p>}
      {!isLoading && commands.length === 0 && <p className="text-muted-foreground">No commands yet.</p>}

      <div className="divide-y rounded-md border">
        {commands.map((cmd) => (
          <div key={cmd.id} className={`flex flex-wrap items-center gap-3 p-3 ${cmd.enabled ? "" : "opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm">
                /{cmd.name} {cmd.argumentHint && <span className="text-muted-foreground">{cmd.argumentHint}</span>}
              </p>
              {cmd.description && <p className="text-sm text-muted-foreground">{cmd.description}</p>}
            </div>
            {cmd.pluginId && <Badge variant="secondary">plugin</Badge>}
            <Switch
              checked={cmd.enabled}
              onCheckedChange={(enabled) => updateCommand(cmd.id, { enabled })}
              aria-label={`${cmd.enabled ? "Disable" : "Enable"} /${cmd.name}`}
            />
            <Button size="sm" variant="outline" onClick={() => setEditing(cmd)} aria-label={`Edit /${cmd.name}`}>
              <Pencil className="w-3 h-3" />
            </Button>
            {!cmd.pluginId && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete /${cmd.name}`}
                onClick={() => confirm(`Delete /${cmd.name}?`) && deleteCommand(cmd.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Skills &amp; commands</h1>
        <p className="text-muted-foreground">Teach the model procedures it loads on demand, and save prompts you reuse.</p>
      </div>
      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="commands">Slash commands</TabsTrigger>
        </TabsList>
        <TabsContent value="skills" className="mt-4">
          <SkillsTab />
        </TabsContent>
        <TabsContent value="commands" className="mt-4">
          <CommandsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
