// Runs notebook Python in the browser via Pyodide (WebAssembly). Nothing executes on the server.
// One shared interpreter per tab, so variables persist across cells like Jupyter.
importScripts("https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.js");

const ready = loadPyodide();

self.onmessage = async ({ data: { id, code } }) => {
  const py = await ready;
  let stdout = "";
  let stderr = "";
  py.setStdout({ batched: (s) => (stdout += s + "\n") });
  py.setStderr({ batched: (s) => (stderr += s + "\n") });
  try {
    await py.loadPackagesFromImports(code);
    const value = await py.runPythonAsync(code);
    if (value !== undefined && value !== null) stdout += String(value) + "\n";
    self.postMessage({ id, stdout, stderr });
  } catch (e) {
    self.postMessage({ id, stdout, stderr, error: String(e?.message ?? e) });
  }
};
