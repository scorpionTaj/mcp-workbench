import { z } from "zod";

// Shared by the notebook page, the /api/notebooks routes and the Notebook table.

export const cellOutputSchema = z.object({
  stdout: z.string().default(""),
  stderr: z.string().default(""),
  /** PNG data URLs. */
  images: z.array(z.string()).default([]),
  error: z.string().optional(),
});

export const notebookCellSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["code", "markdown"]),
  name: z.string().max(200).default(""),
  source: z.string(),
  output: cellOutputSchema.nullish(),
});

export type CellOutput = z.infer<typeof cellOutputSchema>;
export type NotebookCellData = z.infer<typeof notebookCellSchema>;

// Figures are stored inline, so cap the whole notebook rather than each field.
export const MAX_NOTEBOOK_BYTES = 10 * 1024 * 1024;

export const notebookInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  cells: z
    .array(notebookCellSchema)
    .max(1000)
    .refine((cells) => JSON.stringify(cells).length <= MAX_NOTEBOOK_BYTES, "Notebook is larger than 10 MB"),
});

export type NotebookInput = z.infer<typeof notebookInputSchema>;

export function newCellId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// .ipynb (nbformat 4)
// ---------------------------------------------------------------------------

type MultilineString = string | string[];

interface IpynbOutput {
  output_type: string;
  name?: string;
  text?: MultilineString;
  data?: Record<string, MultilineString | unknown>;
  metadata?: Record<string, unknown>;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

interface IpynbCell {
  cell_type: string;
  id?: string;
  source: MultilineString;
  metadata?: { workbench?: { name?: string } } & Record<string, unknown>;
  outputs?: IpynbOutput[];
  execution_count?: number | null;
}

interface Ipynb {
  nbformat: number;
  nbformat_minor: number;
  metadata: Record<string, unknown>;
  cells: IpynbCell[];
}

const PNG_PREFIX = "data:image/png;base64,";

/** nbformat stores text as a list of lines, each keeping its trailing newline. */
function toLines(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

function joinText(text: MultilineString | undefined): string {
  return Array.isArray(text) ? text.join("") : (text ?? "");
}

function outputsToIpynb(output: CellOutput | null | undefined): IpynbOutput[] {
  if (!output) return [];
  const outputs: IpynbOutput[] = [];
  if (output.stdout) outputs.push({ output_type: "stream", name: "stdout", text: toLines(output.stdout) });
  if (output.stderr) outputs.push({ output_type: "stream", name: "stderr", text: toLines(output.stderr) });
  for (const image of output.images) {
    if (!image.startsWith(PNG_PREFIX)) continue;
    outputs.push({
      output_type: "display_data",
      data: { "image/png": image.slice(PNG_PREFIX.length), "text/plain": ["<Figure>"] },
      metadata: {},
    });
  }
  if (output.error) {
    const lines = output.error.trimEnd().split("\n");
    const last = lines[lines.length - 1] ?? "";
    const colon = last.indexOf(": ");
    outputs.push({
      output_type: "error",
      ename: colon > 0 ? last.slice(0, colon) : "Error",
      evalue: colon > 0 ? last.slice(colon + 2) : last,
      traceback: lines,
    });
  }
  return outputs;
}

function outputsFromIpynb(outputs: IpynbOutput[] | undefined): CellOutput | null {
  if (!outputs?.length) return null;
  const result: CellOutput = { stdout: "", stderr: "", images: [] };
  for (const out of outputs) {
    if (out.output_type === "stream") {
      if (out.name === "stderr") result.stderr += joinText(out.text);
      else result.stdout += joinText(out.text);
    } else if (out.output_type === "display_data" || out.output_type === "execute_result") {
      const png = out.data?.["image/png"] as MultilineString | undefined;
      const plain = out.data?.["text/plain"] as MultilineString | undefined;
      if (png) result.images.push(PNG_PREFIX + joinText(png).replace(/\s/g, ""));
      else if (plain) result.stdout += joinText(plain).replace(/\n?$/, "\n");
    } else if (out.output_type === "error") {
      result.error = out.traceback?.length
        ? out.traceback.join("\n")
        : `${out.ename ?? "Error"}: ${out.evalue ?? ""}`;
    }
  }
  return result;
}

/** nbformat 4.5 cell ids: 1-64 chars of [a-zA-Z0-9-_]. */
function ipynbCellId(id: string) {
  return id.replace(/[^\w-]/g, "").slice(0, 64) || newCellId();
}

export function notebookToIpynb(title: string, cells: NotebookCellData[]): Ipynb {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: "python3", display_name: "Python 3 (Pyodide)", language: "python" },
      language_info: { name: "python" },
      workbench: { title },
    },
    cells: cells.map((cell) =>
      cell.type === "markdown"
        ? {
            cell_type: "markdown",
            id: ipynbCellId(cell.id),
            metadata: cell.name ? { workbench: { name: cell.name } } : {},
            source: toLines(cell.source),
          }
        : {
            cell_type: "code",
            id: ipynbCellId(cell.id),
            metadata: cell.name ? { workbench: { name: cell.name } } : {},
            source: toLines(cell.source),
            execution_count: null,
            outputs: outputsToIpynb(cell.output),
          },
    ),
  };
}

