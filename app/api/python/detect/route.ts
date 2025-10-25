import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

interface PythonEnv {
  path: string;
  version: string;
  type: "system" | "venv" | "conda" | "pyenv" | "custom";
  name?: string;
}

async function detectSystemPython(): Promise<PythonEnv[]> {
  const envs: PythonEnv[] = [];

  try {
    // Try python3 first (preferred on Unix systems)
    try {
      const { stdout: version3 } = await execAsync("python3 --version");
      const { stdout: path3 } = await execAsync(
        process.platform === "win32" ? "where python3" : "which python3"
      );
      envs.push({
        path: path3.trim().split("\n")[0],
        version: version3.replace("Python ", "").trim(),
        type: "system",
        name: "Python 3 (System)",
      });
    } catch {}

    // Try python
    try {
      const { stdout: version } = await execAsync("python --version");
      const { stdout: pythonPath } = await execAsync(
        process.platform === "win32" ? "where python" : "which python"
      );
      envs.push({
        path: pythonPath.trim().split("\n")[0],
        version: version.replace("Python ", "").trim(),
        type: "system",
        name: "Python (System)",
      });
    } catch {}
  } catch (error) {
    console.error("[Python Detection] Error detecting system Python:", error);
  }

  return envs;
}

async function detectCondaEnvs(): Promise<PythonEnv[]> {
  const envs: PythonEnv[] = [];

  try {
    const { stdout } = await execAsync("conda env list");
    const lines = stdout.split("\n");

    for (const line of lines) {
      if (line.startsWith("#") || line.trim() === "") continue;

      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0];
        const envPath = parts[parts.length - 1];

        const pythonPath =
          process.platform === "win32"
            ? path.join(envPath, "python.exe")
            : path.join(envPath, "bin", "python");

        if (fs.existsSync(pythonPath)) {
          try {
            const { stdout: version } = await execAsync(
              `"${pythonPath}" --version`
            );
            envs.push({
              path: pythonPath,
              version: version.replace("Python ", "").trim(),
              type: "conda",
              name: `Conda: ${name}`,
            });
          } catch {}
        }
      }
    }
  } catch (error) {
    // Conda not installed or not in PATH
  }

  return envs;
}

async function detectVenvs(): Promise<PythonEnv[]> {
  const envs: PythonEnv[] = [];
  const searchPaths = [
    path.join(os.homedir(), ".venv"),
    path.join(os.homedir(), "venv"),
    path.join(os.homedir(), ".virtualenvs"),
    path.join(process.cwd(), "venv"),
    path.join(process.cwd(), ".venv"),
  ];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const pythonPath =
        process.platform === "win32"
          ? path.join(searchPath, "Scripts", "python.exe")
          : path.join(searchPath, "bin", "python");

      if (fs.existsSync(pythonPath)) {
        try {
          const { stdout: version } = await execAsync(
            `"${pythonPath}" --version`
          );
          envs.push({
            path: pythonPath,
            version: version.replace("Python ", "").trim(),
            type: "venv",
            name: `venv: ${path.basename(searchPath)}`,
          });
        } catch {}
      }
    }
  }

  return envs;
}

export async function GET() {
  try {
    console.log("[Python Detection] Detecting Python environments...");

    const [systemEnvs, condaEnvs, venvEnvs] = await Promise.all([
      detectSystemPython(),
      detectCondaEnvs(),
      detectVenvs(),
    ]);

    const allEnvs = [...systemEnvs, ...condaEnvs, ...venvEnvs];

    // Remove duplicates based on path
    const uniqueEnvs = allEnvs.filter(
      (env, index, self) => index === self.findIndex((e) => e.path === env.path)
    );

    console.log(`[Python Detection] Found ${uniqueEnvs.length} environments`);

    return NextResponse.json({
      environments: uniqueEnvs,
      count: uniqueEnvs.length,
    });
  } catch (error) {
    console.error("[Python Detection] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to detect Python environments",
        environments: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { path: pythonPath } = await request.json();

    if (!pythonPath) {
      return NextResponse.json(
        { error: "Python path is required" },
        { status: 400 }
      );
    }

    // Validate the Python path
    if (!fs.existsSync(pythonPath)) {
      return NextResponse.json(
        { error: "Python executable not found at specified path" },
        { status: 404 }
      );
    }

    // Try to get version
    try {
      const { stdout: version } = await execAsync(`"${pythonPath}" --version`);

      return NextResponse.json({
        valid: true,
        path: pythonPath,
        version: version.replace("Python ", "").trim(),
        type: "custom",
        name: "Custom Python",
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid Python executable" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Python Detection] Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate Python path" },
      { status: 500 }
    );
  }
}
