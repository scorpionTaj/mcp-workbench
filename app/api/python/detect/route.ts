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
      const { stdout: path3 } = await execAsync(
        process.platform === "win32" ? "where python3" : "which python3"
      );
      const pythonPath = path3.trim().split("\n")[0];

      // Verify the path exists before trying to get version
      if (pythonPath && fs.existsSync(pythonPath)) {
        try {
          const { stdout: version3 } = await execAsync(
            `"${pythonPath}" --version`
          );
          envs.push({
            path: pythonPath,
            version: version3.replace("Python ", "").trim(),
            type: "system",
            name: "Python 3 (System)",
          });
          console.log(
            `[Python Detection] Found python3: ${pythonPath} (${version3.trim()})`
          );
        } catch (verError) {
          console.error(
            `[Python Detection] Failed to get version for ${pythonPath}:`,
            verError
          );
        }
      }
    } catch (error) {
      // python3 not found, which is ok
    }

    // Try python
    try {
      const { stdout: pythonPath } = await execAsync(
        process.platform === "win32" ? "where python" : "which python"
      );
      const detectedPath = pythonPath.trim().split("\n")[0];

      // Verify the path exists before trying to get version
      if (detectedPath && fs.existsSync(detectedPath)) {
        try {
          const { stdout: version } = await execAsync(
            `"${detectedPath}" --version`
          );
          // Check if this is a duplicate path (e.g., python and python3 pointing to same location)
          const isDuplicate = envs.some((env) => env.path === detectedPath);
          if (!isDuplicate) {
            envs.push({
              path: detectedPath,
              version: version.replace("Python ", "").trim(),
              type: "system",
              name: "Python (System)",
            });
            console.log(
              `[Python Detection] Found python: ${detectedPath} (${version.trim()})`
            );
          }
        } catch (verError) {
          console.error(
            `[Python Detection] Failed to get version for ${detectedPath}:`,
            verError
          );
        }
      }
    } catch (error) {
      // python not found, which is ok
    }
  } catch (error) {
    console.error("[Python Detection] Error detecting system Python:", error);
  }

  return envs;
}

async function detectCondaEnvs(): Promise<PythonEnv[]> {
  const envs: PythonEnv[] = [];

  try {
    console.log("[Python Detection] Checking for conda environments...");

    // Try both conda and mamba (miniforge3 uses mamba)
    let condaCommand = "conda";
    try {
      await execAsync("conda --version");
    } catch {
      try {
        await execAsync("mamba --version");
        condaCommand = "mamba";
        console.log(
          "[Python Detection] Using mamba (miniforge3) instead of conda"
        );
      } catch {
        console.log("[Python Detection] Neither conda nor mamba available");
        return envs;
      }
    }

    const { stdout } = await execAsync(`${condaCommand} env list`);
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
              name:
                name === "base"
                  ? `${
                      condaCommand === "mamba" ? "Miniforge3" : "Conda"
                    }: ${name}`
                  : `Conda: ${name}`,
            });
            console.log(
              `[Python Detection] Found ${condaCommand} env: ${name} at ${pythonPath} (${version.trim()})`
            );
          } catch (verError) {
            console.error(
              `[Python Detection] Failed to get version for ${condaCommand} env ${name}:`,
              verError
            );
          }
        }
      }
    }
  } catch (error) {
    // Conda/mamba not installed or not in PATH - this is fine
    console.log("[Python Detection] Conda/mamba not available");
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
          console.log(
            `[Python Detection] Found venv: ${path.basename(
              searchPath
            )} at ${pythonPath} (${version.trim()})`
          );
        } catch (verError) {
          console.error(
            `[Python Detection] Failed to get version for venv at ${searchPath}:`,
            verError
          );
        }
      }
    }
  }

  return envs;
}