export class NotebookFormatError extends Error {}

/** Reads an .ipynb file. Raw cells become markdown; unknown output types are dropped. */
export function notebookFromIpynb(json: unknown, fallbackTitle = "Imported Notebook"): NotebookInput {
  const nb = json as Partial<Ipynb> | null;
  if (!nb || typeof nb !== "object" || !Array.isArray(nb.cells)) {
    throw new NotebookFormatError("Not a Jupyter notebook");
  }
  if (nb.nbformat !== 4) throw new NotebookFormatError(`Unsupported nbformat ${nb.nbformat} (only 4 is supported)`);
  const meta = (nb.metadata ?? {}) as { workbench?: { title?: string }; title?: string };
  const title = meta.workbench?.title || meta.title || fallbackTitle;
  let code = 0;
  const cells = nb.cells.map((cell): NotebookCellData => {
    const isCode = cell.cell_type === "code";
    if (isCode) code++;
    return {
      id: typeof cell.id === "string" && cell.id ? cell.id : newCellId(),
      type: isCode ? "code" : "markdown",
      name: cell.metadata?.workbench?.name ?? (isCode ? `Cell ${code}` : ""),
      source: joinText(cell.source),
      output: isCode ? outputsFromIpynb(cell.outputs) : null,
    };
  });
  return { title, cells };
}

/** Accepts .ipynb and the {name, cells: [{name, code}]} JSON this page used to export. */
export function parseNotebookFile(text: string, filename: string): NotebookInput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new NotebookFormatError("The file is not valid JSON");
  }
  const fallbackTitle = filename.replace(/\.(ipynb|json)$/i, "") || "Imported Notebook";
  const legacy = json as { name?: unknown; cells?: unknown; nbformat?: unknown };
  if (legacy && legacy.nbformat === undefined && Array.isArray(legacy.cells)) {
    return fromLegacy(legacy, fallbackTitle);
  }
  return notebookFromIpynb(json, fallbackTitle);
}

/** The old localStorage / JSON export shape: {name, cells: [{name, code}]}. */
export function fromLegacy(json: { name?: unknown; cells?: unknown }, fallbackTitle = "Untitled Notebook"): NotebookInput {
  const cells = Array.isArray(json.cells) ? (json.cells as { name?: unknown; code?: unknown }[]) : [];
  return {
    title: typeof json.name === "string" && json.name.trim() ? json.name.trim() : fallbackTitle,
    cells: cells.map((c, i) => ({
      id: newCellId(),
      type: "code",
      name: typeof c.name === "string" ? c.name : `Cell ${i + 1}`,
      source: typeof c.code === "string" ? c.code : "",
      output: null,
    })),
  };
}
