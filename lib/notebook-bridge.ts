import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

export interface NotebookExecutionResult {
  stdout: string;
  stderr: string;
  images: string[];
  artifacts: { name: string; content: string; mime: string }[];
  error?: string;
}

const WORKSPACE_DIR = path.join(process.cwd(), ".workspace");

// Ensure workspace directory exists
async function ensureWorkspace() {
  try {
    await fs.access(WORKSPACE_DIR);
  } catch {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  }
}

// Sanitize code to prevent arbitrary file system access
function sanitizeCode(code: string): string {
  // Block dangerous imports and operations
  const dangerousPatterns = [
    /import\s+os/gi,
    /from\s+os\s+import/gi,
    /import\s+subprocess/gi,
    /from\s+subprocess\s+import/gi,
    /__import__/gi,
    /eval\(/gi,
    /exec\(/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error("Code contains potentially dangerous operations");
    }
  }

  return code;
}

export async function executeNotebookCode(
  code: string,
  files?: { name: string; content: string }[],
  pythonPath?: string
): Promise<NotebookExecutionResult> {
  await ensureWorkspace();

  try {
    // Sanitize code
    const sanitizedCode = sanitizeCode(code);

    // Write files to workspace if provided
    if (files) {
      for (const file of files) {
        const filePath = path.join(WORKSPACE_DIR, file.name);
        await fs.writeFile(filePath, file.content);
      }
    }

    // Create a temporary Python script
    const scriptPath = path.join(WORKSPACE_DIR, `script_${Date.now()}.py`);
    await fs.writeFile(scriptPath, sanitizedCode);

    // Determine Python command - use provided path or fallback to python3/python
    let pythonCommand = pythonPath || "python3";

    // If no custom path, try python3 first, fallback to python
    if (!pythonPath) {
      try {
        // Test if python3 exists
        await new Promise((resolve, reject) => {
          const test = spawn("python3", ["--version"]);
          test.on("close", (code) => {
            if (code === 0) resolve(true);
            else reject();
          });
          test.on("error", reject);
        });
      } catch {
        // python3 doesn't exist, try python
        pythonCommand = "python";
      }
    }

    // Execute Python script
    const result = await new Promise<NotebookExecutionResult>(
      (resolve, reject) => {
        const python = spawn(pythonCommand, [scriptPath], {
          cwd: WORKSPACE_DIR,
          env: {
            ...process.env,
            PYTHONPATH: WORKSPACE_DIR,
          },
        });

        let stdout = "";
        let stderr = "";

        python.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        python.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        python.on("close", async (code) => {
          // Clean up script
          try {
            await fs.unlink(scriptPath);
          } catch (e) {
            console.error("MCP Workbench Error cleaning up script:", e);
          }

          if (code !== 0) {
            resolve({
              stdout,
              stderr,
              images: [],
              artifacts: [],
              error: `Process exited with code ${code}`,
            });
          } else {
            // Check for generated images and artifacts
            const images: string[] = [];
            const artifacts: { name: string; content: string; mime: string }[] =
              [];

            try {
              const files = await fs.readdir(WORKSPACE_DIR);
              for (const file of files) {
                if (file.match(/\.(png|jpg|jpeg|svg)$/i)) {
                  const filePath = path.join(WORKSPACE_DIR, file);
                  const content = await fs.readFile(filePath, "base64");
                  images.push(
                    `data:image/${path
                      .extname(file)
                      .slice(1)};base64,${content}`
                  );
                } else if (file.match(/\.(json|csv|txt)$/i)) {
                  const filePath = path.join(WORKSPACE_DIR, file);
                  const content = await fs.readFile(filePath, "utf-8");
                  artifacts.push({
                    name: file,
                    content,
                    mime: file.endsWith(".json")
                      ? "application/json"
                      : file.endsWith(".csv")
                      ? "text/csv"
                      : "text/plain",
                  });
                }
              }
            } catch (e) {
              console.error("MCP Workbench Error reading workspace files:", e);
            }

            resolve({
              stdout,
              stderr,
              images,
              artifacts,
            });
          }
        });

        python.on("error", (err) => {
          reject(err);
        });
      }
    );

    return result;
  } catch (error) {
    return {
      stdout: "",
      stderr: "",
      images: [],
      artifacts: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