// Detect Python from common Windows installation locations
async function detectWindowsPython(): Promise<PythonEnv[]> {
  const envs: PythonEnv[] = [];
  console.log("[Python Detection] Checking common Windows Python locations...");

  const userProfile = process.env.USERPROFILE || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 =
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localAppData =
    process.env.LOCALAPPDATA || path.join(userProfile, "AppData", "Local");
  const appData =
    process.env.APPDATA || path.join(userProfile, "AppData", "Roaming");

  const searchPaths = [
    // uv Python installations
    path.join(appData, "uv", "python"),
    // Windows Store Python
    path.join(localAppData, "Microsoft", "WindowsApps"),
    path.join(localAppData, "Programs", "Python"),
    // Standard Python installations
    path.join(programFiles, "Python39"),
    path.join(programFiles, "Python310"),
    path.join(programFiles, "Python311"),
    path.join(programFiles, "Python312"),
    path.join(programFiles, "Python313"),
    path.join(programFiles, "Python314"),
    path.join(programFilesX86, "Python39"),
    path.join(programFilesX86, "Python310"),
    path.join(programFilesX86, "Python311"),
    path.join(programFilesX86, "Python312"),
    path.join(programFilesX86, "Python313"),
    path.join(programFilesX86, "Python314"),
    // User-specific installations
    path.join(localAppData, "Programs", "Python", "Python39"),
    path.join(localAppData, "Programs", "Python", "Python310"),
    path.join(localAppData, "Programs", "Python", "Python311"),
    path.join(localAppData, "Programs", "Python", "Python312"),
    path.join(localAppData, "Programs", "Python", "Python313"),
    path.join(localAppData, "Programs", "Python", "Python314"),
  ];

  for (const searchPath of searchPaths) {
    if (!fs.existsSync(searchPath)) {
      continue;
    }

    try {
      // For uv python directory, scan for Python installations
      if (
        searchPath.includes("uv\\python") ||
        searchPath.includes("uv/python")
      ) {
        const uvDirs = fs.readdirSync(searchPath, { withFileTypes: true });
        for (const dir of uvDirs) {
          if (dir.isDirectory()) {
            const pythonPath = path.join(searchPath, dir.name, "python.exe");
            if (fs.existsSync(pythonPath)) {
              try {
                const { stdout: version } = await execAsync(
                  `"${pythonPath}" --version`
                );
                const versionStr = version.replace("Python ", "").trim();

                // Check if already exists
                if (!envs.some((env) => env.path === pythonPath)) {
                  envs.push({
                    path: pythonPath,
                    version: versionStr,
                    type: "system",
                    name: `uv Python ${versionStr}`,
                  });
                  console.log(
                    `[Python Detection] Found uv Python: ${pythonPath} (${versionStr})`
                  );
                }
              } catch (verError) {
                console.error(
                  `[Python Detection] Failed to get version for uv Python at ${pythonPath}:`,
                  verError
                );
              }
            }
          }
        }
      } else {
        // For standard Python installations
        const pythonPath = path.join(searchPath, "python.exe");
        if (fs.existsSync(pythonPath)) {
          try {
            const { stdout: version } = await execAsync(
              `"${pythonPath}" --version`
            );
            const versionStr = version.replace("Python ", "").trim();

            // Check if already exists
            if (!envs.some((env) => env.path === pythonPath)) {
              const locationType = searchPath.includes("WindowsApps")
                ? "Windows Store"
                : "System";
              envs.push({
                path: pythonPath,
                version: versionStr,
                type: "system",
                name: `${locationType} Python ${versionStr}`,
              });
              console.log(
                `[Python Detection] Found ${locationType} Python: ${pythonPath} (${versionStr})`
              );
            }
          } catch (verError) {
            console.error(
              `[Python Detection] Failed to get version for ${pythonPath}:`,
              verError
            );
          }
        }
      }
    } catch (error) {
      // Skip paths we can't access
      continue;
    }
  }

  if (envs.length === 0) {
    console.log(
      "[Python Detection] No Python found in common Windows locations"
    );
  }

  return envs;
}

export async function GET() {
  try {
    console.log("[Python Detection] Detecting Python environments...");

    const [systemEnvs, condaEnvs, venvEnvs, windowsEnvs] = await Promise.all([
      detectSystemPython(),
      detectCondaEnvs(),
      detectVenvs(),
      detectWindowsPython(),
    ]);

    const allEnvs = [...systemEnvs, ...condaEnvs, ...venvEnvs, ...windowsEnvs];

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
    console.log(`[Python Validation] Validating custom path: ${pythonPath}`);

    if (!pythonPath) {
      console.error("[Python Validation] No path provided");
      return NextResponse.json(
        { error: "Python path is required" },
        { status: 400 }
      );
    }

    // Validate the Python path
    if (!fs.existsSync(pythonPath)) {
      console.error(`[Python Validation] Path does not exist: ${pythonPath}`);
      return NextResponse.json(
        { error: "Python executable not found at specified path" },
        { status: 404 }
      );
    }

    // Try to get version
    try {
      console.log(`[Python Validation] Getting version for: ${pythonPath}`);
      const { stdout: version } = await execAsync(`"${pythonPath}" --version`);
      const versionStr = version.replace("Python ", "").trim();

      console.log(
        `[Python Validation] ✓ Valid Python: ${pythonPath} (${versionStr})`
      );
      return NextResponse.json({
        valid: true,
        path: pythonPath,
        version: versionStr,
        type: "custom",
        name: "Custom Python",
      });
    } catch (error) {
      console.error(
        `[Python Validation] Failed to get version for ${pythonPath}:`,
        error
      );
      return NextResponse.json(
        { error: "Invalid Python executable" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Python Validation] Validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate Python path" },
      { status: 500 }
    );
  }
}
