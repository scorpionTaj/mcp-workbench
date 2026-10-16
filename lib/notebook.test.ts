import { describe, expect, it } from "vitest";
import {
  NotebookFormatError,
  notebookFromIpynb,
  notebookInputSchema,
  notebookToIpynb,
  parseNotebookFile,
  type NotebookCellData,
} from "@/lib/notebook";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

const cells: NotebookCellData[] = [
  { id: "md1", type: "markdown", name: "Intro", source: "# Title\n\nSome *text*", output: null },
  {
    id: "c1",
    type: "code",
    name: "Plot",
    source: "import matplotlib.pyplot as plt\nplt.plot([1, 2])\nplt.show()",
    output: { stdout: "hello\nworld\n", stderr: "careful\n", images: [PNG] },
  },
  {
    id: "c2",
    type: "code",
    name: "Boom",
    source: "1/0",
    output: { stdout: "", stderr: "", images: [], error: "Traceback (most recent call last):\nZeroDivisionError: division by zero" },
  },
  { id: "c3", type: "code", name: "Not run", source: "x = 1\n", output: null },
];

describe("notebook → .ipynb", () => {
  const nb = notebookToIpynb("My notebook", cells);

  it("writes nbformat 4 with a Python kernelspec", () => {
    expect(nb.nbformat).toBe(4);
    expect(nb.nbformat_minor).toBe(5);
    expect(nb.metadata).toMatchObject({ kernelspec: { language: "python" }, workbench: { title: "My notebook" } });
  });

  it("splits sources into lines that keep their newlines", () => {
    expect(nb.cells[0]).toMatchObject({ cell_type: "markdown", id: "md1", source: ["# Title\n", "\n", "Some *text*"] });
    expect(nb.cells[0]).not.toHaveProperty("outputs");
    expect(nb.cells[3].source).toEqual(["x = 1\n"]);
  });

  it("writes stdout/stderr as streams and figures as image/png without the data URL prefix", () => {
    expect(nb.cells[1]).toMatchObject({ cell_type: "code", execution_count: null });
    expect(nb.cells[1].outputs).toEqual([
      { output_type: "stream", name: "stdout", text: ["hello\n", "world\n"] },
      { output_type: "stream", name: "stderr", text: ["careful\n"] },
      { output_type: "display_data", data: { "image/png": "iVBORw0KGgo=", "text/plain": ["<Figure>"] }, metadata: {} },
    ]);
  });

  it("writes errors as error outputs", () => {
    expect(nb.cells[2].outputs).toEqual([
      {
        output_type: "error",
        ename: "ZeroDivisionError",
        evalue: "division by zero",
        traceback: ["Traceback (most recent call last):", "ZeroDivisionError: division by zero"],
      },
    ]);
    expect(nb.cells[3].outputs).toEqual([]);
  });

  it("makes cell ids valid for nbformat 4.5", () => {
    const [cell] = notebookToIpynb("t", [{ ...cells[3], id: "a b/c.d" }]).cells;
    expect(cell.id).toBe("abcd");
  });
});

describe(".ipynb → notebook", () => {
  it("round-trips through export and import", () => {
    const back = notebookFromIpynb(JSON.parse(JSON.stringify(notebookToIpynb("Round trip", cells))));
    expect(back.title).toBe("Round trip");
    expect(back.cells).toEqual(cells);
    expect(notebookInputSchema.safeParse(back).success).toBe(true);
  });

  it("reads notebooks written by Jupyter", () => {
    const nb = notebookFromIpynb(
      {
        nbformat: 4,
        nbformat_minor: 2,
        metadata: {},
        cells: [
          { cell_type: "markdown", metadata: {}, source: "Plain *string* source" },
          {
            cell_type: "code",
            execution_count: 3,
            metadata: {},
            source: ["df = load()\n", "df"],
            outputs: [
              { output_type: "stream", name: "stdout", text: "loading\n" },
              { output_type: "execute_result", execution_count: 3, data: { "text/plain": ["   a\n", "0  1"] }, metadata: {} },
              { output_type: "display_data", data: { "image/png": "iVBO\nRw0K\n", "text/plain": "<Figure>" }, metadata: {} },
              { output_type: "error", ename: "KeyError", evalue: "'x'", traceback: [] },
            ],
          },
          { cell_type: "raw", metadata: {}, source: "raw text" },
        ],
      },
      "analysis",
    );
    expect(nb.title).toBe("analysis");
    expect(nb.cells.map((c) => c.type)).toEqual(["markdown", "code", "markdown"]);
    expect(nb.cells[0].source).toBe("Plain *string* source");
    expect(nb.cells[1]).toMatchObject({
      name: "Cell 1",
      source: "df = load()\ndf",
      output: { stdout: "loading\n   a\n0  1\n", stderr: "", images: ["data:image/png;base64,iVBORw0K"], error: "KeyError: 'x'" },
    });
    expect(nb.cells[1].id).toBeTruthy();
    expect(nb.cells[2].output).toBeNull();
  });

  it("rejects files that aren't nbformat 4", () => {
    expect(() => notebookFromIpynb({ nbformat: 3, worksheets: [] })).toThrow(NotebookFormatError);
    expect(() => notebookFromIpynb({ nbformat: 3, cells: [] })).toThrow(/nbformat 3/);
    expect(() => parseNotebookFile("{not json", "x.ipynb")).toThrow(/valid JSON/);
  });

  it("still reads the old JSON export", () => {
    const nb = parseNotebookFile(JSON.stringify({ name: "Old", cells: [{ name: "A", code: "print(1)" }] }), "old.json");
    expect(nb.title).toBe("Old");
    expect(nb.cells).toEqual([{ id: expect.any(String), type: "code", name: "A", source: "print(1)", output: null }]);
  });
});
