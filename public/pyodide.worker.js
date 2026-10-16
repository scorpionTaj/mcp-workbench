// Runs notebook Python in the browser via Pyodide (WebAssembly). Nothing executes on the server.
// One shared interpreter per tab, so variables persist across cells like Jupyter.
// Loaded as a module worker: Pyodide refuses to start in a classic one.
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs";

// Installed the first time a cell imports matplotlib: forces the AGG backend (no DOM in a
// worker) and turns plt.show() into "save every open figure as a PNG data URL".
// Helpers live in their own module so they don't leak into the notebook's namespace.
const MATPLOTLIB_SETUP = `
import base64, io, sys, types
import matplotlib
matplotlib.use("AGG")
import matplotlib.pyplot as plt

_wb = types.ModuleType("_workbench")
_wb.figures = []

def _capture(*args, **kwargs):
    for num in plt.get_fignums():
        buf = io.BytesIO()
        plt.figure(num).savefig(buf, format="png", bbox_inches="tight")
        _wb.figures.append("data:image/png;base64," + base64.b64encode(buf.getvalue()).decode())
    plt.close("all")

_wb.capture = _capture
plt.show = _capture
sys.modules["_workbench"] = _wb
`;

// Figures left open at the end of a cell are shown too, as Jupyter's inline backend does.
const COLLECT_FIGURES = `
import _workbench
_workbench.capture()
_out = list(_workbench.figures)
_workbench.figures.clear()
_out
`;

// A throwaway globals dict, so helper code never touches the user's variables.
function scratch(py) {
  return py.toPy({});
}

const ready = loadPyodide().then((py) => {
  py.runPython('import os; os.environ["MPLBACKEND"] = "AGG"', { globals: scratch(py) });
  return py;
});
let matplotlibReady = false;

function collectFigures(py) {
  if (!matplotlibReady) return [];
  const ns = scratch(py);
  try {
    const list = py.runPython(COLLECT_FIGURES, { globals: ns });
    const images = list.toJs();
    list.destroy();
    return images;
  } catch {
    return [];
  } finally {
    ns.destroy();
  }
}

self.onmessage = async ({ data: { id, code } }) => {
  const py = await ready;
  let stdout = "";
  let stderr = "";
  py.setStdout({ batched: (s) => (stdout += s + "\n") });
  py.setStderr({ batched: (s) => (stderr += s + "\n") });
  try {
    // Keep "Loading numpy, ..." progress out of the cell's output; load errors still show.
    await py.loadPackagesFromImports(code, {
      messageCallback: () => {},
      errorCallback: (s) => (stderr += s + "\n"),
    });
    if (!matplotlibReady && "matplotlib" in py.loadedPackages) {
      const ns = scratch(py);
      py.runPython(MATPLOTLIB_SETUP, { globals: ns });
      ns.destroy();
      matplotlibReady = true;
    }
    const value = await py.runPythonAsync(code);
    if (value !== undefined && value !== null) stdout += String(value) + "\n";
    if (value && typeof value.destroy === "function") value.destroy();
    self.postMessage({ id, stdout, stderr, images: collectFigures(py) });
  } catch (e) {
    self.postMessage({ id, stdout, stderr, images: collectFigures(py), error: String(e?.message ?? e) });
  }
};
