export interface PythonResult {
  stdout: string;
  stderr: string;
  /** matplotlib figures as PNG data URLs, from plt.show() and figures left open at the end. */
  images: string[];
  error?: string;
}

const TIMEOUT_MS = 120_000; // first run also downloads Pyodide (~10MB)

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: PythonResult) => void; timer: ReturnType<typeof setTimeout> }
>();

function settle(id: number, result: PythonResult) {
  const run = pending.get(id);
  if (!run) return;
  clearTimeout(run.timer);
  pending.delete(id);
  run.resolve(result);
}

function getWorker() {
  if (!worker) {
    worker = new Worker("/pyodide.worker.js", { type: "module" });
    worker.onmessage = ({ data }) => settle(data.id, { images: [], ...data });
    // A worker that can't load (blocked by CSP, CDN unreachable) only reports here; without
    // this, every run would wait out the full timeout.
    worker.onerror = (event) => {
      event.preventDefault();
      reset(`Python failed to start: ${event.message || "the Pyodide runtime couldn't be loaded"}`);
    };
  }
  return worker;
}

// A runaway cell can't be interrupted inside the worker, so on timeout we
// kill the interpreter (losing notebook state) and fail every pending run.
function reset(error: string) {
  worker?.terminate();
  worker = null;
  for (const id of [...pending.keys()]) settle(id, { stdout: "", stderr: "", images: [], error });
}

export function runPython(code: string): Promise<PythonResult> {
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => reset(`Timed out after ${TIMEOUT_MS / 1000}s; Python state was reset`),
      TIMEOUT_MS,
    );
    pending.set(id, { resolve, timer });
    getWorker().postMessage({ id, code });
  });
}
